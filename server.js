require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { body, validationResult } = require("express-validator");

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// =============== DB INIT – יצירת טבלאות אם לא קיימות ===============
async function ensureTables() {
  try {
    // טבלת פיננסים
    await pool.query(`
      CREATE TABLE IF NOT EXISTS finance (
        id SERIAL PRIMARY KEY,
        direction TEXT NOT NULL,
        type TEXT NOT NULL,
        amount NUMERIC NOT NULL,
        date DATE NOT NULL,
        note TEXT
      );
    `);

    // טבלת יומן
    await pool.query(`
      CREATE TABLE IF NOT EXISTS calendar (
        id SERIAL PRIMARY KEY,
        event_type TEXT NOT NULL,
        title TEXT NOT NULL,
        date DATE NOT NULL
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
        status TEXT NOT NULL,
        handler_user_id INTEGER REFERENCES users(id),
        note TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    console.log("✅ DB tables ensured");
  } catch (err) {
    console.error("❌ DB init failed:", err);
  }
}
ensureTables();
// ===========================================================

function handleError(res, error) {
  console.error("❌ Server Error:", error);
  res.status(500).json({ error: "Server failed", details: error.message });
}

// =====================
// Authentication
// =====================

app.post(
  "/api/auth/login",
  body("email").isEmail().withMessage("Email format invalid"),
  body("password").isLength({ min: 3 }).withMessage("Password too short"),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;
      const result = await pool.query("SELECT * FROM users WHERE email=$1", [email]);

      if (result.rows.length === 0) {
        return res.status(401).json({ error: "User not found" });
      }

      const user = result.rows[0];
      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) {
        return res.status(401).json({ error: "Invalid password" });
      }

      const token = jwt.sign(
        { userId: user.id, role: user.role },
        process.env.JWT_SECRET
      );

      res.json({ token });
    } catch (err) {
      handleError(res, err);
    }
  }
);

function authGuard(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: "No token" });

  const token = auth.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

function adminGuard(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin only" });
  }
  next();
}

// =====================
// Users (לבחירת גורם מטפל בלידים)
// =====================

app.get("/api/users", authGuard, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, email, role FROM users ORDER BY email ASC"
    );
    res.json(result.rows);
  } catch (err) {
    handleError(res, err);
  }
});

// =====================
// Finance API
// =====================

app.post(
  "/api/finance",
  authGuard,
  body("direction").isIn(["income", "expense"]).withMessage("Direction invalid"),
  body("type").isString().notEmpty().withMessage("Type required"),
  body("amount").isFloat({ min: 0 }).withMessage("Amount must be positive"),
  body("date").isISO8601().withMessage("Invalid date"),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { direction, type, amount, date, note } = req.body;
      const result = await pool.query(
        `INSERT INTO finance (direction, type, amount, date, note)
         VALUES ($1,$2,$3,$4,$5)
         RETURNING *`,
        [direction, type, amount, date, note || null]
      );
      res.json(result.rows[0]);
    } catch (err) {
      handleError(res, err);
    }
  }
);

app.get("/api/finance", authGuard, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM finance ORDER BY date DESC, id DESC LIMIT 200"
    );
    res.json(result.rows);
  } catch (err) {
    handleError(res, err);
  }
});

// =====================
// Calendar API
// =====================

app.post(
  "/api/calendar",
  authGuard,
  body("event_type").isIn(["course", "training"]).withMessage("Event type invalid"),
  body("title").isString().notEmpty().withMessage("Title required"),
  body("date").isISO8601().withMessage("Invalid date"),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { event_type, title, date } = req.body;
      const result = await pool.query(
        `INSERT INTO calendar (event_type, title, date)
         VALUES ($1,$2,$3)
         RETURNING *`,
        [event_type, title, date]
      );
      res.json(result.rows[0]);
    } catch (err) {
      handleError(res, err);
    }
  }
);

app.get("/api/calendar", authGuard, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM calendar ORDER BY date ASC, id ASC LIMIT 500"
    );
    res.json(result.rows);
  } catch (err) {
    handleError(res, err);
  }
});

// =====================
// Leads API
// =====================

const leadStatuses = [
  "לא ענה פעם 1",
  "לא ענה פעם 2",
  "לא ענה פעם 3",
  "פלואפ",
  "לא סגר",
  "סגר",
  "מתלבט",
  "ביקש לחזור אליו במועד אחר"
];

const leadValidators = [
  body("full_name").isString().notEmpty().withMessage("Full name required"),
  body("phone").optional().isString().isLength({ min: 6, max: 20 }),
  body("email").optional().isEmail().withMessage("Invalid email"),
  body("source").optional().isString(),
  body("status").isIn(leadStatuses).withMessage("Status invalid"),
  body("handler_user_id").optional().isInt().withMessage("Handler must be user id"),
  body("note").optional().isString()
];

app.get("/api/leads", authGuard, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT l.*, u.email AS handler_email
       FROM leads l
       LEFT JOIN users u ON u.id = l.handler_user_id
       ORDER BY l.created_at DESC, l.id DESC
       LIMIT 200`
    );
    res.json(result.rows);
  } catch (err) {
    handleError(res, err);
  }
});

app.post("/api/leads", authGuard, leadValidators, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      full_name,
      phone,
      email,
      source,
      status,
      handler_user_id,
      note
    } = req.body;

    const result = await pool.query(
      `INSERT INTO leads
       (full_name, phone, email, source, status, handler_user_id, note)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [
        full_name,
        phone || null,
        email || null,
        source || null,
        status,
        handler_user_id || null,
        note || null
      ]
    );
    res.json(result.rows[0]);
  } catch (err) {
    handleError(res, err);
  }
});

app.put("/api/leads/:id", authGuard, leadValidators, async (req, res) => {
  try {
    const leadId = req.params.id;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      full_name,
      phone,
      email,
      source,
      status,
      handler_user_id,
      note
    } = req.body;

    const result = await pool.query(
      `UPDATE leads
       SET full_name=$1,
           phone=$2,
           email=$3,
           source=$4,
           status=$5,
           handler_user_id=$6,
           note=$7
       WHERE id=$8
       RETURNING *`,
      [
        full_name,
        phone || null,
        email || null,
        source || null,
        status,
        handler_user_id || null,
        note || null,
        leadId
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Lead not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    handleError(res, err);
  }
});

app.delete("/api/leads/:id", authGuard, async (req, res) => {
  try {
    const leadId = req.params.id;
    await pool.query("DELETE FROM leads WHERE id=$1", [leadId]);
    res.json({ success: true });
  } catch (err) {
    handleError(res, err);
  }
});

// =====================
// Backup export (JSON רך)
// =====================

app.get("/api/backup/export", authGuard, adminGuard, async (req, res) => {
  try {
    const [leadsRes, financeRes, calendarRes] = await Promise.all([
      pool.query("SELECT * FROM leads ORDER BY created_at DESC, id DESC"),
      pool.query("SELECT * FROM finance ORDER BY date DESC, id DESC"),
      pool.query("SELECT * FROM calendar ORDER BY date ASC, id ASC")
    ]);

    const payload = {
      exported_at: new Date().toISOString(),
      leads: leadsRes.rows,
      finance: financeRes.rows,
      calendar: calendarRes.rows
    };

    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="elad_crm_backup_${Date.now()}.json"`
    );
    res.send(JSON.stringify(payload, null, 2));
  } catch (err) {
    handleError(res, err);
  }
});

// =====================
// Server
// =====================

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("CRM API running on", PORT);
});
