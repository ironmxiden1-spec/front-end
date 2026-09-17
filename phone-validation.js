(() => {
    const networkPrefixes = {
        mtn: ["024", "025", "053", "054", "055", "059"],
        airteltigo: ["026", "027", "056", "057"],
        telecel: ["020", "050"]
    };

    window.wimsPhone = {
        normalize(value) {
            const compact = String(value || "").replace(/[\s-]/g, "");
            if (compact.startsWith("+233")) return `0${compact.slice(4)}`;
            if (compact.startsWith("233")) return `0${compact.slice(3)}`;
            return compact;
        },
        validate(value, network) {
            const phone = this.normalize(value);
            const prefixes = networkPrefixes[network] || [];
            if (!/^0\d{9}$/.test(phone)) {
                return { valid: false, message: "Enter a valid Ghana mobile number with 10 digits." };
            }
            if (!prefixes.some((prefix) => phone.startsWith(prefix))) {
                const label = network === "airteltigo" ? "ATgo" : network.charAt(0).toUpperCase() + network.slice(1);
                return { valid: false, message: `Enter a valid ${label} number for this page.` };
            }
            return { valid: true, value: phone };
        }
    };
})();
