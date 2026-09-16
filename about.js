// about.js

const API_BASE = (() => {
    const configured = window.APP_CONFIG && window.APP_CONFIG.API_BASE;
    if (configured) {
        return String(configured).replace(/\/$/, "");
    }

    return /localhost|127\.0\.0\.1/.test(window.location.hostname)
        ? "http://localhost:5000/api"
        : "/api";
})();
    let PAYSTACK_PUBLIC_KEY = window.PAYSTACK_CONFIG?.PUBLIC_KEY || window.APP_CONFIG?.PAYSTACK_PUBLIC_KEY || "";

let currentSupportAmount = 0;
let currentSupportType = "";

// ===== SUPPORT =====
function supportDeveloper(amount, type) {
    currentSupportAmount = amount;
    currentSupportType = type;

    document.getElementById("support-modal").style.display = "flex";
    document.getElementById(
        "support-message"
    ).textContent = `Support WIMPS with GHS ${amount} (${type})`;
}

function closeSupportModal() {
    document.getElementById("support-modal").style.display = "none";
}

// ===== SEND TO BACKEND =====
async function sendDonation(reference, amount, email) {
    try {
        const res = await fetch(`${API_BASE}/support/donate`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                reference,
                amount,
                email
            })
        });

        const data = await res.json();

        if (!res.ok) throw new Error(data.msg);

        console.log("Saved to backend:", data);
    } catch (err) {
        console.error("Donation error:", err);
    }
}

// ===== PAYSTACK =====
function payWithCard() {
    const user = JSON.parse(localStorage.getItem("user"));
    let email = user?.email;

    if (!email) {
        email = prompt("Enter your email:");
        if (!email) return;
    }

    if (!window.PaystackPop) {
        alert("Paystack not loaded");
        return;
    }

    const ref = "WIMPS-" + Date.now();

    if (!PAYSTACK_PUBLIC_KEY) {
        alert("Paystack is not configured yet. Please try again shortly.");
        return;
    }

    const handler = PaystackPop.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email: email,
        amount: currentSupportAmount * 100,
        currency: "GHS",
        reference: ref,

        callback: function (response) {
            sendDonation(response.reference, currentSupportAmount, email);

            alert("Donation successful!");
            closeSupportModal();
        },

        onClose: function () {
            console.log("Payment closed");
        }
    });

    handler.openIframe();
}

window.addEventListener("load", async () => {
    if (PAYSTACK_PUBLIC_KEY) return;

    try {
        const response = await fetch(`${API_BASE}/auth/config`);
        const config = await response.json();
        PAYSTACK_PUBLIC_KEY = config.paystackPublicKey || "";
    } catch (error) {
        console.error("Unable to load Paystack configuration", error);
    }
});