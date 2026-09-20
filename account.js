// account.js

const API_BASE = (() => {
    const configured = window.APP_CONFIG && window.APP_CONFIG.API_BASE;
    if (configured) {
        return String(configured).replace(/\/$/, "");
    }

    return /localhost|127\.0\.0\.1/.test(window.location.hostname)
        ? "http://localhost:5000/api"
        : "/api";
})();

document.addEventListener("DOMContentLoaded", async () => {
    if (window.wimpsCheckSession && !(await window.wimpsCheckSession())) return;
    initializeAccount();
    setupAccountDepositButton();
});

function getUser() {
    return JSON.parse(localStorage.getItem("user"));
}

function initializeAccount() {
    const user = getUser();

    const loggedInView = document.getElementById("logged-in");
    const notLoggedInView = document.getElementById("not-logged-in");

    if (!user || !user.email) {
        window.location.href = "./login-page.html?v=3#signup";
        return;
    }

    if (loggedInView) loggedInView.style.display = "block";
    if (notLoggedInView) notLoggedInView.style.display = "none";

    populateAccountInfo(user);
    setupReferral(user);
    setupProfileUpload(user);
    loadAccountData(user.email);
    setupLogout();
}

function setupReferral(user) {
    const code = user.referralCode || `WIMPS-${String(user.id || user.email).replace(/[^a-z0-9]/gi, '').slice(-8).toUpperCase()}`;
    const link = `${window.location.origin}/login-page.html?ref=${encodeURIComponent(code)}#signup`;
    const linkInput = document.getElementById('referral-link');
    const count = document.getElementById('referral-count');
    if (linkInput) linkInput.value = link;
    if (count) count.textContent = `${Number(user.referralCount || 0)} referrals`;
    document.getElementById('copy-referral-link')?.addEventListener('click', async () => {
        await navigator.clipboard?.writeText(link);
        window.wimsNotice?.('Referral link copied.', 'success');
    });
}

function setupProfileUpload(user) {
    const uploadInput = document.getElementById("profile-upload");
    const uploadButton = document.getElementById("upload-btn");
    const pictureContainer = document.getElementById("picture-container");
    const picture = document.getElementById("profile-picture");

    if (!uploadInput || !picture || !user?.email) return;

    const savedPicture = localStorage.getItem(`profilePicture:${user.email}`);
    if (savedPicture) renderProfilePicture(savedPicture, picture);

    const openFilePicker = () => uploadInput.click();
    uploadButton?.addEventListener("click", openFilePicker);
    pictureContainer?.addEventListener("click", openFilePicker);

    uploadInput.addEventListener("change", () => {
        const [file] = uploadInput.files || [];
        if (!file || !file.type.startsWith("image/")) return;

        const reader = new FileReader();
        reader.addEventListener("load", () => {
            const imageData = String(reader.result);
            localStorage.setItem(`profilePicture:${user.email}`, imageData);
            renderProfilePicture(imageData, picture);
        });
        reader.readAsDataURL(file);
    });
}

function renderProfilePicture(imageData, picture) {
    picture.innerHTML = "";
    const image = document.createElement("img");
    image.src = imageData;
    image.alt = "Profile picture";
    picture.appendChild(image);
}

// ==========================
// BASIC INFO
// ==========================
function populateAccountInfo(user) {
    const fullname = document.getElementById("fullname");
    const email = document.getElementById("email");
    const memberSince = document.getElementById("member-since");

    if (fullname) fullname.value = user.fullname || "";
    if (email) email.value = user.email || "";

    if (memberSince && user.createdAt) {
        memberSince.value = new Date(user.createdAt).toLocaleDateString();
    }
}

// ==========================
// LOAD DATA
// ==========================
async function loadAccountData(email) {
    try {
        // ===== WALLET =====
        const walletRes = await fetch(`${API_BASE}/wallet/${email}`, {
            headers: window.wimpsAuthHeaders()
        });

        if (walletRes.status === 401) {
            window.wimpsLogout?.("Your account was deleted. Create a new account to continue.");
            return;
        }
        if (!walletRes.ok) throw new Error("Wallet request failed");

        const walletData = await walletRes.json();
        const balance = Number(walletData.balance || 0);

        const balanceEl = document.getElementById("account-balance");
        if (balanceEl) {
            balanceEl.textContent = "GHS " + balance.toFixed(2);
        }

        // sync localStorage
        const user = getUser();
        user.balance = balance;
        localStorage.setItem("user", JSON.stringify(user));

        // ===== TRANSACTIONS =====
        const txRes = await fetch(`${API_BASE}/transactions/${email}`, {
            headers: window.wimpsAuthHeaders()
        });

        if (!txRes.ok) throw new Error("Transactions request failed");

        const transactions = await txRes.json();

        // TOTAL TRANSACTIONS
        const totalTxEl = document.getElementById("total-transactions");
        if (totalTxEl) {
            totalTxEl.textContent = transactions.length;
        }

        // TOTAL ORDERS (only purchases)
        const totalOrdersEl = document.getElementById("total-orders");
        const orders = transactions.filter(tx => tx.type === "purchase");

        if (totalOrdersEl) {
            totalOrdersEl.textContent = orders.length;
        }

        localStorage.setItem("accountStats", JSON.stringify({
            totalOrders: orders.length,
            totalTransactions: transactions.length,
            balance
        }));

        // (optional debug)
        console.log("Transactions:", transactions);

    } catch (err) {
        console.error("Account load error:", err);
    }
}

// ==========================
// LOGOUT
// ==========================
function setupAccountDepositButton() {
    const amountInput = document.getElementById("deposit-amount");
    const depositBtn = document.getElementById("account-deposit-paystack");

    if (!amountInput || !depositBtn) return;

    depositBtn.addEventListener("click", async () => {
        const amount = Number(amountInput.value);
        if (!Number.isFinite(amount) || amount < 10) {
            alert("Enter a valid amount: deposit GHS10 or more");
            return;
        }

        await openPaystackDeposit(amount);
    });
}

function setupLogout() {
    const logoutBtn = document.getElementById("logout-btn");

    if (!logoutBtn) return;

    logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("user");
        window.location.href = "login-page.html";
    });
}