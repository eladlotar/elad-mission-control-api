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
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(data.message || "אימייל או סיסמה שגויים");
        return;
      }

      // שמירת המשתמש המחובר (אם נרצה להשתמש בעתיד)
      localStorage.setItem("crmUser", JSON.stringify(data.user));

      // מעבר לדשבורד
      window.location.href = "/index.html";
    } catch (err) {
      console.error("Login error:", err);
      alert("שגיאה בשרת, נסה שוב בעוד רגע");
    }
  });
}
