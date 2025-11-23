// public/login.js

const API_BASE = "https://elad-mission-control-api.onrender.com";

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  if (!loginForm) {
    console.error("loginForm not found");
    return;
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");

    const email = emailInput ? emailInput.value.trim() : "";
    const password = passwordInput ? passwordInput.value.trim() : "";

    if (!email || !password) {
      alert("תכניס אימייל וסיסמה");
      return;
    }

    try {
      const payload = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      };

      // ניסיון ראשון: /api/login
      let res = await fetch(API_BASE + "/api/login", payload);
      if (res.status === 404) {
        // אם אין /api/login – נסה /api/auth/login
        res = await fetch(API_BASE + "/api/auth/login", payload);
      }

      let data;
      try {
        data = await res.json();
      } catch (e) {
        console.error("Login response is not JSON");
        alert("שגיאה בשרת, נסה שוב בעוד רגע");
        return;
      }

      if (!res.ok || !data.success) {
        alert(data.message || "אימייל או סיסמה שגויים");
        return;
      }

      const token = data.token || data.accessToken || data.jwt;
      if (!token) {
        alert("לא התקבל token מהשרת. בדוק את /api/login");
        console.error("Login response without token:", data);
        return;
      }

      localStorage.setItem("token", token);

      if (data.user) {
        localStorage.setItem("crmUser", JSON.stringify(data.user));
      }

      window.location.href = "index.html";
    } catch (err) {
      console.error("Login error:", err);
      alert("שגיאה בשרת, נסה שוב בעוד רגע");
    }
  });
});
