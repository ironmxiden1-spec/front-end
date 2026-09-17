(() => {
    const sidebar = document.getElementById("sidebar");
    const scrim = document.getElementById("sidebar-scrim");
    const toast = document.getElementById("toast");
    const title = document.getElementById("view-title");
    const navLinks = [...document.querySelectorAll("[data-view]")];
    const panels = [...document.querySelectorAll("[data-panel]")];
    let toastTimer;
    let comparisonPlans = [];
    let loadedOrders = [];
    const adminApiBase = window.APP_CONFIG?.API_BASE || ((/localhost|127\.0\.0\.1/.test(window.location.hostname) || window.location.protocol === "file:") ? "http://localhost:5000/api" : "/api");
    let adminToken = sessionStorage.getItem("wimps-admin-token") || "";

    const labels = {
        dashboard: "Dashboard", orders: "Orders", bulk: "Bulk Purchase", comparison: "Provider Comparison",
        providers: "Providers", wallets: "Provider Wallets", customers: "Customers", payments: "Payments",
        pricing: "Pricing", reports: "Profit & Reports", logs: "API & Webhook Logs", settings: "Settings", audit: "Audit Logs"
    };

    function showToast(message) {
        toast.textContent = message;
        toast.classList.add("show");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
    }

    function closeSidebar() {
        sidebar.classList.remove("open");
        scrim.classList.remove("open");
    }

    function openView(view) {
        const selected = labels[view] ? view : "dashboard";
        panels.forEach((panel) => panel.classList.toggle("active", panel.dataset.panel === selected));
        navLinks.forEach((link) => link.classList.toggle("active", link.dataset.view === selected));
        title.textContent = labels[selected];
        history.replaceState(null, "", `#${selected}`);
        closeSidebar();
        window.scrollTo({ top: 0, behavior: "smooth" });
        if (adminToken && selected === "comparison") loadComparison().catch((error) => showToast(error.message));
        if (adminToken && selected === "orders") loadOrders().catch((error) => showToast(error.message));
        if (adminToken && selected === "payments") loadPayments().catch((error) => showToast(error.message));
    }

    document.querySelectorAll("[data-view]").forEach((element) => {
        element.addEventListener("click", (event) => {
            const view = element.dataset.view;
            if (!view) return;
            event.preventDefault();
            openView(view);
        });
    });

    document.getElementById("menu-toggle")?.addEventListener("click", () => {
        sidebar.classList.add("open");
        scrim.classList.add("open");
    });
    document.getElementById("sidebar-close")?.addEventListener("click", closeSidebar);
    scrim?.addEventListener("click", closeSidebar);
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closeSidebar();
    });

    document.getElementById("theme-toggle")?.addEventListener("click", () => {
        document.body.classList.toggle("dark");
        localStorage.setItem("wimps-admin-theme", document.body.classList.contains("dark") ? "dark" : "light");
    });

    document.querySelectorAll("[data-action]").forEach((button) => {
        button.addEventListener("click", () => {
            const action = button.dataset.action;
            if (action === "refresh" || action === "test-providers") adminToken ? loadAdminData(adminToken).then(() => showToast("Admin data refreshed.")).catch((error) => showToast(error.message)) : showToast("Connect the admin API first.");
            if (action === "save-settings") saveSettings();
            if (action === "validate-bulk") validateBulk();
            if (action === "export-orders") exportOrders();
            if (action === "export") showToast("Reports export requires a verified report endpoint.");
            if (action === "toast") showToast("Keep provider and payment secrets in the server .env file.");
        });
    });

    document.getElementById("logout-button")?.addEventListener("click", () => {
        adminToken = "";
        sessionStorage.removeItem("wimps-admin-token");
        document.getElementById("connect-api-button").textContent = "Connect API";
        showToast("Admin API disconnected.");
    });
    document.getElementById("notification-button")?.addEventListener("click", () => {
        openView("providers");
        showToast("Provider alerts opened.");
    });
    document.getElementById("profile-button")?.addEventListener("click", () => {
        showToast(adminToken ? "Admin API connected for this session." : "Admin API is not connected.");
    });
    const apiDialog = document.getElementById("api-dialog");
    const apiTokenInput = document.getElementById("admin-api-token");
    const apiDialogError = document.getElementById("api-dialog-error");
    function openApiDialog() {
        apiDialog?.classList.add("open");
        apiDialog?.setAttribute("aria-hidden", "false");
        if (apiTokenInput) { apiTokenInput.value = ""; apiTokenInput.focus(); }
    }
    function closeApiDialog() {
        apiDialog?.classList.remove("open");
        apiDialog?.setAttribute("aria-hidden", "true");
    }
    document.getElementById("connect-api-button")?.addEventListener("click", openApiDialog);
    document.getElementById("api-dialog-close")?.addEventListener("click", closeApiDialog);
    document.getElementById("api-dialog-cancel")?.addEventListener("click", closeApiDialog);
    document.getElementById("api-dialog-submit")?.addEventListener("click", async () => {
        const token = apiTokenInput?.value.trim();
        if (!token) { if (apiDialogError) apiDialogError.textContent = "Enter your admin API token."; return; }
        if (apiDialogError) apiDialogError.textContent = "Connecting...";
        try {
            await loadCustomerCount(token);
            closeApiDialog();
            document.getElementById("connect-api-button").textContent = "API connected";
        } catch (error) {
            if (apiDialogError) apiDialogError.textContent = error.message || "Connection failed.";
        }
    });
    document.getElementById("global-search")?.addEventListener("keydown", (event) => {
        if (event.key === "Enter") showToast(`Search is waiting for the admin orders API: ${event.currentTarget.value || "all records"}`);
    });
    document.getElementById("comparison-network")?.addEventListener("change", renderComparison);
    document.getElementById("comparison-volume")?.addEventListener("change", renderComparison);
    document.getElementById("orders-search")?.addEventListener("input", renderOrders);
    document.getElementById("orders-status")?.addEventListener("change", renderOrders);
    document.getElementById("orders-network")?.addEventListener("change", renderOrders);
    document.getElementById("bulk-network")?.addEventListener("change", loadBulkBundles);

    async function loadAdminData(token) {
        adminToken = token;
        sessionStorage.setItem("wimps-admin-token", token);
        await waitForAdminBackend();
        const sources = [
            ["overview", loadOverview()], ["providers", loadProviders()], ["comparison", loadComparison()],
            ["orders", loadOrders()], ["customers", loadCustomers()], ["settings", loadSettings()],
            ["bulk bundles", loadBulkBundles()], ["payments", loadPayments()]
        ];
        const results = await Promise.allSettled(sources.map(([, request]) => request));
        const failed = results.map((result, index) => ({ result, name: sources[index][0] })).filter(({ result }) => result.status === "rejected");
        if (failed.length) showToast(`Unavailable: ${failed.map(({ name }) => name).join(", ")}`);
        return { failed, total: results.length };
    }

    async function waitForAdminBackend() {
        let lastError = "Backend is starting...";
        for (let attempt = 0; attempt < 15; attempt += 1) {
            try {
                const response = await fetch(`${adminApiBase}/admin/providers`, { headers: { "X-Admin-Token": adminToken } });
                if (response.ok) return;
                const payload = await response.json().catch(() => ({}));
                lastError = payload.msg || `Backend returned HTTP ${response.status}`;
            } catch (error) {
                lastError = "Backend is still starting...";
            }
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        throw new Error(`${lastError} Start the backend with npm start and try again.`);
    }

    async function loadOverview() {
        const response = await fetch(`${adminApiBase}/admin/overview`, { headers: { "X-Admin-Token": adminToken } });
        const data = await response.json();
        if (!response.ok) throw new Error(data.msg || "Admin request failed");
        const money = (value) => `GH₵ ${Number(value || 0).toFixed(2)}`;
        document.getElementById("today-sales").textContent = money(data.todaySales);
        document.getElementById("today-profit").textContent = money(data.todayProfit);
        document.getElementById("today-orders").textContent = Number(data.todayOrders || 0).toLocaleString();
        document.getElementById("successful-orders").textContent = Number(data.successfulOrders || 0).toLocaleString();
        document.getElementById("pending-orders").textContent = Number(data.pendingOrders || 0).toLocaleString();
        document.getElementById("failed-orders").textContent = Number(data.failedOrders || 0).toLocaleString();
        document.getElementById("total-users-value").textContent = Number(data.totalUsers || 0).toLocaleString();
        document.getElementById("total-users-status").textContent = "Registered customers";
        document.getElementById("connect-users-button")?.remove();
    }

    async function loadProviders() {
        const response = await fetch(`${adminApiBase}/admin/providers`, { headers: { "X-Admin-Token": adminToken } });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.msg || "Unable to load providers");
        const statusById = Object.fromEntries((payload.providers || []).map((provider) => [provider.id, provider]));
        document.querySelectorAll(".provider-card").forEach((card) => {
            const name = card.querySelector("h2")?.textContent?.toLowerCase() || "";
            const provider = name.includes("reseller") ? statusById.resellerxpress : name.includes("rema") ? statusById.remadata : statusById.sendcomms;
            if (!provider) return;
            const connection = card.querySelector(".connection");
            if (connection) { connection.textContent = provider.configured ? "Connected" : "Not configured"; connection.className = `connection ${provider.configured ? "online" : "offline"}`; }
            const details = [...card.querySelectorAll("dd")];
            if (details[0]) details[0].textContent = provider.configured ? "Configured" : "Missing";
            if (details[1]) details[1].textContent = provider.balanceUnavailable ? "Unavailable via API" : Number.isFinite(provider.balance) ? `GH₵ ${provider.balance.toFixed(2)}` : provider.error ? "Temporarily unavailable" : "Unavailable";
        });
        const balancesResponse = await fetch(`${adminApiBase}/admin/balances`, { headers: { "X-Admin-Token": adminToken } });
        const balancesPayload = await balancesResponse.json();
        if (!balancesResponse.ok) throw new Error(balancesPayload.msg || "Unable to load balances");
        const money = (value) => `GH₵ ${Number(value).toFixed(2)}`;
        document.querySelectorAll("[data-balance-provider]").forEach((row) => {
            const value = balancesPayload.balances?.[row.dataset.balanceProvider];
            const amount = row.querySelector("b");
            if (amount && Number.isFinite(Number(value?.amount))) amount.textContent = money(value.amount);
        });
        document.querySelectorAll("[data-wallet-provider]").forEach((card) => {
            const value = balancesPayload.balances?.[card.dataset.walletProvider];
            const amount = card.querySelector("strong");
            const status = card.querySelector("small");
            if (amount && Number.isFinite(Number(value?.amount))) amount.textContent = money(value.amount);
            if (status && value?.error) status.textContent = value.error;
        });
    }

    async function loadComparison() {
        const response = await fetch(`${adminApiBase}/admin/comparison`, { headers: { "X-Admin-Token": adminToken } });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.msg || "Unable to load comparison");
        const body = document.getElementById("comparison-body");
        if (!body || !payload.data?.length) return;
        comparisonPlans = payload.data;
        renderComparison();
        document.getElementById("comparison-updated").textContent = `Last verified update: ${new Date(payload.updatedAt || Date.now()).toLocaleTimeString()}`;
    }

    async function loadBulkBundles() {
        const select = document.getElementById("bulk-bundle");
        if (!select || !adminToken) return;
        select.innerHTML = '<option value="">Loading live bundles...</option>';
        try {
            const network = document.getElementById("bulk-network").value;
            const response = await fetch(`${adminApiBase}/admin/comparison?network=${encodeURIComponent(network)}`, { headers: { "X-Admin-Token": adminToken } });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.msg || "Unable to load bundles");
            select.innerHTML = payload.data?.length ? payload.data.map((plan) => `<option value="${plan.id}">${plan.name || plan.volume} · ${plan.provider} · GH₵ ${Number(plan.sellingPrice || 0).toFixed(2)}</option>`).join("") : '<option value="">No active bundles returned by configured providers</option>';
        } catch (error) {
            select.innerHTML = '<option value="">Bundles unavailable</option>';
            showToast(error.message);
        }
    }

    async function loadOrders() {
        const response = await fetch(`${adminApiBase}/admin/orders`, { headers: { "X-Admin-Token": adminToken } });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.msg || "Unable to load orders");
        const body = document.getElementById("orders-body");
        loadedOrders = payload.data || [];
        renderOrders();
    }

    async function loadPayments() {
        const response = await fetch(`${adminApiBase}/admin/payments`, { headers: { "X-Admin-Token": adminToken } });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.msg || "Unable to load payments");
        const body = document.getElementById("payments-body");
        if (!body || !payload.data?.length) return;
        body.innerHTML = payload.data.map((payment) => `<tr><td>${payment.reference || "—"}</td><td>${payment.email || "—"}</td><td>${payment.paymentMethod || "—"}</td><td>GH₵ ${Number(payment.amount || 0).toFixed(2)}</td><td>${payment.status || "—"}</td><td>${payment.date ? new Date(payment.date).toLocaleString() : "—"}</td></tr>`).join("");
    }

    function renderComparison() {
        const body = document.getElementById("comparison-body");
        if (!body) return;
        const network = document.getElementById("comparison-network")?.value || "";
        const volume = document.getElementById("comparison-volume")?.value || "";
        const plans = comparisonPlans.filter((plan) => (!network || plan.network === network) && (!volume || Math.abs(Number(plan.volumeGb) - Number(volume)) < 0.01));
        if (!plans.length) {
            body.innerHTML = '<tr><td colspan="8"><div class="empty-state"><strong>No matching verified bundles</strong><p>Change the filters or connect more provider keys.</p></div></td></tr>';
            return;
        }
        body.innerHTML = plans.map((plan) => `<tr><td><strong>${plan.network || "—"}</strong><br><small>${plan.name || plan.volume || "Bundle"}</small></td><td>${plan.provider === "resellerxpress" ? `GH₵ ${Number(plan.price).toFixed(2)}` : "—"}</td><td>${plan.provider === "remadata" ? `GH₵ ${Number(plan.price).toFixed(2)}` : "—"}</td><td>${plan.provider === "sendcomms" ? `GH₵ ${Number(plan.price).toFixed(2)}` : "—"}</td><td>GH₵ ${Number(plan.cost || plan.total).toFixed(2)}</td><td><strong>${plan.provider || "—"}</strong></td><td>GH₵ ${Number(plan.sellingPrice || 0).toFixed(2)}</td><td>GH₵ ${Number(plan.expectedProfit || 0).toFixed(2)}</td></tr>`).join("");
    }

    function renderOrders() {
        const body = document.getElementById("orders-body");
        if (!body) return;
        const search = (document.getElementById("orders-search")?.value || "").toLowerCase();
        const status = document.getElementById("orders-status")?.value || "";
        const network = document.getElementById("orders-network")?.value || "";
        const orders = loadedOrders.filter((order) => {
            const text = `${order.reference || ""} ${order.email || ""} ${order.phone || ""} ${order.bundle || ""}`.toLowerCase();
            return (!search || text.includes(search)) && (!status || order.status === status) && (!network || text.includes(network));
        });
        body.innerHTML = orders.length ? orders.map((order) => `<tr><td>${order.reference || "—"}</td><td>${order.email || "—"}<br><small>${order.phone || "—"}</small></td><td>${order.bundle || "—"}</td><td>${order.provider || "—"}</td><td>GH₵ ${Number(order.amount || 0).toFixed(2)}</td><td>${order.status || "—"}</td><td>${order.date ? new Date(order.date).toLocaleString() : "—"}</td></tr>`).join("") : '<tr><td colspan="7"><div class="empty-state"><strong>No matching orders</strong></div></td></tr>';
    }

    function exportOrders() {
        if (!loadedOrders.length) return showToast("Load orders before exporting.");
        const columns = ["reference", "email", "phone", "bundle", "amount", "status", "date"];
        const csv = [columns.join(","), ...loadedOrders.map((order) => columns.map((key) => `"${String(order[key] ?? "").replaceAll('"', '""')}"`).join(","))].join("\n");
        const link = document.createElement("a");
        link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
        link.download = "wimps-orders.csv";
        link.click();
        URL.revokeObjectURL(link.href);
        showToast("Orders CSV exported.");
    }

    async function loadCustomers() {
        const response = await fetch(`${adminApiBase}/admin/customers`, { headers: { "X-Admin-Token": adminToken } });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.msg || "Unable to load customers");
        const body = document.getElementById("customers-body");
        if (!body || !payload.data?.length) return;
        body.innerHTML = payload.data.map((customer) => `<tr><td><strong>${customer.fullname || "—"}</strong></td><td>${customer.email || "—"}</td><td>GH₵ ${Number(customer.balance || 0).toFixed(2)}</td><td>${customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : "—"}</td></tr>`).join("");
    }

    async function loadSettings() {
        const response = await fetch(`${adminApiBase}/admin/settings`, { headers: { "X-Admin-Token": adminToken } });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.msg || "Unable to load settings");
        const form = document.getElementById("pricing-form");
        Object.entries(payload.settings || {}).forEach(([key, value]) => {
            const input = form?.elements.namedItem(key);
            if (input) input.type === "checkbox" ? input.checked = Boolean(value) : input.value = value;
        });
    }

    async function loadCustomerCount(token) {
        const value = document.getElementById("total-users-value");
        const status = document.getElementById("total-users-status");
        if (!token || !value || !status) return;

        status.textContent = "Loading customer count...";
        try {
            const result = await loadAdminData(token);
            if (result.failed.length === result.total) throw new Error("Admin token rejected or backend is unavailable.");
            value.textContent = document.getElementById("total-users-value").textContent;
            status.textContent = "Registered customers";
        } catch (error) {
            adminToken = "";
            sessionStorage.removeItem("wimps-admin-token");
            status.textContent = error.message || "Unable to load count";
            showToast(status.textContent);
            throw error;
        }
    }

    document.getElementById("connect-users-button")?.addEventListener("click", () => {
        const token = window.prompt("Enter the configured admin API token:");
        if (token) loadCustomerCount(token);
    });

    async function saveSettings() {
        if (!adminToken) return showToast("Connect the admin API first.");
        const form = document.getElementById("pricing-form");
        const body = Object.fromEntries(new FormData(form).entries());
        body.neverBelowCost = form.elements.namedItem("neverBelowCost").checked;
        body.autoProvider = form.elements.namedItem("autoProvider").checked;
        try {
            const response = await fetch(`${adminApiBase}/admin/settings`, { method: "PUT", headers: { "Content-Type": "application/json", "X-Admin-Token": adminToken }, body: JSON.stringify(body) });
            const data = await response.json();
            if (!response.ok) throw new Error(data.msg || "Unable to save settings");
            showToast("Pricing settings saved.");
        } catch (error) { showToast(error.message); }
    }

    async function validateBulk() {
        if (!adminToken) return showToast("Connect the admin API first.");
        const textarea = document.querySelector(".bulk-form textarea");
        const numbers = textarea?.value.split(/\r?\n/).map((value) => value.trim()).filter(Boolean) || [];
        try {
            const response = await fetch(`${adminApiBase}/admin/bulk/validate`, { method: "POST", headers: { "Content-Type": "application/json", "X-Admin-Token": adminToken }, body: JSON.stringify({ numbers }) });
            const data = await response.json();
            if (!response.ok) throw new Error(data.msg || "Validation failed");
            const summary = document.querySelector(".bulk-summary");
            if (summary) summary.innerHTML = `<p class="eyebrow">BATCH SUMMARY</p><h2>Validation complete</h2><div class="summary-line"><span>Valid numbers</span><strong>${data.counts.valid}</strong></div><div class="summary-line"><span>Duplicates</span><strong>${data.counts.duplicates}</strong></div><div class="summary-line"><span>Invalid numbers</span><strong>${data.counts.invalid}</strong></div><button type="button" class="secondary-button" disabled>Pay with Paystack</button>`;
            showToast("Bulk numbers validated.");
        } catch (error) { showToast(error.message); }
    }

    if (adminToken) loadCustomerCount(adminToken).catch(() => sessionStorage.removeItem("wimps-admin-token"));

    if (localStorage.getItem("wimps-admin-theme") === "dark") document.body.classList.add("dark");
    openView(window.location.hash.slice(1) || "dashboard");
})();
