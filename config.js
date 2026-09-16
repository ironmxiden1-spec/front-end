window.APP_CONFIG = window.APP_CONFIG || {};
window.APP_CONFIG.API_BASE = window.APP_CONFIG.API_BASE || "";
window.wimpsAuthHeaders = () => {
	try {
		const user = JSON.parse(localStorage.getItem("user") || "null");
		return user?.authToken ? { Authorization: `Bearer ${user.authToken}` } : {};
	} catch (error) {
		return {};
	}
};
