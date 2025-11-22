// ===== ניווט בין סקשנים =====
const navItems = document.querySelectorAll(".nav-item");
const sections = document.querySelectorAll(".section");
const pageTitleEl = document.querySelector(".page-title");
const pageSubtitleEl = document.querySelector(".page-subtitle");

// טקסטים לכותרת לכל סקשן
const sectionTitles = {
  dashboard: {
    title: "עמוד הבית",
    subtitle: "סקירה מהירה על העסק שלך",
  },
  calendar: {
    title: "יומן / לוח שנה",
    subtitle: "ניהול קורסים ואימונים לפי תאריכים",
  },
  clients: {
    title: "לקוחות",
    subtitle: "ניהול לקוחות קיימים ולקוחות חוזרים",
  },
  leads: {
    title: "לידים",
    subtitle: "מעקב אחרי פניות חדשות והתקדמות לסגירה",
  },
  courses: {
    title: "קורסים",
    subtitle: "סוגי קורסים, מחזורים ומחירים",
  },
  instructors: {
    title: "מדריכים",
    subtitle: "שיבוץ מדריכים, שעות ותעריפים",
  },
  finance: {
    title: "פיננסים",
    subtitle: "הכנסות, הוצאות ורווחיות קורסים ואימונים",
  },
  tasks: {
    title: "משימות",
    subtitle: "מה צריך לסגור היום ומי אחראי",
  },
  reports: {
    title: "דוחות",
    subtitle: "סיכומים חודשיים ושבועיים",
  },
  settings: {
    title: "הגדרות מערכת",
    subtitle: "משתמשים, סוגי קורסים ותצורת מערכת",
  },
};

navItems.forEach((item) => {
  item.addEventListener("click", () => {
    const sectionId = item.getAttribute("data-section");

    navItems.forEach((btn) => btn.classList.remove("active"));
    item.classList.add("active");

    sections.forEach((section) => {
      if (section.id === sectionId) {
        section.classList.add("active");
      } else {
        section.classList.remove("active");
      }
    });

    if (sectionTitles[sectionId]) {
      pageTitleEl.textContent = sectionTitles[sectionId].title;
      pageSubtitleEl.textContent = sectionTitles[sectionId].subtitle;
    }
  });
});

// ===== כפתור התנתקות =====
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("crmUser");
    window.location.href = "/login.html";
  });
}

// ===== יומן / לוח שנה – לוגיקה בסיסית =====
const calendarTitle = document.getElementById("calendarTitle");
const calendarGrid = document.getElementById("calendarGrid");
const prevMonthBtn = document.getElementById("prevMonthBtn");
const nextMonthBtn = document.getElementById("nextMonthBtn");
const eventForm = document.getElementById("eventForm");

let currentDate = new Date();
const eventsStore = {};

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildCalendar(date) {
  if (!calendarGrid) return;

  calendarGrid.innerHTML = "";

  const year = date.getFullYear();
  const month = date.getMonth();

  const monthNames = [
    "ינואר",
    "פברואר",
    "מרץ",
    "אפריל",
    "מאי",
    "יוני",
    "יולי",
    "אוגוסט",
    "ספטמבר",
    "אוקטובר",
    "נובמבר",
    "דצמבר",
  ];

  calendarTitle.textContent = `${monthNames[month]} ${year}`;

  const weekDays = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];

  weekDays.forEach((dayName) => {
    const cell = document.createElement("div");
    cell.className = "calendar-cell header";
    cell.textContent = dayName;
    calendarGrid.appendChild(cell);
  });

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  let startDayIndex = firstDayOfMonth.getDay();

  for (let i = 0; i < startDayIndex; i++) {
    const emptyCell = document.createElement("div");
    emptyCell.className = "calendar-cell";
    calendarGrid.appendChild(emptyCell);
  }

  for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
    const cell = document.createElement("div");
    cell.className = "calendar-cell day";

    const numberEl = document.createElement("div");
    numberEl.className = "day-number";
    numberEl.textContent = day;

    cell.appendChild(numberEl);

    const thisDate = new Date(year, month, day);
    const key = formatDateKey(thisDate);

    if (eventsStore[key] && eventsStore[key].length > 0) {
      eventsStore[key].forEach((event) => {
        const dot = document.createElement("div");
        dot.className = "calendar-event-dot";
        dot.textContent =
          event.type === "course"
            ? "קורס: " + event.title
            : "אימון: " + event.title;
        cell.appendChild(dot);
      });
    }

    calendarGrid.appendChild(cell);
  }
}

if (prevMonthBtn && nextMonthBtn) {
  prevMonthBtn.addEventListener("click", () => {
    currentDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() - 1,
      1
    );
    buildCalendar(currentDate);
  });

  nextMonthBtn.addEventListener("click", () => {
    currentDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      1
    );
    buildCalendar(currentDate);
  });
}

if (eventForm) {
  eventForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const typeSelect = document.getElementById("eventType");
    const titleInput = document.getElementById("eventTitle");
    const dateInput = document.getElementById("eventDate");

    const type = typeSelect.value;
    const title = titleInput.value.trim();
    const dateValue = dateInput.value;

    if (!title || !dateValue) {
      alert("תמלא שם ותאריך לפני שמירה.");
      return;
    }

    if (!eventsStore[dateValue]) {
      eventsStore[dateValue] = [];
    }

    eventsStore[dateValue].push({
      type,
      title,
    });

    titleInput.value = "";
    dateInput.value = "";

    currentDate = new Date(dateValue);
    buildCalendar(currentDate);
  });
}

