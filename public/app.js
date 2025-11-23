const API_BASE = "https://elad-mission-control-api.onrender.com";

// ===== Auth helpers =====

function getToken() {
  return localStorage.getItem("token");
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  if (!token) {
    throw new Error("אין התחברות, אנא התחבר מחדש");
  }

  const opts = {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
      ...(options.headers || {})
    }
  };

  if (options.body) {
    opts.body = JSON.stringify(options.body);
  }

  const res = await fetch(API_BASE + path, opts);
  let data;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }

  if (!res.ok) {
    const message =
      (data && data.error) ||
      (data && data.message) ||
      "פעולה נכשלה, נסה שוב";
    throw new Error(message);
  }

  return data;
}

// =====================
// ניווט ותפריט
// =====================

function setupNavigation() {
  const navItems = document.querySelectorAll(".nav-item");
  const sections = document.querySelectorAll(".section");
  const pageTitle = document.querySelector(".page-title");
  const pageSubtitle = document.querySelector(".page-subtitle");

  const titles = {
    dashboard: {
      title: "עמוד הבית",
      subtitle: "סקירה מהירה על העסק שלך"
    },
    calendar: {
      title: "יומן / לוח שנה",
      subtitle: "כל האימונים והקורסים במקום אחד"
    },
    clients: {
      title: "לקוחות",
      subtitle: "ניהול בסיס לקוחות"
    },
    leads: {
      title: "לידים / מתעניינים",
      subtitle: "ניהול פניות חדשות ומעקב סגירה"
    },
    courses: {
      title: "קורסים",
      subtitle: "ניהול מחזורים ותאריכים"
    },
    instructors: {
      title: "מדריכים",
      subtitle: "שיבוץ ומעקב מדריכים"
    },
    finance: {
      title: "פיננסים",
      subtitle: "הכנסות, הוצאות ורווחיות"
    },
    tasks: {
      title: "משימות",
      subtitle: "מה צריך לקרות השבוע"
    },
    reports: {
      title: "דוחות",
      subtitle: "תמונה מספרית על העסק"
    },
    settings: {
      title: "הגדרות מערכת",
      subtitle: "משתמשים, הרשאות, וקסטומיזציה"
    }
  };

  navItems.forEach((btn) => {
    btn.addEventListener("click", () => {
      const sectionId = btn.dataset.section;

      navItems.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      sections.forEach((sec) => {
        if (sec.id === sectionId) {
          sec.classList.add("active");
        } else {
          sec.classList.remove("active");
        }
      });

      if (titles[sectionId]) {
        pageTitle.textContent = titles[sectionId].title;
        pageSubtitle.textContent = titles[sectionId].subtitle;
      }
    });
  });
}

function setupLogout() {
  const logoutBtn = document.getElementById("logoutBtn");
  if (!logoutBtn) return;

  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("token");
    localStorage.removeItem("crmUser");
    window.location.href = "login.html";
  });
}

// =====================
// פיננסים
// =====================

let financeItems = [];

async function loadFinance() {
  try {
    const data = await apiFetch("/api/finance");
    financeItems = data || [];
    renderFinance();
  } catch (err) {
    console.error(err);
    alert("שגיאה בטעינת נתונים פיננסיים: " + err.message);
  }
}

function renderFinance() {
  const listEl = document.getElementById("financeList");
  const totalIncomeEl = document.getElementById("totalIncome");
  const totalExpenseEl = document.getElementById("totalExpense");
  const netProfitEl = document.getElementById("netProfit");
  const incomeCountLabel = document.getElementById("incomeCountLabel");
  const expenseCountLabel = document.getElementById("expenseCountLabel");
  const profitMarginLabel = document.getElementById("profitMarginLabel");

  if (!listEl) return;

  listEl.innerHTML = "";

  let incomeSum = 0;
  let incomeCount = 0;
  let expenseSum = 0;
  let expenseCount = 0;

  financeItems.forEach((item) => {
    if (item.direction === "income") {
      incomeSum += Number(item.amount) || 0;
      incomeCount++;
    } else if (item.direction === "expense") {
      expenseSum += Number(item.amount) || 0;
      expenseCount++;
    }

    const li = document.createElement("li");
    li.className = "list-item";
    const dateStr = item.date ? item.date.slice(0, 10) : "";
    li.textContent =
      `${dateStr} • ${item.direction === "income" ? "הכנסה" : "הוצאה"} • ${item.type} • ₪${item.amount} • ${item.note || ""}`;
    listEl.appendChild(li);
  });

  const net = incomeSum - expenseSum;
  const margin = incomeSum > 0 ? Math.round((net / incomeSum) * 100) : 0;

  if (totalIncomeEl) totalIncomeEl.textContent = "₪ " + incomeSum.toLocaleString("he-IL");
  if (totalExpenseEl) totalExpenseEl.textContent = "₪ " + expenseSum.toLocaleString("he-IL");
  if (netProfitEl) netProfitEl.textContent = "₪ " + net.toLocaleString("he-IL");
  if (incomeCountLabel) incomeCountLabel.textContent = incomeCount + " תנועות הכנסה";
  if (expenseCountLabel) expenseCountLabel.textContent = expenseCount + " תנועות הוצאה";
  if (profitMarginLabel) profitMarginLabel.textContent = margin + "% מרווחיות";
}

