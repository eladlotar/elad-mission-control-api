const express = require("express");
const path = require("path");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 10000;

// ===== חיבור ל-PostgreSQL =====
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// בדיקת חיבור ל-DB
async function testDB() {
  try {
    await pool.query("SELECT NOW()");
    console.log("DB Connected OK!");
  } catch (err) {
    console.error("DB ERROR:", err.message);
  }
}
testDB();

// ===== אימות בסיסי בינתיים =====
const USERS = [
  {
    email: "elad@eladlotar.com",
    password: "5599Tapuach",
    name: "אלעד אטיאס",
    role: "owner",
  },
];

app.use(cors());
app.use(express.json());

// הגשת קבצים סטטיים
app.use(express.static(path.join(__dirname, "public")));

// API לוגין – דמה זמני
app.post("/api/login", (req, res) => {
  const { email, password } = req.body || {};
  const user = USERS.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
  if (!user) return res.status(401).json({ success: false, message: "אימייל או סיסמה שגויים" });

  return res.json({ success: true, user: { email: user.email, name: user.name } });
});

// API בדיקת DB
app.get("/api/db-test", async (req, res) => {
  try {
    const data = await pool.query("SELECT NOW()");
    res.json({ db: "connected", time: data.rows[0].now });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// כל Route אחר → דשבורד
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => console.log("Server running on", PORT));
