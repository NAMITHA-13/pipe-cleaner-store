/* ==========================================================================
   checkout.js
   --------------------------------------------------------------------------
   - Checkout page: order summary, form validation, building the order
   - submitOrder(): the ONE place to swap in your backend API later
   - Success page: shows the confirmed order
   Depends on: products.js, cart.js

   The order object mirrors the planned database tables:
     orders       -> order_id, customer_name, phone, email, delivery_address,
                     notes, subtotal, shipping, total, status, invoice_url,
                     created_at
     order_items  -> product_id, product_name, quantity, price, colour
   ========================================================================== */

const LAST_ORDER_KEY = "pcs_last_order_v1";

// FUTURE: set this when the backend exists, e.g. "https://api.yourdomain.com"
const API_BASE_URL = null;

/* ORDER HELPERS ---------------------------------------------------------- */

/**
 * Temporary client-side ID, e.g. PC-20260929-K7QX.
 * FUTURE: the backend should generate the real order_id.
 */
function generateOrderId() {
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase().padEnd(4, "0");
  return `PC-${date}-${rand}`;
}

/** Cart items -> rows shaped like the future order_items table. */
function toOrderItems(cartItems) {
  return cartItems.map((i) => ({
    product_id: i.productId,
    product_name: i.product.name,
    quantity: i.quantity,
    price: i.price,
    colour: i.colour,
  }));
}

function orderItemsHTML(items) {
  return `<ul class="order-items">${items
    .map(
      (i) => `
      <li class="order-item">
        <div>
          <p class="order-item__name">${escapeHTML(i.product_name)}</p>
          <p class="muted">${escapeHTML(i.colour)}, qty ${i.quantity}</p>
        </div>
        <span>${formatPrice(i.price * i.quantity)}</span>
      </li>`
    )
    .join("")}</ul>`;
}

/**
 * Sends the order. Right now it only saves to localStorage.
 *
 * FUTURE (backend + Supabase):
 *   const res = await fetch(`${API_BASE_URL}/orders`, {
 *     method: "POST",
 *     headers: { "Content-Type": "application/json" },
 *     body: JSON.stringify(order),
 *   });
 *   if (!res.ok) throw new Error("Order could not be placed");
 *   return await res.json(); // server returns order_id, totals, invoice_url
 *
 * The server must re-check prices and totals; never trust the browser's numbers.
 */
async function submitOrder(order) {
  if (API_BASE_URL) {
    throw new Error("Backend not implemented yet.");
  }
  localStorage.setItem(LAST_ORDER_KEY, JSON.stringify(order));
  return order;
}

/* INVOICE PDF -------------------------------------------------------------
   Built in the browser with jsPDF (loaded from a CDN on success.html).
   FUTURE: once the backend creates invoices, order.invoice_url is used
   instead and this function is only a fallback.
   Note: jsPDF's built-in fonts have no ₹ glyph, so amounts use "Rs.".
   ------------------------------------------------------------------------ */

function pdfPrice(amount) {
  return "Rs. " + Number(amount).toLocaleString("en-IN");
}

