/* ==========================================================================
   cart.js
   --------------------------------------------------------------------------
   Cart stored in localStorage so it survives page navigation.

   Stored shape (only IDs and choices, never prices):
     [{ key: "tulip-trio|Lilac", productId: "tulip-trio", colour: "Lilac", quantity: 2 }]

   Prices are always looked up from PRODUCTS, so an edited localStorage
   value can't change what the customer pays. The future backend must do
   the same check again on the server.
   Depends on: products.js
   ========================================================================== */

const CART_STORAGE_KEY = "pcs_cart_v1";

const Cart = {
  /** Raw stored lines */
  getLines() {
    try {
      const data = JSON.parse(localStorage.getItem(CART_STORAGE_KEY));
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  saveLines(lines) {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(lines));
    updateCartBadge();
  },

  add(productId, colour, quantity = 1) {
    const max = STORE_CONFIG.maxQuantityPerItem;
    const key = `${productId}|${colour}`;
    const lines = this.getLines();
    const existing = lines.find((l) => l.key === key);
    if (existing) {
      existing.quantity = Math.min(max, existing.quantity + quantity);
    } else {
      lines.push({ key, productId, colour, quantity: Math.min(max, quantity) });
    }
    this.saveLines(lines);
  },

  setQuantity(key, quantity) {
    const max = STORE_CONFIG.maxQuantityPerItem;
    const qty = Math.min(max, Math.max(1, Number.parseInt(quantity, 10) || 1));
    const lines = this.getLines().map((l) => (l.key === key ? { ...l, quantity: qty } : l));
    this.saveLines(lines);
  },

  remove(key) {
    this.saveLines(this.getLines().filter((l) => l.key !== key));
  },

  clear() {
    this.saveLines([]);
  },

  count() {
    return this.getLines().reduce((sum, l) => sum + l.quantity, 0);
  },

  /** Lines joined with catalogue data. Lines for deleted products are dropped. */
  getItems() {
    return this.getLines()
      .map((line) => {
        const product = getProductById(line.productId);
        if (!product) return null;
        return {
          ...line,
          product,
          price: product.price,
          lineTotal: product.price * line.quantity,
        };
      })
      .filter(Boolean);
  },

  totals(items = this.getItems()) {
    const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);
    const shipping =
      subtotal === 0 || subtotal >= STORE_CONFIG.freeShippingThreshold ? 0 : STORE_CONFIG.shippingFee;
    return { subtotal, shipping, total: subtotal + shipping };
  },
};

/* HEADER BADGE ----------------------------------------------------------- */

function updateCartBadge() {
  const count = Cart.count();
  document.querySelectorAll("[data-cart-count]").forEach((el) => {
    el.textContent = count;
    el.hidden = count === 0;
  });
}

/* SHARED SUMMARY MARKUP (also used by checkout.js) ---------------------- */

function totalsHTML({ subtotal, shipping, total }) {
  return `
    <div class="summary-row"><span>Subtotal</span><span>${formatPrice(subtotal)}</span></div>
    <div class="summary-row"><span>Shipping</span><span>${shipping === 0 ? "Free" : formatPrice(shipping)}</span></div>
    <div class="summary-row summary-row--total"><span>Total</span><span>${formatPrice(total)}</span></div>`;
}

/* CART PAGE -------------------------------------------------------------- */

function cartItemHTML(item) {
  const max = STORE_CONFIG.maxQuantityPerItem;
  const url = `product.html?id=${encodeURIComponent(item.productId)}`;
  return `
    <article class="cart-item" data-key="${escapeHTML(item.key)}">
      <a class="cart-item__media" href="${url}" tabindex="-1" aria-hidden="true">
        <img src="${getProductImage(item.product)}" alt="" width="96" height="96">
      </a>
      <div class="cart-item__info">
        <h3 class="cart-item__name"><a href="${url}">${escapeHTML(item.product.name)}</a></h3>
        <p class="muted">Colour: ${escapeHTML(item.colour)}</p>
        <p class="muted">${formatPrice(item.price)} each</p>
      </div>
      <div class="cart-item__actions">
        <div class="qty-stepper qty-stepper--small">
          <button type="button" data-action="decrease" aria-label="Decrease quantity" ${item.quantity <= 1 ? "disabled" : ""}>−</button>
          <input type="number" inputmode="numeric" min="1" max="${max}" value="${item.quantity}" data-action="quantity" aria-label="Quantity for ${escapeHTML(item.product.name)}">
          <button type="button" data-action="increase" aria-label="Increase quantity" ${item.quantity >= max ? "disabled" : ""}>+</button>
        </div>
        <p class="cart-item__total">${formatPrice(item.lineTotal)}</p>
        <button type="button" class="link-button" data-action="remove">Remove</button>
      </div>
    </article>`;
}

function renderCartPage() {
  const root = document.getElementById("cart-root");
  if (!root) return;

  const items = Cart.getItems();
  if (items.length === 0) {
    root.innerHTML = `
      <div class="empty-state">
        <h2>Your cart is empty</h2>
        <p>Pick a flower, bouquet or keychain to get started.</p>
        <a class="btn btn--primary" href="products.html">Shop products</a>
      </div>`;
    return;
  }

  const totals = Cart.totals(items);
  const remaining = STORE_CONFIG.freeShippingThreshold - totals.subtotal;
  const shippingHint =
    remaining > 0
      ? `<p class="summary-hint">Add ${formatPrice(remaining)} more for free shipping.</p>`
      : `<p class="summary-hint">Your order ships free.</p>`;

  root.innerHTML = `
    <div class="two-col">
      <div class="cart-list">${items.map(cartItemHTML).join("")}</div>
      <aside class="summary-card" aria-label="Order summary">
        <h2 class="summary-card__title">Summary</h2>
        ${totalsHTML(totals)}
        ${shippingHint}
        <a class="btn btn--primary btn--block" href="checkout.html">Proceed to checkout</a>
        <a class="btn btn--ghost btn--block" href="products.html">Continue shopping</a>
      </aside>
    </div>`;
}

function bindCartPageEvents() {
  const root = document.getElementById("cart-root");
  if (!root) return;

  root.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const row = btn.closest("[data-key]");
    const key = row.dataset.key;
    const current = Cart.getLines().find((l) => l.key === key);
    if (!current) return;

    if (btn.dataset.action === "increase") Cart.setQuantity(key, current.quantity + 1);
    if (btn.dataset.action === "decrease") Cart.setQuantity(key, current.quantity - 1);
    if (btn.dataset.action === "remove") {
      Cart.remove(key);
      showToast("Item removed from your cart.");
    }
    renderCartPage();
  });

  root.addEventListener("change", (e) => {
    if (e.target.dataset.action !== "quantity") return;
    Cart.setQuantity(e.target.closest("[data-key]").dataset.key, e.target.value);
    renderCartPage();
  });
}

/* PAGE BOOTSTRAP --------------------------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {
  updateCartBadge();
  if (document.body.dataset.page === "cart") {
    renderCartPage();
    bindCartPageEvents();
  }
});

// Keep the badge in sync if the cart changes in another tab.
window.addEventListener("storage", (e) => {
  if (e.key === CART_STORAGE_KEY) {
    updateCartBadge();
    if (document.body.dataset.page === "cart") renderCartPage();
  }
});
