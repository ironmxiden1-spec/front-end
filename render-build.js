const fs = require("fs");

const configuredApiBase = String(process.env.API_BASE_URL || "").trim();
const apiBase = (configuredApiBase && !configuredApiBase.includes("wimps-api.onrender.com"))
	? configuredApiBase.replace(/\/$/, "")
	: "https://back-end-eryo.onrender.com/api";
const contents = `window.APP_CONFIG = window.APP_CONFIG || {};
window.APP_CONFIG.API_BASE = ${JSON.stringify(apiBase)};
window.wimsNotice = (message, type = "info") => {
	const notice = document.createElement("div");
	notice.className = \`wims-notice wims-notice-\${type}\`;
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
		return user?.authToken ? { Authorization: \`Bearer \${user.authToken}\` } : {};
	} catch (error) {
		return {};
	}
};
`;

fs.writeFileSync("config.js", contents);
