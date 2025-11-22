const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;

// להגיש את כל הקבצים מתוך public
app.use(express.static(path.join(__dirname, "public")));

// דף הבית – index.html מתוך public
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// בדיקת בריאות
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// הפעלת השרת
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
