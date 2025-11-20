// ELAD CRM – API בסיסי עם תפקידים ומודולים
// "מסד נתונים" בקובץ db.json – בלי DB חיצוני

const express = require('express');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();

// ===================== הגדרות בסיס =====================

app.use(express.json());
app.use(cors());

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@crm.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin1234!';

const DB_FILE = path.join(__dirname, 'db.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

// ===================== "מסד נתונים" בקובץ =====================

function loadDb() {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return {
      users: [],
      customers: [],
      trainings: [],
      tasks: [],
      payments: [],
      nextUserId: 1,
      nextCustomerId: 1,
      nextTrainingId: 1,
      nextTaskId: 1,
      nextPaymentId: 1
    };
  }
}

function saveDb(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
}

// ===================== יצירת אדמין ראשוני =====================

function ensureAdmin() {
  const db = loadDb();
  const existing = db.users.find(u => u.email === ADMIN_EMAIL);

  if (!existing) {
    const hashed = bcrypt.hashSync(ADMIN_PASSWORD, 10);
    const adminUser = {
      id: db.nextUserId++,
      name: 'Admin',
      email: ADMIN_EMAIL,
      passwordHash: hashed,
      role: 'ADMIN'
    };
    db.users.push(adminUser);
    saveDb(db);

    console.log('נוצר משתמש אדמין ראשוני:');
    console.log('אימייל:', ADMIN_EMAIL);
    console.log('סיסמה:', ADMIN_PASSWORD);
  } else {
    console.log('אדמין כבר קיים במערכת עם האימייל:', ADMIN_EMAIL);
  }
}

ensureAdmin();

// ===================== Middleware – אימות והרשאות =====================

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
    const db = loadDb();
    const user = db.users.find(u => u.id === payload.userId);

    if (!user) {
      return res.status(401).json({ message: 'משתמש לא נמצא' });
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    next();
  } catch (err) {
    console.error('JWT error:', err
