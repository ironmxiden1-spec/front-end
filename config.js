window.APP_CONFIG = window.APP_CONFIG || {};
window.APP_CONFIG.API_BASE = "https://back-end-eryo.onrender.com/api";
window.wimsNotice = (message, type = "info") => {
	const notice = document.createElement("div");
	notice.className = `wims-notice wims-notice-${type}`;
	notice.textContent = message;
	document.body.appendChild(notice);
	requestAnimationFrame(() => notice.classList.add("is-visible"));
	window.setTimeout(() => {
		notice.classList.remove("is-visible");
		window.setTimeout(() => notice.remove(), 250);
	}, 4500);
};
const noticeStyle = document.createElement("style");
noticeStyle.textContent = ".wims-notice{position:fixed;right:20px;bottom:20px;z-index:9999;max-width:min(380px,calc(100vw - 40px));padding:14px 18px;border-radius:10px;background:#172033;color:#fff;box-shadow:0 12px 30px #0003;font:600 14px/1.4 sans-serif;opacity:0;transform:translateY(12px);transition:opacity .25s,transform .25s}.wims-notice.is-visible{opacity:1;transform:translateY(0)}.wims-notice-success{background:#16794c}.wims-notice-error{background:#a83232}.wims-notice-warning{background:#9a6410}";
document.head.appendChild(noticeStyle);
window.wimpsAuthHeaders = () => {
	try {
		const user = JSON.parse(localStorage.getItem("user") || "null");
		return user?.authToken ? { Authorization: `Bearer ${user.authToken}` } : {};
	} catch (error) {
		return {};
	}
};
window.wimpsLogout = (message) => {
	localStorage.removeItem("user");
	localStorage.removeItem("accountStats");
	if (message) window.wimsNotice?.(message, "warning");
	window.setTimeout(() => { window.location.href = "./login-page.html?v=3#signup"; }, 250);
};
window.wimpsCheckSession = async () => {
	try {
		const rawUser = localStorage.getItem("user");
		const user = rawUser ? JSON.parse(rawUser) : null;
		if (!user?.authToken) return true;
		const configured = window.APP_CONFIG?.API_BASE;
		const apiBase = configured ? String(configured).replace(/\/$/, "") : (/localhost|127\.0\.0\.1/.test(window.location.hostname) ? "http://localhost:5000/api" : "/api");
		const response = await fetch(`${apiBase}/auth/session`, { headers: window.wimpsAuthHeaders() });
		if (response.status === 401) {
			const data = await response.json().catch(() => ({}));
			window.wimpsLogout(data.msg || "Your account was deleted. Create a new account to continue.");
			return false;
		}
		return response.ok;
	} catch (error) {
		return true;
	}
};
document.addEventListener("DOMContentLoaded", () => window.wimpsCheckSession());