buildCalendar(currentDate);

// ===== פיננסים – לוגיקה =====
const totalIncomeEl = document.getElementById("totalIncome");
const totalExpenseEl = document.getElementById("totalExpense");
const netProfitEl = document.getElementById("netProfit");
const incomeCountLabelEl = document.getElementById("incomeCountLabel");
const expenseCountLabelEl = document.getElementById("expenseCountLabel");
const profitMarginLabelEl = document.getElementById("profitMarginLabel");
const financeListEl = document.getElementById("financeList");
const financeForm = document.getElementById("financeForm");

let financeTransactions = [
  {
    direction: "income",
    type: "קורס בסיסי",
    amount: 2400 * 5,
    date: "2025-11-10",
    note: "קורס בסיסי – מחזור 12 (5 משתתפים)",
  },
  {
    direction: "income",
    type: "קורס מתקדם",
    amount: 2600 * 4,
    date: "2025-11-15",
    note: "קורס מתקדם – 4 משתתפים",
  },
  {
    direction: "income",
    type: "אימון ערב",
    amount: 350 * 12,
    date: "2025-11-18",
    note: "אימון ערב – קבוצה קבועה",
  },
  {
    direction: "expense",
    type: "תחמושת",
    amount: 18400,
    date: "2025-11-12",
    note: "105 קופסאות 9mm / 5.56",
  },
  {
    direction: "expense",
    type: "שכר מדריכים",
    amount: 21600,
    date: "2025-11-20",
    note: "4 מדריכים – שכר חודשי",
  },
];

function formatCurrency(amount) {
  const num = Number(amount) || 0;
  return "₪ " + num.toLocaleString("he-IL");
}

function renderFinanceSummary() {
  if (
    !totalIncomeEl ||
    !totalExpenseEl ||
    !netProfitEl ||
    !incomeCountLabelEl ||
    !expenseCountLabelEl ||
    !profitMarginLabelEl
  ) {
    return;
  }

  let income = 0;
  let expense = 0;
  let incomeCount = 0;
  let expenseCount = 0;

  financeTransactions.forEach((tx) => {
    if (tx.direction === "income") {
      income += tx.amount;
      incomeCount++;
    } else if (tx.direction === "expense") {
      expense += tx.amount;
      expenseCount++;
    }
  });

  const profit = income - expense;
  const margin = income > 0 ? Math.round((profit / income) * 100) : 0;

  totalIncomeEl.textContent = formatCurrency(income);
  totalExpenseEl.textContent = formatCurrency(expense);
  netProfitEl.textContent = formatCurrency(profit);

  incomeCountLabelEl.textContent = `${incomeCount} תנועות הכנסה`;
  expenseCountLabelEl.textContent = `${expenseCount} תנועות הוצאה`;
  profitMarginLabelEl.textContent = `${margin}% מרווחיות`;
}

function renderFinanceList() {
  if (!financeListEl) return;

  financeListEl.innerHTML = "";

  const sorted = [...financeTransactions].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  if (sorted.length === 0) {
    const li = document.createElement("li");
    li.textContent = "אין עדיין תנועות. תתחיל להוסיף מהטופס.";
    financeListEl.appendChild(li);
    return;
  }

  sorted.forEach((tx) => {
    const li = document.createElement("li");

    const timeDiv = document.createElement("div");
    timeDiv.className = "list-time";
    timeDiv.textContent = tx.date || "";

    const mainDiv = document.createElement("div");
    mainDiv.className = "list-main";

    const titleDiv = document.createElement("div");
    titleDiv.className = "list-title";
    const directionLabel = tx.direction === "income" ? "הכנסה" : "הוצאה";
    titleDiv.textContent = `${directionLabel} – ${tx.type}`;

    const subtitleDiv = document.createElement("div");
    subtitleDiv.className = "list-subtitle";
    const sign = tx.direction === "income" ? "+" : "-";
    subtitleDiv.textContent =
      `${sign}${formatCurrency(tx.amount)}` +
      (tx.note ? ` · ${tx.note}` : "");

    mainDiv.appendChild(titleDiv);
    mainDiv.appendChild(subtitleDiv);

    li.appendChild(timeDiv);
    li.appendChild(mainDiv);

    financeListEl.appendChild(li);
  });
}

function addFinanceTransaction(tx) {
  financeTransactions.push(tx);
  renderFinanceSummary();
  renderFinanceList();
}

if (financeForm) {
  financeForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const directionSelect = document.getElementById("financeDirection");
    const typeSelect = document.getElementById("financeType");
    const amountInput = document.getElementById("financeAmount");
    const dateInput = document.getElementById("financeDate");
    const noteInput = document.getElementById("financeNote");

    const direction = directionSelect.value;
    const type = typeSelect.value;
    const amount = Number(amountInput.value || 0);
    const dateValue = dateInput.value;
    const note = noteInput.value.trim();

    if (!amount || !dateValue) {
      alert("תכניס סכום ותאריך לפני שמירה.");
      return;
    }

    const tx = {
      direction,
      type,
      amount,
      date: dateValue,
      note,
    };

    addFinanceTransaction(tx);

    amountInput.value = "";
    noteInput.value = "";
  });
}

renderFinanceSummary();
renderFinanceList();
