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
            const raw = localStorage.getItem('user');
            return raw ? JSON.parse(raw) : null;
        } catch (err) {
            return null;
        }
    }

    function setUser(user) {
        localStorage.setItem('user', JSON.stringify(user));
    }

    async function openPaystackDeposit(amountOverride) {
        const user = getUser();
        if (!user || !user.email) {
            alert('Login first');
            return;
        }

        const depositAmount = Number(amountOverride || prompt('Enter deposit amount in GHS', '10'));
        if (!Number.isFinite(depositAmount) || depositAmount < 10) {
            alert('Enter a valid amount: deposit GHS10 or more');
            return;
        }

        if (!(await ensurePaymentConfig())) return;

        const handler = PaystackPop.setup({
            key: PAYSTACK_KEY,
            email: user.email,
            amount: Math.round(depositAmount * 100),
            currency: 'GHS',
            callback: function(response) {
                (async () => {
                    try {
                        const res = await fetch(`${API_BASE}/wallet/deposit`, {
                            method: 'POST',
                            headers: { ...window.wimpsAuthHeaders(), 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                email: user.email,
                                amount: depositAmount,
                                reference: response.reference
                            })
                        });

                        const data = await res.json();
                        if (!res.ok) {
                            alert(data.msg || data.message || 'Deposit verification failed');
                            return;
                        }

                        if (data.balance !== undefined) {
                            user.balance = Number(data.balance);
                            setUser(user);
                        }

                        updateBalanceInDom();
                        alert(data.msg || 'Deposit successful');
                    } catch (err) {
                        console.error(err);
                        alert('Deposit failed');
                    }
                })();
            },
            onClose: function() {
                alert('Transaction cancelled');
            }
        });

        handler.openIframe();
    }

    function updateBalanceInDom() {
        const user = getUser();
        const balance = Number(user?.balance || 0);
        const balanceEls = Array.from(document.querySelectorAll('#account-balance'));
        balanceEls.forEach((el) => {
            if (el) el.textContent = 'GHS ' + balance.toFixed(2);
        });

        if (user && user.email) {
            const stats = JSON.parse(localStorage.getItem('accountStats') || '{}');
            if (stats && typeof stats === 'object') {
                stats.balance = balance;
                localStorage.setItem('accountStats', JSON.stringify(stats));
            }
        }
    }

    document.addEventListener('DOMContentLoaded', function() {
        loadUserData();
        setupNewsletter();
        setupHomeDepositPage();
    });

    function setupHomeDepositPage() {
        const homeButton = document.getElementById('home-deposit-paystack');
        if (homeButton) {
            homeButton.addEventListener('click', () => {
                const user = getUser();
                if (!user?.email) {
                    window.location.href = './login-page.html?v=3#signup';
                    return;
                }
                openPaystackDeposit();
            });
        }
    }

    function loadUserData() {
        const user = getUser();

        if (!user || !user.email) {
            localStorage.removeItem('accountStats');

            const accountBalanceEl = document.getElementById('account-balance');
            const userOrdersEl = document.getElementById('user-orders');
            const totalTransactionsEl = document.getElementById('total-transactions');

            if (accountBalanceEl) accountBalanceEl.textContent = 'GHS 0.00';
            if (userOrdersEl) userOrdersEl.textContent = '0';
            if (totalTransactionsEl) totalTransactionsEl.textContent = '0';

            return;
        }

        const accountStats = JSON.parse(localStorage.getItem('accountStats')) || {
            totalOrders: 0,
            totalTransactions: 0,
            balance: user?.balance || 0
        };

        const accountBalanceEl = document.getElementById('account-balance');
        const userOrdersEl = document.getElementById('user-orders');
        const totalTransactionsEl = document.getElementById('total-transactions');

        if (accountBalanceEl) {
            accountBalanceEl.textContent = 'GHS ' + Number(accountStats.balance || user?.balance || 0).toFixed(2);
        }

        if (userOrdersEl) {
            userOrdersEl.textContent = accountStats.totalOrders || 0;
        }

        if (totalTransactionsEl) {
            totalTransactionsEl.textContent = accountStats.totalTransactions || 0;
        }

        if (user && user.fullname) {
            const firstName = user.fullname.split(' ')[0];
            const greetingEl = document.querySelector('.hero-content > p:nth-of-type(1)');
            if (greetingEl) {
                greetingEl.textContent = `Welcome back, ${firstName}!`;
            }
        }
    }

    function setupNewsletter() {
        const form = document.getElementById('newsletter-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const email = form.querySelector('input[type="email"]');

                if (email && email.value) {
                    alert('Thank you for subscribing! Check your email for special offers.');
                    form.reset();
                }
            });
        }
    }

    window.openPaystackDeposit = openPaystackDeposit;
    window.updateBalanceInDom = updateBalanceInDom;
})();


