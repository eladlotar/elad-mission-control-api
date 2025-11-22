// server.js – ELAD CRM API (גרסת התחלה מחוברת ל-Postgres)

const express = require("express");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3001;

// חיבור לבסיס הנתונים מ-Render דרך משתנה הסביבה DATABASE_URL
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

app.use(express.json());

// בדיקת חיים – לוודא שהשרת וה-DB חיים
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

// דוגמת שמירת לקוח – בהמשך נהפוך את זה ללקוחות/לידים/חניכים אמיתיים
app.post("/api/clients", async (req, res) => {
  if (!pool) {
    return res.status(500).json({ error: "db_not_configured" });
  }

  const { fullName, phone, email } = req.body;

  // ולידציה בסיסית
  if (!fullName || typeof fullName !== "string" || fullName.trim().length < 2) {
    return res.status(400).json({ error: "fullName_required" });
  }

  try {
    await pool.query(
      `CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        full_name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );`
    );

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

// קריאת כל הלקוחות השמורים
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
