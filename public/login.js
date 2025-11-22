document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  const errorBox = document.getElementById("loginError");

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    errorBox.style.display = "none";
    errorBox.textContent = "";

    if (!email || !password) {
      errorBox.textContent = "נא למלא אימייל וסיסמה";
      errorBox.style.display = "block";
      return;
    }

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        errorBox.textContent = data.message || "אימייל או סיסמה שגויים";
        errorBox.style.display = "block";
        return;
      }

      // שומרים את המשתמש המחובר בדפדפן
      localStorage.setItem("crmUser", JSON.stringify(data.user));

      // מעבר לדשבורד
      window.location.href = "/";
    } catch (err) {
      console.error(err);
      errorBox.textContent = "שגיאת תקשורת, נסה שוב עוד רגע";
      errorBox.style.display = "block";
    }
  });
});
