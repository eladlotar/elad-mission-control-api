const express = require("express");
const path = require("path");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 10000;

// ===== חיבור ל-PostgreSQL דרך ENV =====
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ===== אתחול DB: בדיקה + יצירת טבלאות =====
async function initDB() {
  try {
    await pool.query("SELECT NOW()");
    console.log("✅ DB Connected OK");

    // טבלת משתמשים
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // טבלת לקוחות
    await pool.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        full_name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        source TEXT,
        status TEXT DEFAULT 'active',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // טבלת לידים
    await pool.query(`
      CREATE TABLE IF NOT EXISTS leads (
        id SERIAL PRIMARY KEY,
        full_name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        source TEXT,
        status TEXT DEFAULT 'new',
        notes TEXT,
        converted_client_id INTEGER REFERENCES clients(id),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // טבלת קורסים
    await pool.query(`
      CREATE TABLE IF NOT EXISTS courses (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT,
        price NUMERIC,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // טבלת מדריכים
    await pool.query(`
      CREATE TABLE IF NOT EXISTS instructors (
        id SERIAL PRIMARY KEY,
        full_name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        hourly_rate NUMERIC,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // טבלת אירועים ביומן
    await pool.query(`
      CREATE TABLE IF NOT EXISTS calendar_events (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        event_type TEXT NOT NULL,        -- course / training / other
        event_date DATE NOT NULL,
        course_id INTEGER REFERENCES courses(id),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // טבלת פיננסים
    await pool.query(`
      CREATE TABLE IF NOT EXISTS finance_transactions (
        id SERIAL PRIMARY KEY,
        direction TEXT NOT NULL,         -- income / expense
        tx_type TEXT NOT NULL,           -- קורס בסיסי, תחמושת וכו'
        amount NUMERIC NOT NULL,
        tx_date DATE NOT NULL,
        note TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // לוודא שאלעד קיים כמשתמש OWNER
    await pool.query(
      `
      INSERT INTO users (email, password, name, role)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) DO NOTHING;
    `,
      ["elad@eladlotar.com", "5599Tapuach", "אלעד אטיאס", "owner"]
    );

    console.log("✅ All tables ready (users/clients/leads/...)");
  } catch (err) {
    console.error("❌ initDB error:", err.message);
  }
}

initDB();

app.use(cors());
app.use(express.json());

// ===== סטטי – קבצי המערכת =====
app.use(express.static(path.join(__dirname, "public")));

// ===== API לוגין אמיתי מה-DB =====
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "חסר אימייל או סיסמה" });
    }

    const result = await pool.query(
      `
      SELECT id, email, password, name, role
      FROM users
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1;
    `,
      [email]
    );

    if (result.rows.length === 0) {
      return res
        .status(401)
        .json({ success: false, message: "אימייל או סיסמה שגויים" });
    }

    const user = result.rows[0];

    if (user.password !== password) {
      return res
        .status(401)
        .json({ success: false, message: "אימייל או סיסמה שגויים" });
    }

    const safeUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    return res.json({ success: true, user: safeUser });
  } catch (err) {
    console.error("login error:", err.message);
    return res
      .status(500)
      .json({ success: false, message: "שגיאת שרת בלוגין" });
  }
});

// ===== API DB Health =====
app.get("/api/db-test", async (req, res) => {
  try {
    const data = await pool.query("SELECT NOW()");
    res.json({ db: "connected", time: data.rows[0].now });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== API – CLIENTS =====

// כל הלקוחות
app.get("/api/clients", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, full_name, phone, email, source, status, notes, created_at FROM clients ORDER BY created_at DESC;"
    );
    res.json({ success: true, items: result.rows });
  } catch (err) {
    console.error("get clients error:", err.message);
    res.status(500).json({ success: false, message: "שגיאה בשליפת לקוחות" });
  }
});

// יצירת לקוח חדש
app.post("/api/clients", async (req, res) => {
  try {
    const { full_name, phone, email, source, status, notes } = req.body || {};
    if (!full_name) {
      return res
        .status(400)
        .json({ success: false, message: "חסר שם לקוח" });
    }

    const result = await pool.query(
      `
      INSERT INTO clients (full_name, phone, email, source, status, notes)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, full_name, phone, email, source, status, notes, created_at;
    `,
      [full_name, phone || null, email || null, source || null, status || "active", notes || null]
    );

    res.status(201).json({ success: true, item: result.rows[0] });
  } catch (err) {
    console.error("create client error:", err.message);
    res.status(500).json({ success: false, message: "שגיאה ביצירת לקוח" });
  }
});

// ===== API – LEADS =====

// כל הלידים
app.get("/api/leads", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, full_name, phone, email, source, status, notes, created_at FROM leads ORDER BY created_at DESC;"
    );
    res.json({ success: true, items: result.rows });
  } catch (err) {
    console.error("get leads error:", err.message);
    res.status(500).json({ success: false, message: "שגיאה בשליפת לידים" });
  }
});

// יצירת ליד חדש
app.post("/api/leads", async (req, res) => {
  try {
    const { full_name, phone, email, source, status, notes } = req.body || {};
    if (!full_name) {
      return res
        .status(400)
        .json({ success: false, message: "חסר שם לליד" });
    }

    const result = await pool.query(
      `
      INSERT INTO leads (full_name, phone, email, source, status, notes)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, full_name, phone, email, source, status, notes, created_at;
    `,
      [full_name, phone || null, email || null, source || null, status || "new", notes || null]
    );

    res.status(201).json({ success: true, item: result.rows[0] });
  } catch (err) {
    console.error("create lead error:", err.message);
    res.status(500).json({ success: false, message: "שגיאה ביצירת ליד" });
  }
});

// ===== כל Route אחר → הדשבורד =====
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ===== הפעלת השרת =====
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
