const API_BASE = "https://elad-mission-control-api.onrender.com";

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  if (!loginForm) return;

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
      const res = await fetch(API_BASE + "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data || !data.token) {
        alert((data && data.error) || "אימייל או סיסמה שגויים");
        return;
      }

      // שומרים את הטוקן שה-API נותן – זה מה ש-app.js מחפש
      localStorage.setItem("token", data.token);

      // אופציונלי – לשמור גם פרטי משתמש אם שרת מחזיר
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
});
