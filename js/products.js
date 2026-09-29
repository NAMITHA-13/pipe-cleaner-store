/* ==========================================================================
   products.js
   --------------------------------------------------------------------------
   1. Store configuration (brand name, currency, shipping rules)
   2. Product catalogue (sample data - replace with your real products)
   3. Shared helpers (price formatting, escaping, placeholders, toast)
   4. Page rendering: Home (featured), Products (grid + filters),
      Product Details
   Loaded on every page, before cart.js and checkout.js.
   ========================================================================== */

/* 1. STORE CONFIGURATION ------------------------------------------------- */

const STORE_CONFIG = {
  brandName: "Brand Name",              // TODO: your real brand name
  tagline: "Handmade pipe-cleaner flowers and gifts",
  currency: "INR",
  locale: "en-IN",
  shippingFee: 60,                      // flat shipping fee
  freeShippingThreshold: 999,           // free shipping at or above this subtotal
  maxQuantityPerItem: 20,

  // Shown on invoice PDFs. Replace with your real details.
  businessEmail: "mnamithapawar@gmail.com",
  businessPhone: "+919482858635",
  businessAddress: "Bengaluru, Karnataka",
  gstin: "",                            // add your GSTIN here if you register for GST
};

const CATEGORIES = ["Flowers", "Bouquets", "Gifts", "Keychains"];

/* 2. PRODUCT CATALOGUE ---------------------------------------------------
   - id:      unique, URL-safe. Later this becomes product_id in order_items.
   - image:   leave "" to use the generated placeholder, or set a path such
              as "images/sunny-sunflower.jpg" once you have photos.
   - colours: the first colour is the default selection.
   ------------------------------------------------------------------------ */

const PRODUCTS = [
  {
    id: "sunny-sunflower",
    name: "Sunny Sunflower Stem",
    category: "Flowers",
    price: 149,
    description:
      "A single sunflower twisted from soft chenille stems, with a textured centre and a bendable stem. It never wilts, so it brightens a desk or bookshelf all year.",
    colours: [
      { name: "Sunshine Yellow", hex: "#F5B82E" },
      { name: "Marigold", hex: "#F08A24" },
    ],
    image: "",
    featured: true,
  },
  {
    id: "tulip-trio",
    name: "Tulip Trio",
    category: "Flowers",
    price: 249,
    description:
      "Three hand-shaped tulips on sturdy green stems. Pick one colour, or tell us in the order notes if you'd like a mix.",
    colours: [
      { name: "Blush Pink", hex: "#EE6C9B" },
      { name: "Lilac", hex: "#A98BE0" },
      { name: "Cherry Red", hex: "#D8344B" },
    ],
    image: "",
    featured: true,
  },
  {
    id: "forever-rose",
    name: "Forever Rose",
    category: "Flowers",
    price: 129,
    description:
      "A classic spiral rose with two leaves. A small gift that lasts much longer than fresh flowers.",
    colours: [
      { name: "Cherry Red", hex: "#D8344B" },
      { name: "Blush Pink", hex: "#EE6C9B" },
      { name: "Snow White", hex: "#C9C3D6" },
    ],
    image: "",
    featured: false,
  },
  {
    id: "mini-meadow-bouquet",
    name: "Mini Meadow Bouquet",
    category: "Bouquets",
    price: 499,
    description:
      "Five small wildflowers bundled with a ribbon. Sized for a bedside table or a small vase.",
    colours: [
      { name: "Pastel Mix", hex: "#A98BE0" },
      { name: "Sunset Mix", hex: "#F08A24" },
    ],
    image: "",
    featured: true,
  },
  {
    id: "pastel-dream-bouquet",
    name: "Pastel Dream Bouquet",
    category: "Bouquets",
    price: 799,
    description:
      "Nine mixed blooms in soft pastels, wrapped in kraft paper. Our most popular gift for birthdays and anniversaries.",
    colours: [
      { name: "Pastel Mix", hex: "#A98BE0" },
      { name: "Pink Mix", hex: "#EE6C9B" },
    ],
    image: "",
    featured: false,
  },
  {
    id: "bloom-gift-box",
    name: "Bloom Gift Box",
    category: "Gifts",
    price: 649,
    description:
      "A keepsake box with three flowers, a matching keychain and a handwritten note card. Add your message in the order notes.",
    colours: [
      { name: "Blush Pink", hex: "#EE6C9B" },
      { name: "Teal", hex: "#2FA39A" },
    ],
    image: "",
    featured: true,
  },
  {
    id: "bunny-keychain",
    name: "Bunny Keychain",
    category: "Keychains",
    price: 179,
    description:
      "A tiny fuzzy bunny on a metal keyring. Light enough for keys, bags or zipper pulls.",
    colours: [
      { name: "Snow White", hex: "#C9C3D6" },
      { name: "Blush Pink", hex: "#EE6C9B" },
      { name: "Lilac", hex: "#A98BE0" },
    ],
    image: "",
    featured: false,
  },
  {
    id: "heart-keychain",
    name: "Heart Keychain",
    category: "Keychains",
    price: 149,
    description:
      "A twisted heart charm on a keyring. Buy two in matching colours for a friendship set.",
    colours: [
      { name: "Cherry Red", hex: "#D8344B" },
      { name: "Teal", hex: "#2FA39A" },
      { name: "Sunshine Yellow", hex: "#F5B82E" },
    ],
    image: "",
    featured: false,
  },
];

