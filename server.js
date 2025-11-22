const express = require("express");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 10000;

// משתמשים מורשים – תעדכן פה מיילים וסיסמאות
const USERS = [
  {
    email: "elad@eladlotar.com",
    password: "5599Tapuach", // תחליף למה שאתה רוצה
    name: "אלעד אטיאס",
    role: "owner",
  },
  {
    email: "instructor1@eladlotar.co.il",
    password: "abcd1234",
    name: "מדריך 1",
    role: "instructor",
  },
  {
    email: "instructor2@eladlotar.co.il",
    password: "abcd5678",
    name: "מדריך 2",
    role: "instructor",
  },
];

app.use(cors());
app.use(express.json());

// הגשת קבצים סטטיים מתוך public
app.use(express.static(path.join(__dirname, "public")));

// דף הבית – הדשבורד
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// API לוגין – מייל + סיסמה
app.post("/api/login", (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res
      .status(400)
      .json({ success: false, message: "חסר אימייל או סיסמה" });
  }

  const user = USERS.find(
    (u) =>
      u.email.toLowerCase() === String(email).toLowerCase() &&
      u.password === password
  );

  if (!user) {
    return res
      .status(401)
      .json({ success: false, message: "אימייל או סיסמה שגויים" });
  }

  const safeUser = {
    email: user.email,
    name: user.name,
    role: user.role,
  };

  return res.json({ success: true, user: safeUser });
});

// בדיקת בריאות
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// הפעלת השרת
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
