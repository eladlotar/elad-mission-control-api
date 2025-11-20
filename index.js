// ELAD CRM – API מלא עם תפקידים, לקוחות, אימונים, משימות ותשלומים
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
    console.error('JWT error:', err);
    return res.status(401).json({ message: 'token לא תקין או שפג תוקפו' });
  }
}

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'לא מחובר' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'אין לך הרשאה לבצע פעולה זו' });
    }

    next();
  };
}

// ===================== ראוטים בסיסיים =====================

app.get('/', (req, res) => {
  res.send('ELAD CRM API עובד');
});

// מגיש את ה-UI
app.use('/app', express.static(PUBLIC_DIR));

// ===================== AUTH – התחברות, מי אני =====================

// LOGIN
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ message: 'חובה לשלוח אימייל וסיסמה' });
  }

  const db = loadDb();
  const user = db.users.find(u => u.email === email);

  if (!user) {
    return res.status(401).json({ message: 'אימייל או סיסמה שגויים' });
  }

  const isValid = bcrypt.compareSync(password, user.passwordHash);

  if (!isValid) {
    return res.status(401).json({ message: 'אימייל או סיסמה שגויים' });
  }

  const token = jwt.sign(
    {
      userId: user.id,
      role: user.role
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
      role: user.role
    }
  });
});

// מי אני
app.get('/api/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

// ===================== USERS – ניהול משתמשים =====================

// רשימת משתמשים – רק אדמין/מנהל
app.get(
  '/api/users',
  authenticate,
  authorizeRoles('ADMIN', 'MANAGER'),
  (req, res) => {
    const db = loadDb();
    const users = db.users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role
    }));
    res.json(users);
  }
);

// יצירת משתמש – רק אדמין
app.post(
  '/api/users',
  authenticate,
  authorizeRoles('ADMIN'),
  (req, res) => {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res
        .status(400)
        .json({ message: 'חסר שדה חובה (name / email / password / role)' });
    }

    const allowedRoles = [
      'ADMIN',
      'MANAGER',
      'SALES',
      'MARKETING',
      'INSTRUCTOR',
      'ACCOUNTANT'
    ];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: 'role לא תקין' });
    }

    const db = loadDb();

    const existing = db.users.find(u => u.email === email);
    if (existing) {
      return res
        .status(409)
        .json({ message: 'כבר קיים משתמש עם האימייל הזה' });
    }

    const hashed = bcrypt.hashSync(password, 10);
    const newUser = {
      id: db.nextUserId++,
      name,
      email,
      passwordHash: hashed,
      role
    };

    db.users.push(newUser);
    saveDb(db);

    res.status(201).json({
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role
    });
  }
);

// ===================== CUSTOMERS – לקוחות / לידים =====================

// רשימת לקוחות
app.get('/api/customers', authenticate, (req, res) => {
  const { q, status, assignedTo } = req.query;
  const db = loadDb();
  let customers = db.customers;

  if (q) {
    const term = q.toLowerCase();
    customers = customers.filter(
      c =>
        (c.name && c.name.toLowerCase().includes(term)) ||
        (c.phone && c.phone.includes(term)) ||
        (c.email && c.email.toLowerCase().includes(term))
    );
  }

  if (status) {
    customers = customers.filter(c => c.status === status);
  }

  if (assignedTo === 'me') {
    customers = customers.filter(
      c => c.assignedToUserId === req.user.id
    );
  } else if (assignedTo) {
    const idNum = Number(assignedTo);
    customers = customers.filter(c => c.assignedToUserId === idNum);
  }

  res.json(customers);
});

// יצירת לקוח / ליד
app.post('/api/customers', authenticate, (req, res) => {
  const { name, phone, email, source, status, notes, assignedToUserId } =
    req.body;

  if (!name || !phone) {
    return res
      .status(400)
      .json({ message: 'חובה שם וטלפון' });
  }

  const db = loadDb();

  const newCustomer = {
    id: db.nextCustomerId++,
    name,
    phone,
    email: email || '',
    source: source || '',
    status: status || 'LEAD', // LEAD / ACTIVE / INACTIVE
    notes: notes || '',
    assignedToUserId: assignedToUserId || null,
    createdAt: new Date().toISOString()
  };

  db.customers.push(newCustomer);
  saveDb(db);

  res.status(201).json(newCustomer);
});

// עדכון לקוח
app.put('/api/customers/:id', authenticate, (req, res) => {
  const id = Number(req.params.id);
  const db = loadDb();
  const customer = db.customers.find(c => c.id === id);

  if (!customer) {
    return res.status(404).json({ message: 'לקוח לא נמצא' });
  }

  const {
    name,
    phone,
    email,
    source,
    status,
    notes,
    assignedToUserId
  } = req.body;

  if (name !== undefined) customer.name = name;
  if (phone !== undefined) customer.phone = phone;
  if (email !== undefined) customer.email = email;
  if (source !== undefined) customer.source = source;
  if (status !== undefined) customer.status = status;
  if (notes !== undefined) customer.notes = notes;
  if (assignedToUserId !== undefined)
    customer.assignedToUserId = assignedToUserId;

  saveDb(db);
  res.json(customer);
});

// ===================== TRAININGS – אימונים / קורסים =====================

// רשימת אימונים
app.get('/api/trainings', authenticate, (req, res) => {
  const { customerId, instructorId } = req.query;
  const db = loadDb();
  let trainings = db.trainings;

  if (customerId) {
    const cid = Number(customerId);
    trainings = trainings.filter(t => t.customerId === cid);
  }

  if (instructorId === 'me') {
    trainings = trainings.filter(
      t => t.instructorId === req.user.id
    );
  } else if (instructorId) {
    const iid = Number(instructorId);
    trainings = trainings.filter(t => t.instructorId === iid);
  }

  res.json(trainings);
});

