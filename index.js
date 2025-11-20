// שרת בסיסי ל-CRM של אלעד
// משתמש ב-SQLite לקובץ מסד נתונים פשוט ו-JWT להרשאות

const express = require('express');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();

// הגדרות בסיס
app.use(express.json());
app.use(cors());

// יצירת מסד נתונים כקובץ מקומי בשרת
const db = new Database('mission-control.db');

// יצירת טבלת משתמשים אם לא קיימת
db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL
  )
`).run();

// יצירת משתמש אדמין ראשוני אם הוא לא קיים
function ensureAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@crm.local';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin1234!';

  const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(adminEmail);

  if (!existing) {
    const hashed = bcrypt.hashSync(adminPassword, 10);
    db.prepare(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)'
    ).run('Admin', adminEmail, hashed, 'ADMIN');

    console.log('נוצר משתמש אדמין ראשוני:');
    console.log('אימייל:', adminEmail);
    console.log('סיסמה:', adminPassword);
  }
}

ensureAdmin();

// סוד ל-JWT (עדיף להגדיר ב-ENV, אבל יש ברירת מחדל)
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret';

// middleware לאימות token
function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(401).json({ message: 'חסר token (לא מחובר)' });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ message: 'פורמט token לא תקין' });
  }

  const token = parts[1];

  try {
    const payload = jwt.verify(token, JWT_SECRET);

    const user = db
      .prepare('SELECT id, name, email, role FROM users WHERE id = ?')
      .get(payload.userId);

    if (!user) {
      return res.status(401).json({ message: 'משתמש לא נמצא' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('JWT error:', err);
    return res.status(401).json({ message: 'token לא תקין או שפג תוקפו' });
  }
}

// middleware לבדוק תפקידים
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'לא מחובר' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'אין הרשאה לבצע פעולה זו' });
    }

    next();
  };
}

// ראוט בדיקה בסיסי
app.get('/', (req, res) => {
  res.send('ELAD CRM API עובד');
});

// התחברות – מחזיר token
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ message: 'חובה לשלוח אימייל וסיסמה בגוף הבקשה' });
  }

  const user = db
    .prepare('SELECT * FROM users WHERE email = ?')
    .get(email);

  if (!user) {
    return res.status(401).json({ message: 'אימייל או סיסמה שגויים' });
  }

  const isValid = bcrypt.compareSync(password, user.password);

  if (!isValid) {
    return res.status(401).json({ message: 'אימייל או סיסמה שגויים' });
  }

  const token = jwt.sign(
    {
      userId: user.id,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});

// דוגמה לראוט מאובטח: מי אני
app.get('/api/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

// לדוגמה: ראוט שרק אדמין ו
