// public/app.js

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
    window.location.href = "login.html
