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

    let authConfig = null;

    async function loadAuthConfig() {
        try {
            const response = await fetch(`${API_BASE}/auth/config`);
            authConfig = await response.json();
            initializeGoogleButtons();
        } catch (error) {
            console.error("Unable to load auth configuration", error);
            authConfig = {};
            initializeGoogleButtons();
        }
    }

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

    async function handleGoogleCredential(response) {
        try {
            const result = await fetch(`${API_BASE}/auth/google`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ credential: response.credential })
            });
            const data = await result.json();
            if (!result.ok) return alert(data.msg || "Google sign-in failed");
            saveAuthenticatedUser(data.user);
        } catch (error) {
            console.error(error);
            alert("Google sign-in is unavailable right now");
        }
    }

    function initializeGoogleButtons() {
        const containers = ["google-login-button", "google-signup-button"]
            .map((id) => document.getElementById(id))
            .filter(Boolean);

        if (!authConfig?.googleClientId || !window.google?.accounts?.id) {
            containers.forEach((container) => {
                if (container.childElementCount) return;
                const button = document.createElement("button");
                button.type = "button";
                button.className = "google-fallback-button";
                button.innerHTML = '<i class="fab fa-google"></i> Continue with Google';
                button.addEventListener("click", () => alert("Google sign-in is not configured on the server yet"));
                container.appendChild(button);
            });
            return;
        }

        window.google.accounts.id.initialize({
            client_id: authConfig.googleClientId,
            callback: handleGoogleCredential
        });

        containers.forEach((container) => {
            container.replaceChildren();
            window.google.accounts.id.renderButton(container, {
                theme: "outline",
                size: "large",
                width: 360,
                text: "continue_with"
            });
        });
    }

    window.addEventListener("load", () => {
        loadAuthConfig();
        const googleWait = window.setInterval(() => {
            if (authConfig?.googleClientId && window.google?.accounts?.id) {
                window.clearInterval(googleWait);
                initializeGoogleButtons();
            }
        }, 250);
        window.setTimeout(() => window.clearInterval(googleWait), 10000);
    });

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
                alert("Please fill in all fields");
                return;
            }

            try {
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

                alert(data.notice ? `${data.msg || "Login failed"}\n\n${data.notice}` : (data.msg || "Login failed"));
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
                alert("Server error. Backend is unavailable right now.");
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
                alert("Please fill in all fields");
                return;
            }

            if (password !== confirmPassword) {
                alert("Passwords do not match!");
                return;
            }

            if (password.length < 6) {
                alert("Password must be at least 6 characters");
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
                    alert(data.msg || "Signup failed");
                }

            } catch (err) {
                console.error(err);
                alert("Server error: " + err.message);
            }
        });
    }
})();

