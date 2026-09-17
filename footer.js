(() => {
    const footer = document.querySelector("footer");
    if (!footer) return;

    footer.className = "site-footer";
    footer.innerHTML = `
        <div class="footer-column footer-contact">
            <h4>Contact</h4>
            <p><strong>Address:</strong> 134 Melcom Road, Street 14, Sokoban</p>
            <p><strong>Phone:</strong> <a href="tel:+233597532120">(+233) 597 532 120</a></p>
            <p><strong>Email:</strong> <a href="mailto:support@wimps.com">support@wimps.com</a></p>
            <p><strong>Hours:</strong> 24/7, Mon - Sun</p>
            <div class="footer-follow">
                <h4>Follow Us</h4>
                <div class="footer-socials" aria-label="Social media links">
                    <a href="#" aria-label="Facebook"><i class="fab fa-facebook-f"></i></a>
                    <a href="#" aria-label="Twitter"><i class="fab fa-twitter"></i></a>
                    <a href="#" aria-label="Instagram"><i class="fab fa-instagram"></i></a>
                    <a href="#" aria-label="YouTube"><i class="fab fa-youtube"></i></a>
                </div>
            </div>
        </div>

        <div class="footer-column">
            <h4>About WIMPS</h4>
            <a href="./about.html">About Us</a>
            <a href="./history.html">Delivery Information</a>
            <a href="./about.html">Privacy Policy</a>
            <a href="./about.html">Terms &amp; Conditions</a>
            <a href="mailto:support@wimps.com">Contact Us</a>
        </div>

        <div class="footer-column">
            <h4>My Account</h4>
            <a href="./login-page.html">Sign In</a>
            <a href="./account.html">My Account</a>
            <a href="./history.html">View Orders</a>
            <a href="./history.html">Transaction History</a>
            <a href="mailto:support@wimps.com">Help &amp; Support</a>
        </div>

        <div class="footer-column footer-install">
            <h4>Get the WIMPS App</h4>
            <p>Manage your bundles and transactions wherever you are.</p>
            <div class="app-badges">
                <span><i class="fab fa-google-play"></i> Google Play</span>
                <span><i class="fab fa-apple"></i> App Store</span>
            </div>
            <p class="payment-label">Secure payment methods</p>
            <div class="payment-badges">
                <span>Mobile Money</span>
                <span>Paystack</span>
            </div>
        </div>
    `;

    const copyright = document.querySelector(".cpr") || document.createElement("div");
    copyright.className = "site-copyright";
    copyright.innerHTML = '<p>&copy; 2026 WIMPS Mobile Bundle Service. All rights reserved. <a class="admin-secret-link" href="./admin/index.html" aria-label="Admin login">.</a></p>';
    footer.insertAdjacentElement("afterend", copyright);
})();