// יצירת אימון
app.post('/api/trainings', authenticate, (req, res) => {
  const {
    customerId,
    date,
    time,
    type,
    instructorId,
    status,
    price,
    location,
    notes
  } = req.body;

  if (!customerId || !date || !type) {
    return res
      .status(400)
      .json({ message: 'חובה customerId / date / type' });
  }

  const db = loadDb();
  const customer = db.customers.find(
    c => c.id === Number(customerId)
  );

  if (!customer) {
    return res.status(400).json({ message: 'לקוח לא קיים' });
  }

  const newTraining = {
    id: db.nextTrainingId++,
    customerId: Number(customerId),
    date,
    time: time || '',
    type, // INTRO / ADVANCED / GROUP / PRIVATE
    instructorId: instructorId || null,
    status: status || 'SCHEDULED', // SCHEDULED / DONE / CANCELED
    price: price || 0,
    location: location || '',
    notes: notes || ''
  };

  db.trainings.push(newTraining);
  saveDb(db);

  res.status(201).json(newTraining);
});

// עדכון אימון
app.put('/api/trainings/:id', authenticate, (req, res) => {
  const id = Number(req.params.id);
  const db = loadDb();
  const training = db.trainings.find(t => t.id === id);

  if (!training) {
    return res.status(404).json({ message: 'אימון לא נמצא' });
  }

  const {
    date,
    time,
    type,
    instructorId,
    status,
    price,
    location,
    notes
  } = req.body;

  if (date !== undefined) training.date = date;
  if (time !== undefined) training.time = time;
  if (type !== undefined) training.type = type;
  if (instructorId !== undefined)
    training.instructorId = instructorId;
  if (status !== undefined) training.status = status;
  if (price !== undefined) training.price = price;
  if (location !== undefined) training.location = location;
  if (notes !== undefined) training.notes = notes;

  saveDb(db);
  res.json(training);
});

// ===================== TASKS – משימות follow-up =====================

// רשימת משימות
app.get('/api/tasks', authenticate, (req, res) => {
  const { status, assignedTo } = req.query;
  const db = loadDb();
  let tasks = db.tasks;

  if (status) {
    tasks = tasks.filter(t => t.status === status);
  }

  if (assignedTo === 'me') {
    tasks = tasks.filter(t => t.assignedToUserId === req.user.id);
  } else if (assignedTo) {
    const uid = Number(assignedTo);
    tasks = tasks.filter(t => t.assignedToUserId === uid);
  }

  res.json(tasks);
});

// יצירת משימה
app.post('/api/tasks', authenticate, (req, res) => {
  const {
    customerId,
    assignedToUserId,
    type,
    dueDate,
    status,
    notes
  } = req.body;

  if (!customerId || !assignedToUserId || !type) {
    return res
      .status(400)
      .json({ message: 'חובה customerId / assignedToUserId / type' });
  }

  const db = loadDb();
  const customer = db.customers.find(
    c => c.id === Number(customerId)
  );

  if (!customer) {
    return res.status(400).json({ message: 'לקוח לא קיים' });
  }

  const newTask = {
    id: db.nextTaskId++,
    customerId: Number(customerId),
    assignedToUserId: Number(assignedToUserId),
    type, // CALL / WHATSAPP / EMAIL / MEETING
    dueDate: dueDate || null,
    status: status || 'OPEN', // OPEN / DONE
    notes: notes || ''
  };

  db.tasks.push(newTask);
  saveDb(db);

  res.status(201).json(newTask);
});

// עדכון משימה
app.put('/api/tasks/:id', authenticate, (req, res) => {
  const id = Number(req.params.id);
  const db = loadDb();
  const task = db.tasks.find(t => t.id === id);

  if (!task) {
    return res.status(404).json({ message: 'משימה לא נמצאה' });
  }

  const { dueDate, status, notes } = req.body;

  if (dueDate !== undefined) task.dueDate = dueDate;
  if (status !== undefined) task.status = status;
  if (notes !== undefined) task.notes = notes;

  saveDb(db);
  res.json(task);
});

// ===================== PAYMENTS – תשלומים =====================

// רשימת תשלומים – אדמין + רו"ח
app.get(
  '/api/payments',
  authenticate,
  authorizeRoles('ADMIN', 'ACCOUNTANT'),
  (req, res) => {
    const db = loadDb();
    res.json(db.payments);
  }
);

// יצירת תשלום – אדמין + רו"ח
app.post(
  '/api/payments',
  authenticate,
  authorizeRoles('ADMIN', 'ACCOUNTANT'),
  (req, res) => {
    const {
      customerId,
      amount,
      currency,
      date,
      method,
      reference,
      notes
    } = req.body;

    if (!customerId || !amount) {
      return res
        .status(400)
        .json({ message: 'חובה customerId ו-amount' });
    }

    const db = loadDb();
    const customer = db.customers.find(
      c => c.id === Number(customerId)
    );

    if (!customer) {
      return res.status(400).json({ message: 'לקוח לא קיים' });
    }

    const newPayment = {
      id: db.nextPaymentId++,
      customerId: Number(customerId),
      amount,
      currency: currency || 'ILS',
      date: date || new Date().toISOString(),
      method: method || '',
      reference: reference || '',
      notes: notes || ''
    };

    db.payments.push(newPayment);
    saveDb(db);

    res.status(201).json(newPayment);
  }
);

// ===================== הפעלת השרת =====================

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log('ELAD CRM API רץ על פורט', PORT);
});
