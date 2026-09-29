# Aineara Website

Marketing site for Aineara — the AI-native product studio.

## Stack
- Pure HTML / CSS / JS — no build step required
- Hosted on Cloudflare Pages
- Email capture via Resend (to be wired in next session)

## File Structure
```
aineara/
├── index.html          # Main page
├── css/
│   └── style.css       # All styles
├── js/
│   └── main.js         # Cursor, nav, reveal, form logic
├── _redirects          # Cloudflare Pages redirect rules
└── README.md
```

## Deploying to Cloudflare Pages

### Option A — GitHub (recommended)
1. Push this folder to a GitHub repository
2. Go to Cloudflare Dashboard → Pages → Create a project
3. Connect your GitHub repo
4. Build settings:
   - Framework preset: None
   - Build command: (leave blank)
   - Build output directory: `/` (root)
5. Click Deploy
6. Go to Custom Domains → add `aineara.com`
   Cloudflare will auto-configure DNS since the domain is already on Cloudflare

### Option B — Direct upload (fastest)
1. Go to Cloudflare Dashboard → Pages → Create a project
2. Choose "Upload assets"
3. Drag and drop the entire `aineara/` folder
4. Add custom domain after deploy

## Connecting Your Domain
Since your domain is already on Cloudflare:
1. In Pages project → Custom Domains → Set up a custom domain
2. Enter `aineara.com`
3. Cloudflare will auto-add the required DNS records
4. HTTPS is automatic — no extra config needed

## Wiring Up Resend (next session)
The email form in `js/main.js` has a clearly marked placeholder comment:

```js
// ─── Resend integration goes here ───
// Replace the simulateDelay() call with your fetch() to /api/subscribe
```

When ready, we'll add a Cloudflare Worker at `/api/subscribe` that:
1. Receives the POST with `{ email }`
2. Calls the Resend API to add the contact
3. Returns a success/error response

## Local Development
No build step — just open `index.html` in a browser, or run:
```bash
npx serve .
```