function generateInvoicePDF(order) {
  const jsPDF = window.jspdf && window.jspdf.jsPDF;
  if (!jsPDF) {
    showToast("The invoice tool didn't load. Check your connection and refresh the page.");
    return;
  }

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 48;                              // page margin
  const INK = [42, 33, 64];
  const MUTED = [107, 99, 128];
  const ACCENT = [214, 58, 116];
  const placed = new Date(order.created_at);

  // Header: business on the left, invoice details on the right
  doc.setFont("helvetica", "bold").setFontSize(20).setTextColor(...INK);
  doc.text(STORE_CONFIG.brandName, M, 64);

  doc.setFont("helvetica", "normal").setFontSize(9.5).setTextColor(...MUTED);
  const bizLines = [
    ...String(STORE_CONFIG.businessAddress || "").split("\n"),
    STORE_CONFIG.businessEmail,
    STORE_CONFIG.businessPhone,
    STORE_CONFIG.gstin ? `GSTIN: ${STORE_CONFIG.gstin}` : "",
  ].filter(Boolean);
  doc.text(bizLines, M, 82);

  doc.setFont("helvetica", "bold").setFontSize(22).setTextColor(...ACCENT);
  doc.text("Invoice", pageW - M, 64, { align: "right" });
  doc.setFont("helvetica", "normal").setFontSize(9.5).setTextColor(...MUTED);
  doc.text(
    [
      `Order ID: ${order.order_id}`,
      `Date: ${placed.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`,
      `Payment: ${order.status === "paid" ? "Paid" : "Pending"}`,
    ],
    pageW - M,
    82,
    { align: "right" }
  );

  // Bill to
  let y = Math.max(82 + bizLines.length * 12, 140) + 20;
  doc.setDrawColor(225, 217, 238).line(M, y, pageW - M, y);
  y += 24;
  doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(...INK);
  doc.text("Bill to", M, y);
  doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(...INK);
  const address = doc.splitTextToSize(order.delivery_address, 260);
  const billTo = [order.customer_name, ...address, order.phone, order.email];
  doc.text(billTo, M, y + 16);
  y += 16 + billTo.length * 12 + 16;

  // Items table
  doc.autoTable({
    startY: y,
    margin: { left: M, right: M },
    head: [["Item", "Colour", "Qty", "Unit price", "Amount"]],
    body: order.items.map((i) => [
      i.product_name,
      i.colour,
      String(i.quantity),
      pdfPrice(i.price),
      pdfPrice(i.price * i.quantity),
    ]),
    theme: "striped",
    styles: { font: "helvetica", fontSize: 10, cellPadding: 7, textColor: INK },
    headStyles: { fillColor: INK, textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [246, 243, 252] },
    columnStyles: {
      2: { halign: "center", cellWidth: 44 },
      3: { halign: "right", cellWidth: 84 },
      4: { halign: "right", cellWidth: 90 },
    },
    // Align the headings with the columns below them
    didParseCell: (data) => {
      if (data.section === "head" && data.column.index >= 2) {
        data.cell.styles.halign = data.column.index === 2 ? "center" : "right";
      }
    },
  });

  // Totals, right-aligned under the table
  y = doc.lastAutoTable.finalY + 22;
  const labelX = pageW - M - 150;
  const rows = [
    ["Subtotal", pdfPrice(order.subtotal)],
    ["Shipping", order.shipping === 0 ? "Free" : pdfPrice(order.shipping)],
  ];
  doc.setFontSize(10).setTextColor(...INK);
  rows.forEach(([label, value]) => {
    doc.setFont("helvetica", "normal").text(label, labelX, y);
    doc.text(value, pageW - M, y, { align: "right" });
    y += 16;
  });
  doc.setDrawColor(225, 217, 238).line(labelX, y - 6, pageW - M, y - 6);
  y += 10;
  doc.setFont("helvetica", "bold").setFontSize(12);
  doc.text("Total", labelX, y);
  doc.text(pdfPrice(order.total), pageW - M, y, { align: "right" });

  // Order notes
  if (order.notes) {
    y += 36;
    doc.setFont("helvetica", "bold").setFontSize(10).text("Order notes", M, y);
    doc.setFont("helvetica", "normal").setTextColor(...MUTED);
    doc.text(doc.splitTextToSize(order.notes, pageW - M * 2), M, y + 14);
  }

  // Footer
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(...MUTED);
  doc.text(
    `Thank you for supporting handmade. Questions? Write to ${STORE_CONFIG.businessEmail}`,
    pageW / 2,
    pageH - 40,
    { align: "center" }
  );

  doc.save(`Invoice-${order.order_id}.pdf`);
}

/* CHECKOUT PAGE ---------------------------------------------------------- */

const VALIDATORS = {
  customer_name: (v) => v.trim().length >= 2 || "Enter your full name.",
  phone: (v) => /^\+?[\d\s-]{7,16}$/.test(v.trim()) || "Enter a valid phone number, for example 98765 43210.",
  email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) || "Enter a valid email address, for example name@example.com.",
  delivery_address: (v) => v.trim().length >= 10 || "Enter your full delivery address, including PIN code.",
};

function setFieldError(field, message) {
  const errorEl = document.getElementById(`${field.id}-error`);
  field.setAttribute("aria-invalid", message ? "true" : "false");
  if (errorEl) errorEl.textContent = message || "";
}

function validateField(field) {
  const rule = VALIDATORS[field.name];
  if (!rule) return true;
  const result = rule(field.value);
  setFieldError(field, result === true ? "" : result);
  return result === true;
}

function validateForm(form) {
  let firstInvalid = null;
  Object.keys(VALIDATORS).forEach((name) => {
    const field = form.elements[name];
    if (!validateField(field) && !firstInvalid) firstInvalid = field;
  });
  if (firstInvalid) firstInvalid.focus();
  return !firstInvalid;
}

function renderCheckoutSummary() {
  const summary = document.getElementById("checkout-summary");
  const items = Cart.getItems();
  summary.innerHTML = `
    <h2 class="summary-card__title">Order summary</h2>
    ${orderItemsHTML(toOrderItems(items))}
    ${totalsHTML(Cart.totals(items))}`;
}

