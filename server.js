// server.js – ELAD CRM API מחובר ל-Postgres ומוכן לדפדפן

const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3001;

// חיבור לבסיס הנתונים דרך DATABASE_URL מ-Render
let pool = null;
if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  console.log("Postgres pool created");
} else {
  console.warn("WARNING: DATABASE_URL is not set – API ירוץ בלי חיבור לדאטה");
}

// לאפשר לאתר שלך ב-Netlify לדבר עם השרת
app.use(
  cors({
    origin: ["https://elad-crm.netlify.app"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
  })
);

app.use(express.json());

// בדיקת חיים
app.get("/api/health", async (req, res) => {
  try {
    if (!pool) {
      return res.json({ status: "ok", db: "not_configured" });
    }
    const result = await pool.query("SELECT NOW() AS now");
    res.json({ status: "ok", db: "connected", time: result.rows[0].now });
  } catch (err) {
    console.error("DB health error:", err);
    res.status(500).json({ status: "error", db: "failed" });
  }
});

// יצירת לקוח חדש
app.post("/api/clients", async (req, res) => {
  if (!pool) {
    return res.status(500).json({ error: "db_not_configured" });
  }

  const { fullName, phone, email } = req.body;

  if (!fullName || typeof fullName !== "string" || fullName.trim().length < 2) {
    return res.status(400).json({ error: "fullName_required" });
  }

  try {
    // לוודא שיש טבלה
    await pool.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        full_name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    const result = await pool.query(
      `INSERT INTO clients (full_name, phone, email)
       VALUES ($1, $2, $3)
       RETURNING id, full_name, phone, email, created_at`,
      [fullName.trim(), phone || null, email || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("create client error:", err);
    res.status(500).json({ error: "db_error" });
  }
});

// לקרוא את כל הלקוחות
app.get("/api/clients", async (req, res) => {
  if (!pool) {
    return res.status(500).json({ error: "db_not_configured" });
  }

  try {
    const result = await pool.query(
      `SELECT id, full_name, phone, email, created_at
       FROM clients
       ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("get clients error:", err);
    res.status(500).json({ error: "db_error" });
  }
});

app.listen(PORT, () => {
  console.log(`ELAD CRM API is running on port ${PORT}`);
});