/* 3. SHARED HELPERS ------------------------------------------------------ */

function getProductById(id) {
  return PRODUCTS.find((p) => p.id === id) || null;
}

function formatPrice(amount) {
  return new Intl.NumberFormat(STORE_CONFIG.locale, {
    style: "currency",
    currency: STORE_CONFIG.currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Escape text before inserting it into HTML (always use for user input). */
function escapeHTML(value) {
  const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return String(value ?? "").replace(/[&<>"']/g, (ch) => map[ch]);
}

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

/**
 * Generates an SVG placeholder "photo": a pipe-cleaner-style flower in the
 * product's colours plus the product name. Returned as a data URI so it
 * works in <img src> with no image files at all.
 */
function placeholderImage(product) {
  const main = product.colours?.[0]?.hex || "#EE6C9B";
  const second = product.colours?.[1]?.hex || "#F5B82E";
  const name = escapeHTML(product.name);
  const petals = [0, 72, 144, 216, 288]
    .map(
      (deg) =>
        `<ellipse cx="0" cy="-50" rx="24" ry="46" transform="rotate(${deg})" fill="none" stroke="${main}" stroke-width="11"/>`
    )
    .join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
    <rect width="400" height="400" fill="#FFFFFF"/>
    <rect width="400" height="400" fill="${main}" opacity="0.12"/>
    <path d="M200 176 C 190 230, 214 262, 200 300" fill="none" stroke="#5E9A55" stroke-width="10" stroke-linecap="round"/>
    <path d="M202 256 C 226 236, 250 238, 262 248 C 244 262, 222 264, 202 256Z" fill="none" stroke="#5E9A55" stroke-width="8" stroke-linejoin="round"/>
    <g transform="translate(200 146)">${petals}<circle r="20" fill="${second}"/></g>
    <text x="200" y="344" text-anchor="middle" font-family="Georgia, serif" font-size="22" fill="#2A2140">${name}</text>
    <text x="200" y="370" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" fill="#6B6380">Photo coming soon</text>
  </svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

function getProductImage(product) {
  return product.image || placeholderImage(product);
}

/** Small notification at the bottom of the screen. */
function showToast(message, link) {
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.className = "toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    document.body.appendChild(toast);
  }
  toast.innerHTML =
    `<span>${escapeHTML(message)}</span>` +
    (link ? ` <a href="${escapeHTML(link.href)}">${escapeHTML(link.text)}</a>` : "");
  toast.classList.add("is-visible");
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => toast.classList.remove("is-visible"), 3200);
}

/** Fills every [data-brand] element with the brand name, and the footer year. */
function applyBrand() {
  document.querySelectorAll("[data-brand]").forEach((el) => {
    el.textContent = STORE_CONFIG.brandName;
  });
  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = new Date().getFullYear();
  });
}

/* 4. RENDERING ----------------------------------------------------------- */

function productCardHTML(product) {
  const url = `product.html?id=${encodeURIComponent(product.id)}`;
  return `
    <article class="product-card">
      <a class="product-card__media" href="${url}" tabindex="-1" aria-hidden="true">
        <img src="${getProductImage(product)}" alt="" loading="lazy" width="400" height="400">
      </a>
      <div class="product-card__body">
        <p class="product-card__category">${escapeHTML(product.category)}</p>
        <h3 class="product-card__name"><a href="${url}">${escapeHTML(product.name)}</a></h3>
        <p class="product-card__price">${formatPrice(product.price)}</p>
        <a class="btn btn--outline btn--small" href="${url}">View details</a>
      </div>
    </article>`;
}

/* Home page: featured products */
function renderFeatured() {
  const grid = document.getElementById("featured-grid");
  if (!grid) return;
  grid.innerHTML = PRODUCTS.filter((p) => p.featured).slice(0, 4).map(productCardHTML).join("");
}

/* Products page: category filters + grid. Supports products.html?category=Gifts */
function renderProductsPage() {
  const filtersEl = document.getElementById("category-filters");
  const grid = document.getElementById("product-grid");
  const countEl = document.getElementById("product-count");
  if (!filtersEl || !grid) return;

  const fromUrl = getQueryParam("category");
  let active = CATEGORIES.includes(fromUrl) ? fromUrl : "All";

  function draw() {
    filtersEl.innerHTML = ["All", ...CATEGORIES]
      .map(
        (cat) =>
          `<button type="button" class="filter-chip" data-category="${cat}" aria-pressed="${cat === active}">${cat}</button>`
      )
      .join("");

    const list = active === "All" ? PRODUCTS : PRODUCTS.filter((p) => p.category === active);
    grid.innerHTML = list.map(productCardHTML).join("");
    if (countEl) countEl.textContent = `${list.length} ${list.length === 1 ? "product" : "products"}`;
  }

  filtersEl.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-category]");
    if (!btn) return;
    active = btn.dataset.category;
    const url = new URL(window.location.href);
    if (active === "All") url.searchParams.delete("category");
    else url.searchParams.set("category", active);
    history.replaceState(null, "", url);
    draw();
  });

  draw();
}

