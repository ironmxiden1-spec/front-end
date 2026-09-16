const fs = require("fs");

const apiBase = String(process.env.API_BASE_URL || "").replace(/\/$/, "");
const contents = `window.APP_CONFIG = window.APP_CONFIG || {};\nwindow.APP_CONFIG.API_BASE = ${JSON.stringify(apiBase)};\n`;

fs.writeFileSync("config.js", contents);
