const express = require("express");
const path = require("path");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 10000;

// ===== חיבור ל-PostgreSQL דרך Render =====
let pool = null;

if (!process.env.DATABASE_URL) {
  console.warn("WARNING: DATABASE_URL is not set. DB will not be available.");
} else {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
}

// יצירת טבלת משתמשים + משתמש ראשי (אלעד)
async function initDb() {
  if (!pool) {
    console.warn("No DB pool – skipping initDb()");
    return;
  }

  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'owner',
      created_at TIMESTAMP DEFAULT NOW(),
      is_active BOOLEAN DEFAULT TRUE
    );
  `;

  await pool.query(createUsersTable);

  const upsertElad = `
    INSERT INTO users (email, password, name, role, is_active)
    VALUES ($1, $2, $3, $4, TRUE)
    ON CONFLICT (email)
    DO UPDATE SET
      password = EXCLUDED.password,
      name = EXCLUDED.name,
      role = EXCLUDED.role,
      is_active = TRUE;
  `;

  await pool.query(upsertElad, [
    "elad@eladlotar.com",
    "5599Tapuach",
    "אלעד אטיאס",
    "owner",
  ]);

  console.log("Users table ready + Elad user ensured in DB");
}

initDb().catch((err) => {
  console.error("Error during DB initialization:", err);
});

app.use(cors());
app.use(express.json());

// קבצים סטטיים
app.use(express.static(path.join(__dirname, "public")));

// דשבורד
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// לוגין – עכשיו מה-DB
app.post("/api/login", async (req, res) => {
  if (!pool) {
    return res
      .status(500)
      .json({ success: false, message: "Database not configured" });
  }

  const { email, password } = req.body || {};

  if (!email || !password) {
    return res
      .status(400)
      .json({ success: false, message: "חסר אימייל או סיסמה" });
  }

  try {
    const query = `
      SELECT id, email, name, role, is_active
      FROM users
      WHERE LOWER(email) = LOWER($1)
        AND password = $2
        AND is_active = TRUE
      LIMIT 1;
    `;
    const result = await pool.query(query, [email, password]);

    if (result.rows.length === 0) {
      return res
        .status(401)
        .json({ success: false, message: "אימייל או סיסמה שגויים" });
    }

    const user = result.rows[0];

    const safeUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    return res.json({ success: true, user: safeUser });
  } catch (err) {
    console.error("Login DB error:", err);
    return res
      .status(500)
      .json({ success: false, message: "שגיאת שרת בלוגין" });
  }
});

// בדיקת שרת
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// בדיקת DB
app.get("/api/db-health", async (req, res) => {
  if (!pool) {
    return res
      .status(500)
      .json({ ok: false, message: "No DB pool configured" });
  }

  try {
    const result = await pool.query("SELECT NOW() AS now");
    res.json({ ok: true, time: result.rows[0].now });
  } catch (err) {
    console.error("DB health check error:", err);
    res.status(500).json({ ok: false, message: "DB error" });
  }
});

// הפעלת השרת
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
