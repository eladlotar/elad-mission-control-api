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

// Error handler – לכל ה־API
function handleError(res, error) {
  console.error("❌ Server Error:", error);
  res.status(500).json({ error: "Server failed", details: error.message });
}

// =========================
// Authentication
// =========================

// Login
app.post("/api/auth/login",
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
      if (!match) return res.status(401).json({ error: "Invalid password" });

      const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET);
      res.json({ token });
    } catch (err) {
      handleError(res, err);
    }
  }
);

// Auth middleware
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

// =========================
// Finance API
// =========================

// Create finance entry
app.post("/api/finance",
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
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [direction, type, amount, date, note]
      );
      res.json(result.rows[0]);
    } catch (err) {
      handleError(res, err);
    }
  }
);

// Get finance list
app.get("/api/finance", authGuard, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM finance ORDER BY date DESC LIMIT 50");
    res.json(result.rows);
  } catch (err) {
    handleError(res, err);
  }
});

// =========================
// Calendar API
// =========================

// Create event
app.post("/api/calendar",
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
         VALUES ($1,$2,$3) RETURNING *`,
        [event_type, title, date]
      );
      res.json(result.rows[0]);
    } catch (err) {
      handleError(res, err);
    }
  }
);

// Get events
app.get("/api/calendar", authGuard, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM calendar ORDER BY date DESC LIMIT 200");
    res.json(result.rows);
  } catch (err) {
    handleError(res, err);
  }
});

// =========================
// Server
// =========================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("CRM API running on", PORT));
