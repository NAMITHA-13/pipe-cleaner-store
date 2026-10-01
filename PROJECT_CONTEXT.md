# Hoovu Studio (pipe-cleaner store): project context

Last updated: 1 Oct 2026

## About the business
- Handmade pipe-cleaner craft business run by Namitha and a friend, based in Bengaluru.
- Products: flowers, bouquets, gifts, keychains.
- Brand name: **Hoovu Studio** (Kannada: ಹೂವು ಸ್ಟುಡಿಯೋ). *Hoovu* means flower in Kannada.
- Business email: **hoovustudio@gmail.com** (created 1 Oct 2026). Personal email mnamithapawar@gmail.com is still in STORE_CONFIG and should be swapped later.

## Tech setup
- Plain HTML, CSS, JavaScript. No framework, no build step. Free plans only.
- Hosted free on GitHub Pages.
- Live site: https://namitha-13.github.io/pipe-cleaner-store/
- GitHub repo: https://github.com/NAMITHA-13/pipe-cleaner-store (public, branch `main`, Pages from `/ (root)`)
- Local folder: `C:\Projects\pipe-cleaner-store` (Windows 11), edited in VS Code
- Tools installed: Git 2.55, Python 3.12 (use `py`, not `python`)
- Namitha prefers: step-by-step Windows instructions, small "find this, replace with this" edits
  (not full files) for existing files, one step at a time.

## Backend: Supabase (free plan)
- Project: `hoovu-studio`, organization "Hoovu Studio", region Asia-Pacific.
- Project URL: https://infpxbmyjhxuwtgxsquc.supabase.co
- Publishable key (safe in the browser): in `js/supabase-client.js`. Secret / service_role keys are never put in code.
- Created with "Automatically expose new tables" OFF and "Automatic RLS" ON, so every table needs explicit GRANTs and RLS policies.
- Free plan: pauses after 7 days with no activity (restore from supabase.com), no automatic backups.
- Database setup script: `supabase/01_setup.sql` (already run once; do not run again).
  - Tables: `products`, `orders`, `order_items`, `admins`
  - `place_order(payload jsonb)`: the only way to create orders. Recalculates prices from `products`,
    shipping (Rs. 60, free at Rs. 999+), total, validates colour/quantity/details, and generates the order ID
    `HS-YYYYMMDD-XXXX` (India date). Sets `user_id` to the logged-in customer, or NULL for guests.
  - RLS: products are public; customers see only their own orders; admins (rows in `admins`) see and can update all orders (status only).
- Auth: email + password. **"Confirm email" is currently OFF** because Supabase's built-in email only sends to the project team.

## IMPORTANT: products live in two places
When adding or changing a product, price or colour, change BOTH:
1. `PRODUCTS` in `js/products.js` (what customers see)
2. Supabase Table Editor → `products` (what the server charges)
If they don't match, checkout shows an error. Planned improvement: load products only from Supabase.

## Folder structure
```
pipe-cleaner-store/
├── index.html          Home: hero, featured products, categories
├── products.html       All products + category filter (?category=Flowers)
├── product.html        Product details (?id=tulip-trio): colour, quantity, add to cart
├── cart.html           Cart: quantity +/-, remove, subtotal, shipping, total
├── checkout.html       Form + order summary; loads Supabase
├── success.html        Order Confirmed: order ID, summary, invoice PDF download
├── login.html          Log in / create account (email + password, show-password eye button)
├── account.html        "Your account": email, log out, "Your orders" (only orders placed while logged in)
├── css/style.css       All styles; design tokens in :root at the top
├── js/products.js      STORE_CONFIG, CATEGORIES, PRODUCTS, helpers, page rendering, addAccountLink()
├── js/cart.js          Cart module (localStorage key "pcs_cart_v1"), cart page
├── js/checkout.js      Validation, order object, submitOrder() -> Supabase place_order, success page, invoice PDF
├── js/supabase-client.js  Supabase URL + publishable key, creates `db`
├── js/account.js       Login page + account page logic
├── supabase/01_setup.sql  Database setup (record only; already run)
├── images/logo.png     Logo (420x181, transparent PNG, made with ChatGPT)
└── README.md
```