function initCheckoutPage() {
  if (Cart.getItems().length === 0) {
    window.location.replace("cart.html");
    return;
  }

  renderCheckoutSummary();

  const form = document.getElementById("checkout-form");
  const submitBtn = document.getElementById("place-order");

  // Re-check a field once the customer leaves it, and clear errors as they fix it.
  form.addEventListener("focusout", (e) => {
    if (VALIDATORS[e.target.name] && e.target.value) validateField(e.target);
  });
  form.addEventListener("input", (e) => {
    if (e.target.getAttribute("aria-invalid") === "true") validateField(e.target);
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!validateForm(form)) return;

    const cartItems = Cart.getItems();
    if (cartItems.length === 0) {
      window.location.replace("cart.html");
      return;
    }

    const data = new FormData(form);
    const totals = Cart.totals(cartItems);
    const order = {
      order_id: generateOrderId(),
      customer_name: data.get("customer_name").trim(),
      phone: data.get("phone").trim(),
      email: data.get("email").trim(),
      delivery_address: data.get("delivery_address").trim(),
      notes: (data.get("notes") || "").trim(),
      subtotal: totals.subtotal,
      shipping: totals.shipping,
      total: totals.total,
      status: "pending",
      invoice_url: null,
      created_at: new Date().toISOString(),
      items: toOrderItems(cartItems),
    };

    submitBtn.disabled = true;
    submitBtn.textContent = "Placing order…";

    try {
      const saved = await submitOrder(order);
      Cart.clear();
      window.location.href = `success.html?order=${encodeURIComponent(saved.order_id)}`;
    } catch (err) {
      console.error(err);
      showToast("Your order wasn't placed. Check your connection and try again.");
      submitBtn.disabled = false;
      submitBtn.textContent = "Place order";
    }
  });
}

/* SUCCESS PAGE ----------------------------------------------------------- */

function initSuccessPage() {
  const root = document.getElementById("success-root");
  let order = null;
  try {
    order = JSON.parse(localStorage.getItem(LAST_ORDER_KEY));
  } catch {
    order = null;
  }

  const requestedId = getQueryParam("order");
  if (!order || (requestedId && requestedId !== order.order_id)) {
    root.innerHTML = `
      <div class="empty-state">
        <h1>No recent order found</h1>
        <p>This page shows your order after checkout. Start by adding something to your cart.</p>
        <a class="btn btn--primary" href="products.html">Shop products</a>
      </div>`;
    return;
  }

  const placedAt = new Date(order.created_at).toLocaleString(STORE_CONFIG.locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  root.innerHTML = `
    <div class="success">
      <div class="success__badge" aria-hidden="true">
        <svg viewBox="0 0 48 48" width="48" height="48"><path d="M12 25 L21 34 L37 15" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
      <h1 class="success__title">Order Confirmed</h1>
      <p class="success__lead">Thank you, ${escapeHTML(order.customer_name.split(" ")[0])}. We've received your order and will start making it soon.</p>

      <div class="order-id">
        <span class="muted">Order ID</span>
        <strong id="order-id-value">${escapeHTML(order.order_id)}</strong>
        <button type="button" class="link-button" id="copy-order-id">Copy</button>
      </div>

      <div class="success__grid">
        <section class="summary-card">
          <h2 class="summary-card__title">Order summary</h2>
          ${orderItemsHTML(order.items)}
          ${totalsHTML(order)}
        </section>

        <section class="summary-card">
          <h2 class="summary-card__title">Delivery details</h2>
          <dl class="details-list">
            <dt>Placed on</dt><dd>${escapeHTML(placedAt)}</dd>
            <dt>Name</dt><dd>${escapeHTML(order.customer_name)}</dd>
            <dt>Phone</dt><dd>${escapeHTML(order.phone)}</dd>
            <dt>Email</dt><dd>${escapeHTML(order.email)}</dd>
            <dt>Address</dt><dd class="pre-line">${escapeHTML(order.delivery_address)}</dd>
            ${order.notes ? `<dt>Notes</dt><dd class="pre-line">${escapeHTML(order.notes)}</dd>` : ""}
          </dl>
        </section>
      </div>

      <div class="success__actions">
        <button type="button" class="btn btn--outline" id="download-invoice">Download invoice PDF</button>
        <a class="btn btn--primary" href="products.html">Continue shopping</a>
      </div>
      <p class="muted small">Download your invoice now. It stays available on this device until you place another order.</p>
    </div>`;

  // Uses the server's invoice when the backend provides one, otherwise builds it here.
  document.getElementById("download-invoice").addEventListener("click", () => {
    if (order.invoice_url) {
      window.open(order.invoice_url, "_blank", "noopener");
    } else {
      generateInvoicePDF(order);
    }
  });

  document.getElementById("copy-order-id").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(order.order_id);
      showToast("Order ID copied.");
    } catch {
      showToast(`Your order ID is ${order.order_id}`);
    }
  });
}

/* PAGE BOOTSTRAP --------------------------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;
  if (page === "checkout") initCheckoutPage();
  if (page === "success") initSuccessPage();
});
