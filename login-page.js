(() => {
    const toggleSignupLink = document.getElementById('toggle-signup');
    const toggleLoginLink = document.getElementById('toggle-login');
    const loginBox = document.querySelector('.login-form');
    const signupBox = document.querySelector('.signup-form');

    if (window.location.hash === '#signup') {
        loginBox?.classList.remove('active');
        signupBox?.classList.add('active');
    }

    if (toggleSignupLink && toggleLoginLink) {
        toggleSignupLink.addEventListener('click', (e) => {
            e.preventDefault();
            loginBox.classList.remove('active');
            signupBox.classList.add('active');
        });

        toggleLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            signupBox.classList.remove('active');
            loginBox.classList.add('active');
        });
    }

    const API_BASE = (() => {
        const configured = window.APP_CONFIG && window.APP_CONFIG.API_BASE;
        if (configured) {
            return String(configured).replace(/\/$/, "");
        }

        return /localhost|127\.0\.0\.1/.test(window.location.hostname)
            ? "http://localhost:5000/api"
            : "/api";
    })();

    function saveAuthenticatedUser(user) {
        localStorage.setItem("user", JSON.stringify({
            id: user.id,
            fullname: user.fullname,
            email: user.email,
            balance: user.balance || 0,
            referralCode: user.referralCode || "",
            referralCount: user.referralCount || 0,
            referralCredits: user.referralCredits || 0,
            createdAt: user.createdAt,
            authToken: user.authToken
        }));
        window.location.href = "./account.html";
    }

    const authModal = document.getElementById("auth-modal");
    const authModalTitle = document.getElementById("auth-modal-title");
    const authModalText = document.getElementById("auth-modal-text");
    const authModalLabel = document.getElementById("auth-modal-label");
    const authModalInput = document.getElementById("auth-modal-input");
    const authModalPassword = document.getElementById("auth-modal-password");
    const authModalForm = document.getElementById("auth-modal-form");
    const authModalClose = document.getElementById("auth-modal-close");
    const authModalCancel = document.getElementById("auth-modal-cancel");

    function closeAuthModal() {
        authModal?.classList.add("hidden");
        authModal?.setAttribute("aria-hidden", "true");
        if (authModalForm) authModalForm.dataset.action = "";
    }

    function openAuthModal({ title, text, label, placeholder, action, inputType = "email", buttonText = "Submit" }) {
        if (!authModal || !authModalTitle || !authModalText || !authModalLabel || !authModalInput || !authModalPassword || !authModalForm) return;
        authModalTitle.textContent = title;
        authModalText.textContent = text;
        authModalLabel.textContent = label;
        authModalInput.type = inputType;
        authModalInput.placeholder = placeholder;
        authModalInput.value = "";
        authModalPassword.value = "";
        authModalPassword.classList.toggle("hidden", action !== "reset");
        authModalPassword.setAttribute("placeholder", "New password");
        authModalPassword.type = "password";
        authModalInput.classList.toggle("hidden", action === "reset");
        authModalForm.dataset.action = action;
        const submitButton = authModalForm.querySelector("button[type='submit']");
        if (submitButton) submitButton.textContent = buttonText;
        authModal.classList.remove("hidden");
        authModal.setAttribute("aria-hidden", "false");
    }

    authModalClose?.addEventListener("click", closeAuthModal);
    authModalCancel?.addEventListener("click", closeAuthModal);
    authModal?.addEventListener("click", (event) => {
        if (event.target === authModal) closeAuthModal();
    });

    document.getElementById("forgot-password-link")?.addEventListener("click", async (event) => {
        event.preventDefault();
        openAuthModal({
            title: "Reset password",
            text: "Enter the email address linked to your account and we’ll send a reset link.",
            label: "Email address",
            placeholder: "you@example.com",
            action: "forgot",
            buttonText: "Send link"
        });
    });

    authModalForm?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const action = authModalForm.dataset.action;
        if (action === "forgot") {
            const email = String(authModalInput.value || "").trim();
            if (!email) return window.wimsAlert("Please enter your email address.");
            const response = await fetch(`${API_BASE}/auth/forgot-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email })
            });
            const data = await response.json();
            closeAuthModal();
            if (!response.ok) return window.wimsNotice?.(data.msg || "Unable to start password reset.", "error");
            window.wimsNotice?.(data.msg || "Check your email for a password reset link.", "success");
            return;
        }

        if (action === "reset") {
            const password = String(authModalPassword.value || "").trim();
            const resetEmail = new URLSearchParams(window.location.search).get("email") || "";
            const token = new URLSearchParams(window.location.search).get("reset") || "";
            if (!password || password.length < 6) return window.wimsAlert("Password must be at least 6 characters.");
            if (!token || !resetEmail) return window.wimsAlert("The reset link is missing required information.");
            const response = await fetch(`${API_BASE}/auth/reset-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: resetEmail, token, password })
            });
            const data = await response.json();
            closeAuthModal();
            if (!response.ok) return window.wimsNotice?.(data.msg || "Password reset failed.", "error");
            window.wimsNotice?.(data.msg || "Password reset complete.", "success");
            setTimeout(() => window.location.href = "./login-page.html#login", 800);
        }
    });

    const resetParams = new URLSearchParams(window.location.search);
    const resetToken = resetParams.get("reset");
    const resetEmail = resetParams.get("email");
    if (resetToken && resetEmail) {
        openAuthModal({
            title: "Create new password",
            text: "Choose a new password for your WIMPS account.",
            label: "New password",
            placeholder: "At least 6 characters",
            action: "reset",
            inputType: "password",
            buttonText: "Update password"
        });
    }

    const DEMO_USERS = {};

    const loginForm = document.getElementById("loginForm");

    document.querySelectorAll('[data-password-toggle]').forEach((toggle) => {
        toggle.addEventListener('click', () => {
            const input = document.getElementById(toggle.dataset.passwordToggle);
            if (!input) return;
            const showing = input.type === 'text';
            input.type = showing ? 'password' : 'text';
            toggle.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
            toggle.innerHTML = showing ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
        });
    });


    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const email = document.getElementById("email").value;
            const password = document.getElementById("password").value;

            if (!email || !password) {
                window.wimsAlert("Please fill in all fields.");
                return;
            }

            try {
                const submitButton = loginForm.querySelector("button[type='submit']");
                if (submitButton) {
                    submitButton.disabled = true;
                    submitButton.textContent = "Logging in...";
                }
                const res = await fetch(`${API_BASE}/auth/login`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ email, password })
                });

                const data = await res.json();

                if (res.ok) {
                    window.wimsNotice?.("Login successful.", "success");
                    const user = {
                        id: data.user.id,
                        fullname: data.user.fullname,
                        email: data.user.email,
                        balance: data.user.balance || 0,
                        referralCode: data.user.referralCode || "",
                        referralCount: data.user.referralCount || 0,
                        referralCredits: data.user.referralCredits || 0,
                        createdAt: data.user.createdAt,
                        authToken: data.user.authToken
                    };
                    localStorage.setItem("user", JSON.stringify(user));
                    window.location.href = "./account.html";
                    return;
                }

                if (DEMO_USERS[email] && DEMO_USERS[email].password === password) {
                    const user = {
                        id: DEMO_USERS[email].id,
                        fullname: DEMO_USERS[email].fullname,
                        email: DEMO_USERS[email].email,
                        balance: DEMO_USERS[email].balance || 0,
                        createdAt: DEMO_USERS[email].createdAt
                    };
                    localStorage.setItem("user", JSON.stringify(user));
                    window.wimsNotice?.("Login successful.", "success");
                    window.location.href = "./account.html";
                    return;
                }

                window.wimsAlert(data.notice ? `${data.msg || "Login failed"} ${data.notice}` : (data.msg || "Login failed"));
            } catch (err) {
                const demoUser = DEMO_USERS[email];
                if (demoUser && demoUser.password === password) {
                    const user = {
                        id: demoUser.id,
                        fullname: demoUser.fullname,
                        email: demoUser.email,
                        balance: demoUser.balance || 0,
                        createdAt: demoUser.createdAt
                    };
                    localStorage.setItem("user", JSON.stringify(user));
                    window.wimsNotice?.("Login successful.", "success");
                    window.location.href = "./account.html";
                    return;
                }

                console.error(err);
                window.wimsAlert("The server is unavailable right now.");
            } finally {
                const submitButton = loginForm.querySelector("button[type='submit']");
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = "Login";
                }
            }
        });
    }

    const signupForm = document.querySelector('.signup-form form');

    if (signupForm) {
        signupForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const fullname = document.getElementById('signup-fullname').value;
            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;
            const confirmPassword = document.getElementById('signup-confirm').value;

            if (!fullname || !email || !password || !confirmPassword) {
                window.wimsAlert("Please fill in all fields.");
                return;
            }

            if (password !== confirmPassword) {
                window.wimsAlert("Passwords do not match.");
                return;
            }

            if (password.length < 6) {
                window.wimsAlert("Password must be at least 6 characters.");
                return;
            }

            try {
                const res = await fetch(`${API_BASE}/auth/register`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ fullname, email, password, referralCode: new URLSearchParams(window.location.search).get("ref") || "" })
                });

                const data = await res.json();

                if (res.ok) {
                    window.wimsNotice?.("Account created successfully.", "success");
                    signupBox.classList.remove('active');
                    loginBox.classList.add('active');
                    document.getElementById('email').value = email;
                    document.getElementById('email').focus();
                } else {
                    window.wimsAlert(data.msg || "Signup failed.");
                }

            } catch (err) {
                console.error(err);
                window.wimsAlert("The server is unavailable right now.");
            }
        });
    }
})();

