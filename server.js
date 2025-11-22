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

// בדיקת חיבור + יצירת טבלאות
async function initDB() {
  try {
    // בדיקה בסיסית
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

    // לוודא שאלעד קיים כמשתמש OWNER
    await pool.query(
      `
      INSERT INTO users (email, password, name, role)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) DO NOTHING;
    `,
      ["elad@eladlotar.com", "5599Tapuach", "אלעד אטיאס", "owner"]
    );

    console.log("✅ users table ready & Elad user ensured");
  } catch (err) {
    console.error("❌ initDB error:", err.message);
  }
}

initDB();

app.use(cors());
app.use(express.json());

// ===== סטטי – הקבצים מהתקייה public =====
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

// ===== בדיקת DB (כמו שהיה) =====
app.get("/api/db-test", async (req, res) => {
  try {
    const data = await pool.query("SELECT NOW()");
    res.json({ db: "connected", time: data.rows[0].now });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== כל Route אחר → הדשבורד (המערכת) =====
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ===== הפעלת השרת =====
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