function setupFinanceForm() {
  const form = document.getElementById("financeForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const direction = document.getElementById("financeDirection").value;
    const type = document.getElementById("financeType").value;
    const amount = document.getElementById("financeAmount").value;
    const date = document.getElementById("financeDate").value;
    const note = document.getElementById("financeNote").value;

    if (!direction || !type || !amount || !date) {
      alert("חסר מידע חובה (סוג, סכום, תאריך)");
      return;
    }

    try {
      await apiFetch("/api/finance", {
        method: "POST",
        body: {
          direction,
          type,
          amount: Number(amount),
          date,
          note
        }
      });

      form.reset();
      await loadFinance();
      alert("התנועה נשמרה בהצלחה");
    } catch (err) {
      console.error(err);
      alert("שגיאה בשמירת תנועה: " + err.message);
    }
  });
}

// =====================
// יומן
// =====================

let calendarEvents = [];
let currentMonth = new Date();

function setupCalendarControls() {
  const prevBtn = document.getElementById("prevMonthBtn");
  const nextBtn = document.getElementById("nextMonthBtn");

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      currentMonth.setMonth(currentMonth.getMonth() - 1);
      renderCalendar();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      currentMonth.setMonth(currentMonth.getMonth() + 1);
      renderCalendar();
    });
  }
}

async function loadCalendarEvents() {
  try {
    const data = await apiFetch("/api/calendar");
    calendarEvents = data || [];
  } catch (err) {
    console.error(err);
    alert("שגיאה בטעינת היומן: " + err.message);
  }
  renderCalendar();
}

function renderCalendar() {
  const titleEl = document.getElementById("calendarTitle");
  const gridEl = document.getElementById("calendarGrid");
  if (!titleEl || !gridEl) return;

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

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
    "דצמבר"
  ];

  titleEl.textContent = monthNames[month] + " " + year;

  const firstDay = new Date(year, month, 1);
  const startWeekDay = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  gridEl.innerHTML = "";

  for (let i = 0; i < startWeekDay; i++) {
    const emptyCell = document.createElement("div");
    emptyCell.className = "calendar-cell empty";
    gridEl.appendChild(emptyCell);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const cell = document.createElement("div");
    cell.className = "calendar-cell";
    const dateStr = new Date(year, month, day).toISOString().slice(0, 10);

    const dayEvents = calendarEvents.filter((ev) => {
      return ev.date && ev.date.slice(0, 10) === dateStr;
    });

    const dayNumber = document.createElement("div");
    dayNumber.className = "calendar-day-number";
    dayNumber.textContent = day;
    cell.appendChild(dayNumber);

    if (dayEvents.length > 0) {
      const eventsContainer = document.createElement("div");
      eventsContainer.className = "calendar-events";

      dayEvents.forEach((ev) => {
        const tag = document.createElement("div");
        tag.className = "calendar-event-tag";
        tag.textContent =
          (ev.event_type === "course" ? "קורס" : "אימון") +
          " – " +
          (ev.title || "");
        eventsContainer.appendChild(tag);
      });

      cell.appendChild(eventsContainer);
    }

    gridEl.appendChild(cell);
  }
}

