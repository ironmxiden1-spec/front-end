(() => {
    const navbar = document.getElementById("navbar");
    const menuButton = document.getElementById("bar");
    const closeButton = document.getElementById("close");

    if (!navbar || !menuButton) return;

    const pageLinks = [
        ["index.html", "Home"],
        ["history.html", "History"],
        ["checkers.html", "Result Checkers"],
        ["mtn.html", "MTN"],
        ["atgo.html", "AirtelTigo"],
        ["telecel.html", "Telecel"],
        ["about.html", "About"],
        ["account.html", "Account"]
    ];
    const existingHrefs = new Set([...navbar.querySelectorAll("a")].map((link) => link.getAttribute("href")));
    const closeItem = navbar.querySelector(".close-item");
    pageLinks.forEach(([href, label]) => {
        if (existingHrefs.has(href) || existingHrefs.has(`./${href}`)) return;
        const item = document.createElement("li");
        item.innerHTML = `<a href="${href}">${label}</a>`;
        navbar.insertBefore(item, closeItem || null);
    });

    const backdrop = document.createElement("div");
    backdrop.className = "menu-backdrop";
    backdrop.setAttribute("aria-hidden", "true");
    document.body.appendChild(backdrop);

    const setMenuOpen = (isOpen) => {
        navbar.classList.toggle("active", isOpen);
        menuButton.setAttribute("aria-expanded", String(isOpen));
        document.body.classList.toggle("menu-open", isOpen);
    };

    menuButton.setAttribute("role", "button");
    menuButton.setAttribute("tabindex", "0");
    menuButton.setAttribute("aria-controls", "navbar");
    menuButton.setAttribute("aria-expanded", "false");

    const toggleMenu = (event) => {
        event.preventDefault();
        event.stopPropagation();
        setMenuOpen(!navbar.classList.contains("active"));
    };

    menuButton.addEventListener("click", toggleMenu);
    menuButton.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") toggleMenu(event);
    });

    closeButton?.addEventListener("click", (event) => {
        event.preventDefault();
        setMenuOpen(false);
    });

    backdrop.addEventListener("click", () => setMenuOpen(false));

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") setMenuOpen(false);
    });

    navbar.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", () => setMenuOpen(false));
    });

    document.addEventListener("click", (event) => {
        if (!navbar.classList.contains("active")) return;
        if (!navbar.contains(event.target) && !menuButton.contains(event.target)) {
            setMenuOpen(false);
        }
    });

    window.addEventListener("resize", () => {
        if (window.innerWidth > 768) setMenuOpen(false);
    });
})();
