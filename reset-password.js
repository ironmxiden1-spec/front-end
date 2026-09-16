const resetApiBase = /localhost|127\.0\.0\.1/.test(window.location.hostname)
    ? "http://localhost:5000/api"
    : "/api";

const resetParams = new URLSearchParams(window.location.search);
const resetForm = document.getElementById("resetPasswordForm");

resetForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const password = document.getElementById("new-password").value;
    const confirmation = document.getElementById("confirm-password").value;
    const email = resetParams.get("email");
    const token = resetParams.get("token");

    if (!email || !token) return alert("This reset link is incomplete or invalid");
    if (password.length < 6) return alert("Password must be at least 6 characters");
    if (password !== confirmation) return alert("Passwords do not match");

    try {
        const response = await fetch(`${resetApiBase}/auth/reset-password`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, token, password })
        });
        const data = await response.json();
        if (!response.ok) return alert(data.msg || "Unable to change password");
        alert(data.msg || "Password changed successfully");
        window.location.href = "login-page.html";
    } catch (error) {
        console.error(error);
        alert("Unable to change password right now");
    }
});