/* Product details page: product.html?id=tulip-trio */
function renderProductDetail() {
  const root = document.getElementById("product-detail");
  if (!root) return;

  const product = getProductById(getQueryParam("id"));
  if (!product) {
    root.innerHTML = `
      <div class="empty-state">
        <h1>We couldn't find that product</h1>
        <p>It may have been removed, or the link is incomplete.</p>
        <a class="btn btn--primary" href="products.html">Browse all products</a>
      </div>`;
    return;
  }

  document.title = `${product.name} | ${STORE_CONFIG.brandName}`;
  const max = STORE_CONFIG.maxQuantityPerItem;

  const swatches = product.colours
    .map(
      (c, i) => `
      <label class="swatch" title="${escapeHTML(c.name)}">
        <input type="radio" name="colour" value="${escapeHTML(c.name)}" ${i === 0 ? "checked" : ""}>
        <span class="swatch__dot" style="--swatch:${c.hex}"></span>
        <span class="sr-only">${escapeHTML(c.name)}</span>
      </label>`
    )
    .join("");

  root.innerHTML = `
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <a href="products.html">Shop</a> /
      <a href="products.html?category=${encodeURIComponent(product.category)}">${escapeHTML(product.category)}</a> /
      <span aria-current="page">${escapeHTML(product.name)}</span>
    </nav>

    <div class="product-detail">
      <div class="product-detail__media">
        <img src="${getProductImage(product)}" alt="${escapeHTML(product.name)}" width="400" height="400">
      </div>

      <div class="product-detail__info">
        <p class="product-card__category">${escapeHTML(product.category)}</p>
        <h1 class="product-detail__name">${escapeHTML(product.name)}</h1>
        <p class="product-detail__price">${formatPrice(product.price)}</p>
        <p class="product-detail__desc">${escapeHTML(product.description)}</p>

        <fieldset class="option-group">
          <legend>Colour: <strong id="selected-colour">${escapeHTML(product.colours[0].name)}</strong></legend>
          <div class="swatches">${swatches}</div>
        </fieldset>

        <div class="option-group">
          <label for="qty-input">Quantity</label>
          <div class="qty-stepper">
            <button type="button" data-step="-1" aria-label="Decrease quantity">−</button>
            <input id="qty-input" type="number" inputmode="numeric" min="1" max="${max}" value="1">
            <button type="button" data-step="1" aria-label="Increase quantity">+</button>
          </div>
        </div>

        <button id="add-to-cart" class="btn btn--primary btn--block" type="button">Add to cart</button>

        <ul class="product-detail__notes">
          <li>Handmade to order, ships in 3 to 5 days</li>
          <li>Free shipping on orders over ${formatPrice(STORE_CONFIG.freeShippingThreshold)}</li>
        </ul>
      </div>
    </div>`;

  const qtyInput = root.querySelector("#qty-input");
  const clampQty = (n) => Math.min(max, Math.max(1, Number.parseInt(n, 10) || 1));

  root.querySelectorAll('input[name="colour"]').forEach((input) =>
    input.addEventListener("change", () => {
      root.querySelector("#selected-colour").textContent = input.value;
    })
  );

  root.querySelectorAll("[data-step]").forEach((btn) =>
    btn.addEventListener("click", () => {
      qtyInput.value = clampQty(Number(qtyInput.value) + Number(btn.dataset.step));
    })
  );
  qtyInput.addEventListener("change", () => (qtyInput.value = clampQty(qtyInput.value)));

  root.querySelector("#add-to-cart").addEventListener("click", () => {
    const colour = root.querySelector('input[name="colour"]:checked').value;
    const qty = clampQty(qtyInput.value);
    Cart.add(product.id, colour, qty);
    showToast(`Added ${qty} × ${product.name} (${colour}) to your cart.`, {
      href: "cart.html",
      text: "View cart",
    });
  });
}

/* PAGE BOOTSTRAP --------------------------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {
  applyBrand();
  const page = document.body.dataset.page;
  if (page === "home") renderFeatured();
  if (page === "products") renderProductsPage();
  if (page === "product") renderProductDetail();
});
