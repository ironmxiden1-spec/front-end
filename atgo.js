(() => {
  const API_BASE = (() => {
    const configured = window.APP_CONFIG && window.APP_CONFIG.API_BASE;
    if (configured) {
      return String(configured).replace(/\/$/, "");
    }

    return /localhost|127\.0\.0\.1/.test(window.location.hostname)
      ? "http://localhost:5000/api"
      : "/api";
  })();
  let PAYSTACK_KEY = window.APP_CONFIG?.PAYSTACK_PUBLIC_KEY || "";

  async function ensurePaymentConfig() {
    if (PAYSTACK_KEY) return true;

    try {
      const response = await fetch(`${API_BASE}/auth/config`);
      const config = await response.json();
      PAYSTACK_KEY = config.paystackPublicKey || "";
    } catch (error) {
      console.error("Payment configuration error:", error);
    }

    if (!PAYSTACK_KEY) alert("Paystack is not configured on the server");
    return Boolean(PAYSTACK_KEY);
  }

  function getUser() {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      return null;
    }
  }

  function setUser(user) {
    localStorage.setItem("user", JSON.stringify(user));
  }

  function getCurrentNetwork() {
    const path = window.location.pathname.toLowerCase();

    if (path.includes("telecel")) return "telecel";
    if (path.includes("atgo") || path.includes("airteltigo")) return "airteltigo";

    return "mtn";
  }

  function requireLogin() {
    if (getUser()?.email) return true;
    window.location.href = "./login-page.html?v=3#signup";
    return false;
  }

  let latestPlans = [];
  let currentPurchase = null;

  function setBalanceLocally(balance) {
    const safeBalance = Number(balance || 0);
    const user = getUser();
    if (user) {
      user.balance = safeBalance;
      setUser(user);
    }

    try {
      const stats = JSON.parse(localStorage.getItem('accountStats') || '{}');
      if (typeof stats === 'object' && stats !== null) {
        stats.balance = safeBalance;
        localStorage.setItem('accountStats', JSON.stringify(stats));
      }
    } catch (err) {
      console.warn('Balance stats sync warning:', err);
    }
  }

  function showPurchaseFeedback(message) {
    const feedback = document.getElementById('wimps-feedback') || (() => {
      const el = document.createElement('div');
      el.id = 'wimps-feedback';
      el.style.position = 'fixed';
      el.style.bottom = '24px';
      el.style.right = '24px';
      el.style.padding = '12px 16px';
      el.style.background = '#163c28';
      el.style.color = '#fff';
      el.style.borderRadius = '8px';
      el.style.boxShadow = '0 12px 32px rgba(0,0,0,0.22)';
      el.style.zIndex = '5000';
      el.style.maxWidth = '420px';
      el.style.fontFamily = 'Arial, sans-serif';
      document.body.appendChild(el);
      return el;
    })();

    feedback.textContent = message || 'Purchase processed.';
    feedback.style.display = 'block';
    clearTimeout(feedback.hideTimer);
    feedback.hideTimer = setTimeout(() => {
      feedback.style.display = 'none';
    }, 3500);
  }

  async function updateWallet() {
    const user = getUser();
    const balanceEl = document.getElementById("wallet-balance");
    const nameEl = document.getElementById("user-name");

    if (!user) {
      if (balanceEl) balanceEl.textContent = "0.00";
      if (nameEl) nameEl.textContent = "Guest";
      return;
    }

    if (nameEl) {
      nameEl.textContent = user.fullname || user.email || "Guest";
    }

    try {
      const res = await fetch(`${API_BASE}/wallet/${user.email}`);
      const data = await res.json();

      if (balanceEl) {
        balanceEl.textContent = Number(data.balance || 0).toFixed(2);
      }

      user.balance = Number(data.balance || 0);
      setUser(user);
    } catch (err) {
      console.error("Wallet fetch error:", err);
      if (balanceEl) balanceEl.textContent = "0.00";
    }
  }

  async function loadBundleOffers() {
    const container = document.getElementById("bundle-list");

    if (container) {
      container.innerHTML = "<p>Loading bundle offers...</p>";
    }

    const network = getCurrentNetwork();

    try {
      const res = await fetch(`${API_BASE}/resellerxpress/plans?network=${encodeURIComponent(network)}`);

      let data;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (!res.ok) {
        throw new Error(data?.message || data?.msg || "Failed to load bundle offers");
      }

      const rawPlans = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data?.plans)
            ? data.plans
            : Array.isArray(data?.result)
              ? data.result
              : [];

      latestPlans = rawPlans.filter((plan) => Number(plan.price || plan.amount || 0) > 0);
      renderBundles();
    } catch (err) {
      console.error("Offer load error:", err);
      latestPlans = [];
      renderBundles();
    }
  }

  function renderBundles() {
    const container = document.getElementById("bundle-list");
    if (!container) return;

    if (!latestPlans.length) {
      container.innerHTML = "<p>No bundle offers are currently available with verified pricing and fees.</p>";
      return;
    }

    const sortedPlans = [...latestPlans].sort((a, b) => Number(a.price || a.amount || 0) - Number(b.price || b.amount || 0));

    container.dataset.planCount = String(sortedPlans.length);
    container.innerHTML = sortedPlans.map((plan) => {
      const price = Number(plan.price || plan.amount || 0);
      const fee = Number(plan.fee || plan.handling_fee || plan.service_fee || 0);
      const cost = Number(plan.cost || plan.total || (price + fee));
      const total = Number(plan.sellingPrice || (cost + 1));
      const bundleName = plan.name || `${plan.volume || plan.volume_mb || "Bundle"}`;
      const volume = plan.volume || plan.volume_mb || "-";
      const networkName = plan.network || getCurrentNetwork();
      const volumeValue = Number(String(volume).replace(/[^0-9.]/g, ""));
      const pricePerGb = Number.isFinite(volumeValue) && volumeValue > 0 ? price / volumeValue : price;

      return `
        <div class="bundle-card">
          <div class="card-header">
            <div class="bundle-icon"><i class="fas fa-wifi"></i></div>
            <div class="bundle-header-copy">
              <h3 class="bundle-label">${bundleName}</h3>
              <p class="bundle-network">${networkName.toUpperCase()} · ${String(plan.provider || "provider").toUpperCase()}</p>
            </div>
          </div>

          <div class="card-pricing">
            <div class="price-item">
              <span class="label">Price / GB</span>
              <span class="value">GHS ${pricePerGb.toFixed(2)}</span>
            </div>
            <div class="price-item">
              <span class="label">Base</span>
              <span class="value">GHS ${price.toFixed(2)}</span>
            </div>
            <div class="price-item">
              <span class="label">Fee</span>
              <span class="value">GHS ${fee.toFixed(2)}</span>
            </div>
            <div class="price-item total">
              <span class="label">Selling price</span>
              <span class="value">GHS ${total.toFixed(2)}</span>
            </div>
          </div>

          <div class="card-actions">
            <button onclick="openCheckout('${plan.id}')" class="btn-buy">
              Buy now
            </button>
          </div>
        </div>
      `;
    }).join("");
  }

  function openCheckout(planId) {
    if (!requireLogin()) return;
    const user = getUser();

    const plan = latestPlans.find((item) => String(item.id) === String(planId));
    if (!plan) {
      alert("This bundle is currently unavailable.");
      return;
    }

    const baseAmount = Number(plan.price || plan.amount || plan.total || 0);
    const fee = Number(plan.fee || plan.handling_fee || plan.service_fee || 0);
    const total = Number(plan.sellingPrice || (Number(plan.cost || plan.total || baseAmount + fee) + 1));
    const volumeText = plan.volume_mb || plan.volume || plan.name || "1";
    const parsedVolume = Number(String(volumeText).replace(/[^0-9.]/g, ""));
    const pricePerGb = Number.isFinite(parsedVolume) && parsedVolume > 0 ? baseAmount / parsedVolume : baseAmount;

    currentPurchase = {
      user,
      plan,
      network: getCurrentNetwork(),
      baseAmount,
      fee,
      total
    };

    const bundleLabel = plan.name || `${plan.volume || plan.volume_mb || "Bundle"}`;

    document.getElementById("modal-bundle-name").textContent = bundleLabel;
    document.getElementById("modal-quantity").textContent = "1";
    document.getElementById("modal-price-per-gb").textContent = `GHS ${pricePerGb.toFixed(2)}`;
    document.getElementById("modal-base-amount").textContent = `GHS ${baseAmount.toFixed(2)}`;
    document.getElementById("modal-fee").textContent = `GHS ${fee.toFixed(2)}`;
    document.getElementById("modal-total").textContent = `GHS ${total.toFixed(2)}`;

    document.getElementById("checkout-modal").style.display = "flex";
  }

  function closeCheckoutModal() {
    const modal = document.getElementById("checkout-modal");
    if (modal) modal.style.display = "none";
  }

  async function buyWithWallet() {
    const p = currentPurchase;
    if (!p) return;

    const phone = document.getElementById("phone-number").value.trim();
    if (!phone) return alert("Enter phone number");

    try {
      const res = await fetch(`${API_BASE}/wallet/buy`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: p.user.email,
          phone,
          network: p.network,
          plan_id: p.plan.id,
          quantity: 1,
          amount: p.total,
          request_id: `WIMPS_${Date.now()}`
        })
      });

      const data = await res.json();

      if (!res.ok) {
        showPurchaseFeedback(data.msg || data.message || "Purchase failed");
        return;
      }

      if (data.balance !== undefined) {
        setBalanceLocally(data.balance);
      }

      showPurchaseFeedback(data.msg || data.message || "Purchase successful");
      closeCheckoutModal();
      updateWallet();
      loadBundleOffers();
    } catch (err) {
      console.error(err);
      alert("Network error while processing purchase");
    }
  }

  async function buyWithPaystack() {
    const p = currentPurchase;
    if (!p) return;

    if (!(await ensurePaymentConfig())) return;

    const phone = document.getElementById("phone-number").value.trim();
    if (!phone) return alert("Enter phone number");

    const handler = PaystackPop.setup({
      key: PAYSTACK_KEY,
      email: p.user.email,
      amount: Math.round((p.total || 0) * 100),
      currency: "GHS",

      callback: function(response) {
        (async () => {
          try {
            const res = await fetch(`${API_BASE}/wallet/buy`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                email: p.user.email,
                phone,
                network: p.network,
                plan_id: p.plan.id,
                provider: p.plan.provider,
                volume: p.plan.volumeGb || p.plan.volume,
                quantity: 1,
                amount: p.total,
                request_id: `WIMPS_${Date.now()}`,
                reference: response.reference
              })
            });

            const data = await res.json();

            if (!res.ok) {
              showPurchaseFeedback(data.msg || data.message || "Payment verification failed");
              return;
            }

            if (data.balance !== undefined) {
              setBalanceLocally(data.balance);
            }

            showPurchaseFeedback(data.msg || data.message || "Payment successful");
            closeCheckoutModal();
            updateWallet();
            loadBundleOffers();
          } catch (err) {
            console.error(err);
            alert("Verification failed");
          }
        })();
      },

      onClose: function() {
        alert("Transaction cancelled");
      }
    });

    handler.openIframe();
  }

  async function depositWithPaystack() {
    const user = getUser();
    const amountEl = document.getElementById("deposit-amount");

    if (!user) return alert("Login first");
    if (!amountEl) return alert("Amount input missing");

    const amount = Number(amountEl.value);
    if (!amount || amount < 10) return alert("Enter a valid amount: deposit GHS10 or more");

    if (!(await ensurePaymentConfig())) return;

    const handler = PaystackPop.setup({
      key: PAYSTACK_KEY,
      email: user.email,
      amount: amount * 100,
      currency: "GHS",

      callback: function(response) {
        (async () => {
          try {
            const res = await fetch(`${API_BASE}/wallet/deposit`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                email: user.email,
                amount: amount,
                reference: response.reference
              })
            });

            const data = await res.json();

            if (!res.ok) {
              alert(data.msg || data.message || "Deposit verification failed");
              return;
            }

            if (data.balance !== undefined) {
              user.balance = data.balance;
              setUser(user);
            }

            alert(data.msg || "Deposit successful");
            updateWallet();
          } catch (err) {
            console.error(err);
            alert("Deposit failed");
          }
        })();
      },

      onClose: function() {
        alert("Transaction cancelled");
      }
    });

    handler.openIframe();
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (!requireLogin()) return;
    loadBundleOffers();
    updateWallet();

    document.getElementById("buy-wallet-btn")?.addEventListener("click", buyWithWallet);
    document.getElementById("buy-paystack-btn")?.addEventListener("click", buyWithPaystack);
    document.getElementById("deposit-paystack")?.addEventListener("click", depositWithPaystack);
    document.getElementById("modal-close-btn")?.addEventListener("click", closeCheckoutModal);
    document.querySelector(".close-btn")?.addEventListener("click", closeCheckoutModal);
  });

  window.openCheckout = openCheckout;
})();

