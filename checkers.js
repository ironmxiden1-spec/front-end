(() => {
  const apiBase = window.APP_CONFIG?.API_BASE || (/localhost|127\.0\.0\.1/.test(window.location.hostname) ? "http://localhost:5000/api" : "/api");
  const container = document.getElementById("checker-products");

  async function loadProducts() {
    try {
      const response = await fetch(`${apiBase}/datamart/checkers/products`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Unable to load checker cards");
      const products = Array.isArray(payload.data) ? payload.data : [];
      container.innerHTML = products.length ? products.map((product) => `<article class="checker-card${product.inStock ? "" : " sold-out"}"><div><p class="eyebrow">${product.inStock ? "AVAILABLE NOW" : "OUT OF STOCK"}</p><h2>${product.name || "Result checker"}</h2><p>${product.description || "Digital result checker card"}</p></div><div class="card-meta"><span class="price">GHS ${Number(product.price || 0).toFixed(2)}</span><span class="stock">${Number(product.stockCount || 0).toLocaleString()} in stock</span></div></article>`).join("") : "<p class=\"loading\">No checker cards are available right now.</p>";
    } catch (error) {
      container.innerHTML = `<p class="loading">${error.message}</p>`;
    }
  }

  loadProducts();
})();