## Branding (done)
- Header logo: `images/logo.png` (fuzzy pipe-cleaner "Hoovu" wordmark with a flower as the second o, "STUDIO" below).
  Shown at 44px high on desktop, 36px on phones (`img.brand__logo` in style.css).
- Next to the logo: Kannada name ಹೂವು ಸ್ಟುಡಿಯೋ (`.brand__kn`, font Baloo Tamma 2).
- English text name "Hoovu Studio 🌸" (`.brand__en`, font Pacifico) is now hidden with `.brand__en { display: none; }` because the logo shows the name.
- Fonts loaded with `@import` on line 1 of style.css: Pacifico + Baloo Tamma 2. Variables `--font-brand`, `--font-brand-kn`.
- Header person icon (account link) is added by `addAccountLink()` in products.js on every page.
- `STORE_CONFIG.brandName` = "Hoovu Studio"; page titles end with "| Hoovu Studio".

## What is done
1. Full customer flow: Home → Products → Product → Cart → Checkout → Order Confirmed.
2. Orders are saved in Supabase (tested 1 Oct 2026). Prices/totals/order ID come from the server.
3. Customer accounts: sign up, log in, log out, see own orders with status (Received/Confirmed/Shipped/Delivered/Cancelled).
4. Invoice PDF download on the success page (jsPDF in the browser; amounts print as "Rs.").
5. Mobile responsive, logo and Kannada name on all pages.

## In progress: email verification with Brevo (free)
Plan (one step at a time, wait for confirmation between steps):
1. Create free Brevo account → DONE (signed up with hoovustudio@gmail.com, Free plan, 300 emails/day).
   Still to confirm: phone verified by SMS in Brevo.
2. Get Brevo SMTP details (host smtp-relay.brevo.com, port 587, SMTP login, SMTP key) and enter them in
   Supabase → Authentication → Emails → SMTP Settings. Never paste the SMTP key in chat or code.
3. Sender email/name: hoovustudio@gmail.com, "Hoovu Studio". Note: with a Gmail sender (no own domain), Brevo may
   replace the visible sender with a brevosend.com address; emails may land in spam more often. Own domain later fixes this (paid).
4. Supabase URL Configuration: Site URL https://namitha-13.github.io/pipe-cleaner-store/ ;
   Redirect URLs: https://namitha-13.github.io/pipe-cleaner-store/** and http://localhost:8000/**
5. Code: signUp with emailRedirectTo pointing to login.html; login page handles the confirmation link.
6. Test with an email address that is not on the Supabase team.
7. Only then turn ON "Confirm email" in Supabase.
Later with the same Brevo setup: "Forgot password", order confirmation emails to customer + hoovustudio@gmail.com.

## Not done yet
- Admin page for Namitha and friend: see all orders, change status. (Add their user IDs to `admins` table.)
- Real products, prices and photos (update both products.js and Supabase products table).
- Footer email on every page still `hello@example.com` → change to hoovustudio@gmail.com.
- Browser tab icon (favicon): small flower-only image still to get from ChatGPT.
- Test orders in Supabase `orders` table (HS-20261001-76A0, HS-20261001-85FA) can be deleted before launch.
- No payment gateway yet; invoices are made in the customer's browser only.
- Hero image is still a placeholder.

## How we publish updates
```
cd C:\Projects\pipe-cleaner-store
git add .
git commit -m "Describe the change"
git push
```
Wait 1–2 minutes, then hard-refresh (Ctrl+Shift+R). On iPhone, check in a Safari Private tab (normal tabs keep old copies ~10 min).
Local testing: `py -m http.server 8000` then open http://localhost:8000
Phone view on laptop: F12, then Ctrl+Shift+M.
