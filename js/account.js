/* ==========================================================================
   account.js
   --------------------------------------------------------------------------
   - Login page (login.html): log in or create an account (email + password)
   - Account page (account.html): shows the customer's own orders, log out
   Depends on: supabase-client.js, products.js, cart.js, checkout.js
   ========================================================================== */

const MIN_PASSWORD_LENGTH = 8;

const EYE_ICON =
  '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_OFF_ICON =
  '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/><path d="M3 3l18 18"/></svg>';

const ORDER_STATUS_LABELS = {
  pending: "Received",
  confirmed: "Confirmed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

/** Turns Supabase's technical error messages into plain ones. */
function friendlyAuthError(error) {
  const msg = String((error && error.message) || "").toLowerCase();
  if (msg.includes("invalid login")) return "Email or password is wrong. Check them and try again.";
  if (msg.includes("already registered") || msg.includes("already been registered")) {
    return "An account with this email already exists. Log in instead.";
  }
  if (msg.includes("email not confirmed")) return "Confirm your email first, using the link we sent you.";
  if (msg.includes("rate limit") || msg.includes("too many")) return "Too many tries. Wait a few minutes and try again.";
  if (msg.includes("password")) return error.message;
  return "Something went wrong. Check your connection and try again.";
}

/* LOGIN PAGE ------------------------------------------------------------- */

async function initLoginPage() {
  const form = document.getElementById("auth-form");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const message = document.getElementById("auth-message");
  const submitBtn = document.getElementById("auth-submit");
  const switchBtn = document.getElementById("switch-mode");


    // Eye button: show or hide the password
  const toggleBtn = document.getElementById("password-toggle");
  toggleBtn.addEventListener("click", () => {
    const show = passwordInput.type === "password";
    passwordInput.type = show ? "text" : "password";
    toggleBtn.setAttribute("aria-pressed", String(show));
    toggleBtn.setAttribute("aria-label", show ? "Hide password" : "Show password");
    toggleBtn.innerHTML = show ? EYE_OFF_ICON : EYE_ICON;
    passwordInput.focus();
  });
  function showMessage(text) {
    message.textContent = text;
    message.hidden = !text;
  }

  if (!db) {
    showMessage("We couldn't connect. Check your internet and refresh the page.");
    submitBtn.disabled = true;
    return;
  }

  // Already logged in? Go straight to the account page.
  const { data: { session } } = await db.auth.getSession();
  if (session) {
    window.location.replace("account.html");
    return;
  }

  let mode = getQueryParam("mode") === "signup" ? "signup" : "login";

  function setMode(newMode) {
    mode = newMode;
    const signup = mode === "signup";
    document.title = `${signup ? "Create an account" : "Log in"} | ${STORE_CONFIG.brandName}`;
    document.getElementById("auth-title").textContent = signup ? "Create an account" : "Log in";
    document.getElementById("auth-intro").textContent = signup
      ? "Create an account to keep track of your orders."
      : "Log in to see your orders.";
    document.getElementById("switch-text").textContent = signup ? "Already have an account?" : "New here?";
    switchBtn.textContent = signup ? "Log in" : "Create an account";
    submitBtn.textContent = signup ? "Create account" : "Log in";
    passwordInput.autocomplete = signup ? "new-password" : "current-password";
    setFieldError(emailInput, "");
    setFieldError(passwordInput, "");
    showMessage("");
  }

  setMode(mode);
  switchBtn.addEventListener("click", () => setMode(mode === "login" ? "signup" : "login"));

  function validate() {
    const emailCheck = VALIDATORS.email(emailInput.value);
    setFieldError(emailInput, emailCheck === true ? "" : emailCheck);

    let passwordError = "";
    if (!passwordInput.value) passwordError = "Enter your password.";
    else if (mode === "signup" && passwordInput.value.length < MIN_PASSWORD_LENGTH) {
      passwordError = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
    }
    setFieldError(passwordInput, passwordError);

    if (emailCheck !== true) emailInput.focus();
    else if (passwordError) passwordInput.focus();
    return emailCheck === true && !passwordError;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    showMessage("");
    if (!validate()) return;

    const credentials = { email: emailInput.value.trim(), password: passwordInput.value };
    const buttonText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = "Please wait…";

    const { data, error } =
      mode === "signup"
        ? await db.auth.signUp(credentials)
        : await db.auth.signInWithPassword(credentials);

    if (error) {
      showMessage(friendlyAuthError(error));
      submitBtn.disabled = false;
      submitBtn.textContent = buttonText;
      return;
    }

    // If email confirmation is switched on in Supabase, there is no session yet.
    if (mode === "signup" && !data.session) {
      submitBtn.disabled = false;
      setMode("login");
      showMessage("Account created. Check your email for a link to confirm it, then log in.");
      return;
    }

    // Only allow redirects to our own pages, e.g. login.html?next=checkout.html
    const next = getQueryParam("next");
    window.location.href = next && /^[a-z-]+\.html$/.test(next) ? next : "account.html";
  });
}

/* ACCOUNT PAGE ----------------------------------------------------------- */

function accountOrderHTML(order) {
  const placed = new Date(order.created_at).toLocaleDateString(STORE_CONFIG.locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const status = ORDER_STATUS_LABELS[order.status] ? order.status : "pending";
  return `
    <article class="summary-card order-card">
      <div class="order-card__head">
        <div>
          <p class="order-card__id">${escapeHTML(order.order_id)}</p>
          <p class="muted small">Placed on ${escapeHTML(placed)}</p>
        </div>
        <span class="status-pill status-pill--${status}">${ORDER_STATUS_LABELS[status]}</span>
      </div>
      ${orderItemsHTML(order.order_items || [])}
      ${totalsHTML(order)}
    </article>`;
}

async function initAccountPage() {
  const root = document.getElementById("orders-root");

  if (!db) {
    root.innerHTML = `<p class="muted">We couldn't connect. Check your internet and refresh the page.</p>`;
    return;
  }

  const { data: { session } } = await db.auth.getSession();
  if (!session) {
    window.location.replace("login.html");
    return;
  }

  document.getElementById("account-email").textContent = session.user.email;

  document.getElementById("logout").addEventListener("click", async () => {
    await db.auth.signOut();
    window.location.href = "index.html";
  });

  const { data: orders, error } = await db
    .from("orders")
    .select("order_id, created_at, status, subtotal, shipping, total, order_items(product_name, quantity, price, colour)")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    root.innerHTML = `<p class="muted">Your orders didn't load. Refresh the page to try again.</p>`;
    return;
  }

  if (orders.length === 0) {
    root.innerHTML = `
      <div class="empty-state">
        <h3>No orders yet</h3>
        <p>Orders you place while logged in will show up here.</p>
        <a class="btn btn--primary" href="products.html">Shop products</a>
      </div>`;
    return;
  }

  root.innerHTML = `<div class="orders-list">${orders.map(accountOrderHTML).join("")}</div>`;
}

/* PAGE BOOTSTRAP --------------------------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;
  if (page === "login") initLoginPage();
  if (page === "account") initAccountPage();
});
