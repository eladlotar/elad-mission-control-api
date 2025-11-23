// public/login.js

const API_BASE = "https://elad-mission-control-api.onrender.com";

const loginForm = document.getElementById("loginForm");

if (loginForm) {
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
      const res = await fetch(API_BASE + "/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(data.message || "אימייל או סיסמה שגויים");
        return;
      }

      // שומרים TOKEN למערכת
      if (data.token) {
        localStorage.setItem("token", data.token);
      }

      // שומרים את המשתמש (לא חובה, אבל טוב שיהיה)
      if (data.user) {
        localStorage.setItem("crmUser", JSON.stringify(data.user));
      }

      // מעבר לדשבורד
      window.location.href = "index.html";
    } catch (err) {
      console.error("Login error:", err);
      alert("שגיאה בשרת, נסה שוב בעוד רגע");
    }
  });
}
