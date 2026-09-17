const fs = require("fs");

const configuredApiBase = String(process.env.API_BASE_URL || "").trim();
const apiBase = (configuredApiBase && !configuredApiBase.includes("wimps-api.onrender.com"))
	? configuredApiBase.replace(/\/$/, "")
	: "https://back-end-eryo.onrender.com/api";
const contents = `window.APP_CONFIG = window.APP_CONFIG || {};\nwindow.APP_CONFIG.API_BASE = ${JSON.stringify(apiBase)};\n`;

fs.writeFileSync("config.js", contents);
