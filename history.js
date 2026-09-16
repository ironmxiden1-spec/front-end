// history.js (FINAL CLEAN VERSION)

const API_BASE = (() => {
    const configured = window.APP_CONFIG && window.APP_CONFIG.API_BASE;
    if (configured) {
        return String(configured).replace(/\/$/, "");
    }

    return /localhost|127\.0\.0\.1/.test(window.location.hostname)
        ? "http://localhost:5000/api"
        : "/api";
})();

let allTransactions = [];
let filteredTransactions = [];
let currentPage = 1;
const itemsPerPage = 10;

document.addEventListener("DOMContentLoaded", init);

// ==========================
// INIT
// ==========================
function init() {
    const user = getUser();

    if (!user || !user.email) {
        toggleView(false);
        return;
    }

    toggleView(true);
    setupEventListeners();
    loadTransactions(user.email);
}

function getUser() {
    return JSON.parse(localStorage.getItem("user"));
}

function toggleView(isLoggedIn) {
    document.getElementById("not-logged-in").style.display = isLoggedIn ? "none" : "block";
    document.getElementById("history-content").style.display = isLoggedIn ? "block" : "none";
}

// ==========================
// LOAD DATA (FIXED)
// ==========================
async function loadTransactions(email) {
    try {
        const res = await fetch(`${API_BASE}/transactions/${email}`);

        if (!res.ok) throw new Error("API failed");

        const data = await res.json();
        const list = Array.isArray(data) ? data : data.transactions;

        // ✅ MAP BACKEND → FRONTEND FORMAT
        allTransactions = (list || []).map(tx => ({
            id: tx._id,
            bundleType: tx.type === "deposit"
                ? "deposit"
                : (tx.bundle || "purchase"),
            bundle: tx.bundle,
            amount: tx.amount,
            recipient: tx.phone,
            status: (tx.status || "completed").toLowerCase(),
            date: tx.date,
            paymentMethod: tx.paymentMethod || "wallet"
        }))
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    } catch (err) {
        console.error("Transaction load failed:", err);
        allTransactions = [];
    }

    filteredTransactions = [...allTransactions];

    handleEmptyState();
    renderTransactions();
    updateStats();
}

// ==========================
// EMPTY STATE
// ==========================
function handleEmptyState() {
    const empty = document.getElementById("empty-state");
    const table = document.querySelector(".table-responsive");

    if (allTransactions.length === 0) {
        table.style.display = "none";
        empty.style.display = "flex";
    } else {
        table.style.display = "block";
        empty.style.display = "none";
    }
}

// ==========================
// RENDER TABLE
// ==========================
function renderTransactions() {
    const tbody = document.getElementById("transactions-body");
    tbody.innerHTML = "";

    const start = (currentPage - 1) * itemsPerPage;
    const pageData = filteredTransactions.slice(start, start + itemsPerPage);

    pageData.forEach(tx => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${tx.id}</td>
            <td>${capitalize(tx.bundleType)}</td>
            <td>GHS ${Number(tx.amount).toFixed(2)}</td>
            <td>${formatDate(tx.date)}</td>
            <td>
                <span class="status-badge ${tx.status}">
                    ${capitalize(tx.status)}
                </span>
            </td>
            <td>
                <button class="action-btn view-btn" onclick="openModal('${tx.id}')">
                    <i class="fas fa-eye"></i> View
                </button>
            </td>
        `;

        tbody.appendChild(row);
    });

    updatePagination();
}

// ==========================
// STATS
// ==========================
function updateStats() {
    const completed = filteredTransactions.filter(t => t.status === "completed");
    const pending = filteredTransactions.filter(t => t.status === "pending");

    const totalSpent = completed.reduce((sum, t) => sum + Number(t.amount), 0);

    document.getElementById("total-purchases").textContent = filteredTransactions.length;
    document.getElementById("completed-count").textContent = completed.length;
    document.getElementById("pending-count").textContent = pending.length;
    document.getElementById("total-spent").textContent = "GHS " + totalSpent.toFixed(2);
}

// ==========================
// FILTERS
// ==========================
function applyFilters() {
    const search = document.getElementById("search-input").value.toLowerCase();
    const status = document.getElementById("filter-status").value;
    const type = document.getElementById("filter-type").value;
    const period = document.getElementById("filter-period").value;

    filteredTransactions = allTransactions.filter(tx => {
        const matchesSearch =
            !search ||
            tx.id.toLowerCase().includes(search) ||
            (tx.bundleType || "").toLowerCase().includes(search) ||
            (tx.recipient || "").toLowerCase().includes(search);

        const matchesStatus =
            !status || tx.status === status;

        const matchesType =
            !type || (tx.bundleType || "").toLowerCase().includes(type);

        let matchesPeriod = true;
        if (period) {
            const days = (new Date() - new Date(tx.date)) / (1000 * 60 * 60 * 24);
            matchesPeriod = days <= parseInt(period);
        }

        return matchesSearch && matchesStatus && matchesType && matchesPeriod;
    });

    currentPage = 1;
    renderTransactions();
    updateStats();
}

// ==========================
// PAGINATION
// ==========================
function updatePagination() {
    const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
    const container = document.getElementById("page-numbers");

    container.innerHTML = "";

    if (totalPages <= 1) {
        document.getElementById("pagination").style.display = "none";
        return;
    }

    document.getElementById("pagination").style.display = "flex";

    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement("button");
        btn.textContent = i;
        btn.className = i === currentPage ? "page-number active" : "page-number";
        btn.onclick = () => {
            currentPage = i;
            renderTransactions();
        };
        container.appendChild(btn);
    }

    document.getElementById("prev-btn").disabled = currentPage === 1;
    document.getElementById("next-btn").disabled = currentPage === totalPages;
}

// ==========================
// MODAL (FIXED)
// ==========================
function openModal(id) {
    const tx = allTransactions.find(t => t.id === id);
    if (!tx) return;

    document.getElementById("modal-transaction-id").textContent = tx.id;
    document.getElementById("modal-bundle-type").textContent = tx.bundleType;
    document.getElementById("modal-amount").textContent = "GHS " + Number(tx.amount).toFixed(2);
    document.getElementById("modal-status").textContent = capitalize(tx.status);
    document.getElementById("modal-date").textContent = new Date(tx.date).toLocaleString();
    document.getElementById("modal-recipient").textContent = tx.recipient || "N/A";
    document.getElementById("modal-bundle-details").textContent = tx.bundle || "N/A";
    document.getElementById("modal-payment-method").textContent = tx.paymentMethod || "N/A";

    document.getElementById("transaction-modal").style.display = "flex";
}

function closeModal() {
    document.getElementById("transaction-modal").style.display = "none";
}

// ==========================
// EVENTS
// ==========================
function setupEventListeners() {
    document.getElementById("search-input").addEventListener("input", applyFilters);
    document.getElementById("filter-status").addEventListener("change", applyFilters);
    document.getElementById("filter-type").addEventListener("change", applyFilters);
    document.getElementById("filter-period").addEventListener("change", applyFilters);

    document.getElementById("prev-btn").onclick = () => {
        if (currentPage > 1) {
            currentPage--;
            renderTransactions();
        }
    };

    document.getElementById("next-btn").onclick = () => {
        const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderTransactions();
        }
    };

    document.getElementById("modal-close").onclick = closeModal;
    document.getElementById("modal-close-btn").onclick = closeModal;
}

// ==========================
// HELPERS
// ==========================
function capitalize(text = "") {
    return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatDate(date) {
    return new Date(date).toLocaleDateString();
}