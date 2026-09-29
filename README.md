# Pipe-Cleaner Store (frontend MVP)

Static HTML/CSS/JS shop. No build step, no backend yet.
Flow: Home → Products → Product → Cart → Checkout → Order confirmed.

## Run locally

Open `index.html` directly in a browser, or (recommended) run a local server:

    cd pipe-cleaner-store
    python3 -m http.server 8000
    # open http://localhost:8000

Or with Node: `npx serve .`  |  VS Code: "Live Server" extension.

## Deploy to GitHub Pages

    git init
    git add .
    git commit -m "Frontend MVP"
    git branch -M main
    git remote add origin https://github.com/<you>/pipe-cleaner-store.git
    git push -u origin main

Then on GitHub: Settings → Pages → Source: "Deploy from a branch" → Branch `main`, folder `/ (root)` → Save.
Your site appears at `https://<you>.github.io/pipe-cleaner-store/` within a minute or two.
All links are relative, so it works inside the repo sub-path.

## Where to customise

| What | Where |
|---|---|
| Brand name, currency, shipping rules | `STORE_CONFIG` in `js/products.js` |
| Products, prices, colours, categories | `PRODUCTS` / `CATEGORIES` in `js/products.js` |
| Product photos | `images/` + the `image` field of each product |
| Logo | `.brand__logo` span in each HTML header |
| Colours, fonts, radius | `:root` tokens at the top of `css/style.css` |
| Hero copy / hero image | `index.html` |

## Connecting a backend later

Everything goes through `submitOrder(order)` in `js/checkout.js`. The `order`
object already matches the planned `orders` + `order_items` tables. Also add
`notes`, `subtotal` and `shipping` columns to `orders`.

The server must recalculate prices and totals from its own product table and
generate the real `order_id`; never trust amounts sent from the browser.
Keep the Supabase service key and email API keys on the server only.