function setupEventForm() {
  const form = document.getElementById("eventForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const eventType = document.getElementById("eventType").value;
    const title = document.getElementById("eventTitle").value;
    const date = document.getElementById("eventDate").value;

    if (!eventType || !title || !date) {
      alert("חסר סוג, שם או תאריך");
      return;
    }

    try {
      await apiFetch("/api/calendar", {
        method: "POST",
        body: { event_type: eventType, title, date }
      });

      form.reset();
      await loadCalendarEvents();
      alert("האירוע נשמר ביומן");
    } catch (err) {
      console.error(err);
      alert("שגיאה בשמירת אירוע: " + err.message);
    }
  });
}

// =====================
// לידים
// =====================

let leads = [];

async function loadLeadHandlers() {
  try {
    const users = await apiFetch("/api/users");
    const select = document.getElementById("leadHandlerSelect");
    if (!select) return;

    select.innerHTML = "";
    const defaultOpt = document.createElement("option");
    defaultOpt.value = "";
    defaultOpt.textContent = "בחר גורם מטפל";
    select.appendChild(defaultOpt);

    users.forEach((u) => {
      const opt = document.createElement("option");
      opt.value = u.id;
      opt.textContent = u.email + (u.role === "admin" ? " (Admin)" : "");
      select.appendChild(opt);
    });
  } catch (err) {
    console.error("שגיאה בטעינת משתמשים:", err);
  }
}

async function loadLeads() {
  try {
    const data = await apiFetch("/api/leads");
    leads = data || [];
    renderLeads();
  } catch (err) {
    console.error(err);
    alert("שגיאה בטעינת לידים: " + err.message);
  }
}

