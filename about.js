// about.js

const API_BASE = (() => {
    const configured = window.APP_CONFIG && window.APP_CONFIG.API_BASE;
    if (configured) {
        return String(configured).replace(/\/$/, "");
    }

    return /localhost|127\.0\.0\.1/.test(window.location.hostname)
        ? "http://localhost:5000/api"
        : `${window.location.origin}/api`;
})();
let PAYSTACK_PUBLIC_KEY = window.APP_CONFIG?.PAYSTACK_PUBLIC_KEY || "";

let currentSupportAmount = 0;
let currentSupportType = "";

document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".faq-question").forEach((question) => {
        question.setAttribute("role", "button");
        question.setAttribute("tabindex", "0");

        const toggleAnswer = () => {
            const answer = question.nextElementSibling;
            const isOpen = answer?.classList.toggle("show");
            question.classList.toggle("active", isOpen);
            question.setAttribute("aria-expanded", String(Boolean(isOpen)));
        };

        question.addEventListener("click", toggleAnswer);
        question.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                toggleAnswer();
            }
        });
    });
});

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

    if (!PAYSTACK_PUBLIC_KEY) {
        fetch(`${API_BASE}/auth/config`).then((response) => response.json()).then((config) => {
            PAYSTACK_PUBLIC_KEY = config.paystackPublicKey || "";
            if (PAYSTACK_PUBLIC_KEY) payWithCard();
            else alert("Paystack support payments are not configured");
        }).catch(() => alert("Paystack support payments are unavailable"));
        return;
    }

    const ref = "WIMPS-" + Date.now();

    const handler = PaystackPop.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email: email,
        amount: currentSupportAmount * 100,
        currency: "GHS",
        reference: ref,

        callback: function (response) {
            sendDonation(response.reference, currentSupportAmount, email);

            window.wimsNotice?.("Donation successful.", "success");
            closeSupportModal();
        },

        onClose: function () {
            console.log("Payment closed");
        }
    });

    handler.openIframe();
}