function renderLeads() {
  const listEl = document.getElementById("leadList");
  if (!listEl) return;

  listEl.innerHTML = "";

  leads.forEach((lead) => {
    const li = document.createElement("li");
    li.className = "list-item";

    const mainLine = document.createElement("div");
    mainLine.textContent =
      (lead.full_name || "ללא שם") +
      " • " +
      (lead.phone || "") +
      " • " +
      (lead.status || "");

    const subLine = document.createElement("div");
    subLine.className = "list-item-sub";
    const handler =
      lead.handler_email ? "גורם מטפל: " + lead.handler_email + " • " : "";
    const src = lead.source ? "מקור: " + lead.source + " • " : "";
    const created =
      lead.created_at && typeof lead.created_at === "string"
        ? lead.created_at.slice(0, 10)
        : "";
    subLine.textContent =
      handler +
      src +
      (created ? "נוצר: " + created + " • " : "") +
      (lead.note || "");

    const actions = document.createElement("div");
    actions.className = "list-item-actions";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "btn-text";
    editBtn.textContent = "עריכה";
    editBtn.addEventListener("click", () => {
      fillLeadFormForEdit(lead);
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "btn-text danger";
    deleteBtn.textContent = "מחיקה";
    deleteBtn.addEventListener("click", () => {
      deleteLead(lead.id);
    });

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    li.appendChild(mainLine);
    li.appendChild(subLine);
    li.appendChild(actions);

    listEl.appendChild(li);
  });
}

function clearLeadForm() {
  const idEl = document.getElementById("leadId");
  const nameEl = document.getElementById("leadName");
  const phoneEl = document.getElementById("leadPhone");
  const emailEl = document.getElementById("leadEmail");
  const sourceEl = document.getElementById("leadSource");
  const statusEl = document.getElementById("leadStatusSelect");
  const noteEl = document.getElementById("leadNote");
  const handlerSelect = document.getElementById("leadHandlerSelect");
  const submitBtn = document.getElementById("leadSubmitBtn");

  if (idEl) idEl.value = "";
  if (nameEl) nameEl.value = "";
  if (phoneEl) phoneEl.value = "";
  if (emailEl) emailEl.value = "";
  if (sourceEl) sourceEl.value = "";
  if (statusEl) statusEl.value = "לא ענה פעם 1";
  if (noteEl) noteEl.value = "";
  if (handlerSelect) handlerSelect.value = "";
  if (submitBtn) submitBtn.textContent = "שמור ליד";
}

function fillLeadFormForEdit(lead) {
  const idEl = document.getElementById("leadId");
  const nameEl = document.getElementById("leadName");
  const phoneEl = document.getElementById("leadPhone");
  const emailEl = document.getElementById("leadEmail");
  const sourceEl = document.getElementById("leadSource");
  const statusEl = document.getElementById("leadStatusSelect");
  const noteEl = document.getElementById("leadNote");
  const handlerSelect = document.getElementById("leadHandlerSelect");
  const submitBtn = document.getElementById("leadSubmitBtn");

  if (idEl) idEl.value = lead.id;
  if (nameEl) nameEl.value = lead.full_name || "";
  if (phoneEl) phoneEl.value = lead.phone || "";
  if (emailEl) emailEl.value = lead.email || "";
  if (sourceEl) sourceEl.value = lead.source || "";
  if (statusEl) statusEl.value = lead.status || "לא ענה פעם 1";
  if (noteEl) noteEl.value = lead.note || "";
  if (handlerSelect && lead.handler_user_id) {
    handlerSelect.value = String(lead.handler_user_id);
  }
  if (submitBtn) submitBtn.textContent = "עדכן ליד";
}

async function deleteLead(id) {
  if (!confirm("למחוק את הליד הזה?")) return;

  try {
    await apiFetch("/api/leads/" + id, { method: "DELETE" });
    await loadLeads();
    alert("הליד נמחק");
  } catch (err) {
    console.error(err);
    alert("שגיאה במחיקה: " + err.message);
  }
}

function setupLeadForm() {
  const form = document.getElementById("leadForm");
  const resetBtn = document.getElementById("leadResetBtn");
  if (!form) return;

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      clearLeadForm();
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const idEl = document.getElementById("leadId");
    const nameEl = document.getElementById("leadName");
    const phoneEl = document.getElementById("leadPhone");
    const emailEl = document.getElementById("leadEmail");
    const sourceEl = document.getElementById("leadSource");
    const statusEl = document.getElementById("leadStatusSelect");
    const handlerSelect = document.getElementById("leadHandlerSelect");
    const noteEl = document.getElementById("leadNote");

    const id = idEl ? idEl.value : "";
    const full_name = nameEl ? nameEl.value.trim() : "";
    const phone = phoneEl ? phoneEl.value.trim() : "";
    const email = emailEl ? emailEl.value.trim() : "";
    const source = sourceEl ? sourceEl.value.trim() : "";
    const status = statusEl ? statusEl.value : "";
    const handler_user_id = handlerSelect ? handlerSelect.value : "";
    const note = noteEl ? noteEl.value.trim() : "";

    if (!full_name) {
      alert("שם מלא חובה");
      return;
    }
    if (!status) {
      alert("סטטוס חובה");
      return;
    }

    const payload = {
      full_name,
      phone: phone || null,
      email: email || null,
      source: source || null,
      status,
      handler_user_id: handler_user_id ? Number(handler_user_id) : null,
      note: note || null
    };

    try {
      if (id) {
        await apiFetch("/api/leads/" + id, { method: "PUT", body: payload });
        alert("הליד עודכן");
      } else {
        await apiFetch("/api/leads", { method: "POST", body: payload });
        alert("ליד חדש נשמר");
      }

      clearLeadForm();
      await loadLeads();
    } catch (err) {
      console.error(err);
      alert("שגיאה בשמירת ליד: " + err.message);
    }
  });
}

// =====================
// גיבוי ידני
// =====================

function setupBackupButton() {
  const btn = document.getElementById("manualBackupBtn");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    try {
      const token = getToken();
      if (!token) {
        alert("אין התחברות, אנא התחבר מחדש");
        return;
      }

      const res = await fetch(API_BASE + "/api/backup/export", {
        headers: {
          Authorization: "Bearer " + token
        }
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const msg =
          (data && data.error) || "שגיאה בהורדת גיבוי, נסה שוב מאוחר יותר";
        throw new Error(msg);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "elad_crm_backup.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("שגיאה בהורדת גיבוי: " + err.message);
    }
  });
}

// =====================
// Init
// =====================

document.addEventListener("DOMContentLoaded", async () => {
  console.log("DOM loaded, init app.js");

  setupNavigation();
  setupLogout();
  setupFinanceForm();
  setupCalendarControls();
  setupEventForm();
  setupLeadForm();
  setupBackupButton();

  try {
    await Promise.all([
      loadFinance(),
      loadCalendarEvents(),
      loadLeadHandlers(),
      loadLeads()
    ]);
  } catch (err) {
    console.error("Init data load error:", err);
  }
});
