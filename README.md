# Daily Dose 📰

> A personal RSS aggregator – all important news at a glance.


---

## What is Daily Dose?

**Daily Dose** is a lean, self-hosted RSS reader that bundles my favorite feeds for tech, photography, Bitcoin & more in one place. Instead of jumping through dozens of sites, get the latest articles compact and clearly presented.

### Why this project?

- **No tracking** – No Google, no algorithm telling me what to read
- **Self-determined** – I decide which sources I see
- **Fast** – Loads feeds once per hour, caches locally
- **Papernice** – Responsive design, Dark Mode, mobile-first

---

## Features

| Feature | Description |
|---------|-------------|
| 🌓 **Dark Mode** | Automatic or manual toggle, persists in browser |
| 🔄 **Force Refresh** | Clears cache and reloads all feeds (with spinning animation) |
| 📱 **Mobile-optimized** | Fixed header, touch-friendly, responsive layout |
| 💾 **Smart Caching** | 1-hour cache via localStorage, saves API requests |
| 🖼️ **Image Preview** | Extracts Open Graph images from feeds |
| 🏷️ **Source Badges** | Recognize the source at a glance |
| 🚀 **Lightweight** | Vanilla JS, no frameworks, < 30KB minified |

---

## Tech Stack

```
Frontend:     Vanilla HTML5 + CSS3 + ES6 JavaScript
Styling:      CSS Custom Properties (Variables), Flexbox, Grid
Hosting:      Cloudflare Workers / Pages (static assets)
Build:        None needed – pure HTML file
API:          rss2json.com (RSS → JSON conversion)
```

---

## RSS Feeds

Currently subscribed sources:

| Source | Category | URL |
|--------|----------|-----|
| **Blocktrainer** | Bitcoin & Crypto | `blocktrainer.de/feed` |
| **PetaPixel** | Photography News | `petapixel.com/feed` |
| **iFun.de** | Apple & Tech | `ifun.de/feed` |
| **stadt-bremerhaven.de** | Regional & Tech | `stadt-bremerhaven.de/feed` |
| **Streetletter** | Street Photography | `streetletter.substack.com/feed` |
| **UP Photographers** | Photography Portfolio | `upphotographers.com/feed` |
| **eortizfoto** | Photography Blog | Substack |
| **Tarnkappe.info** | Tech & Privacy | `tarnkappe.info/feed` |
| **Kuketz-Blog** | Privacy | `kuketz-blog.de/feed` |

> Note: Feeds are fetched via RSS standard (XML → JSON → Rendered HTML).

---

## Local Development

Since this is a static HTML file, no complex setup is needed:

```bash
# Clone repository
git clone <repo-url>
cd dailydose

# Start local server (e.g., with Python)
python3 -m http.server 8000

# Or with Node.js
npx serve .

# Or simply open index.html in browser
open index.html
```

**Important:** For RSS fetching, an API key is required (rss2json). This is hardcoded in the source – for production use, it should be stored server-side for security (Workers Secrets).

---

## Deployment

### Cloudflare Workers / Pages

1. **Install Wrangler CLI:**
   ```bash
   npm install -g wrangler
   ```

2. **Login to Cloudflare:**
   ```bash
   wrangler login
   ```

3. **Deploy:**
   ```bash
   wrangler deploy
   ```

The `wrangler.jsonc` is already configured for static asset hosting.

### GitHub Actions (Automated Deployment)

Optional: Automatically deploy on every push to `main`:

```yaml
# .github/workflows/deploy.yml (Example)
name: Deploy to Cloudflare
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
```

---

## Architecture & Cache Strategy

### Data Flow

```
RSS Feed (XML)
      ↓
rss2json API
      ↓
JSON Response
      ↓
localStorage (1h Cache)
      ↓
Rendered Article Cards
```

### Fallback Mechanism

If the rss2json API fails or CORS issues occur:
1. **Primary:** rss2json API (direct, JSON)
2. **Fallback:** CORS Proxy (corsproxy.io)
3. **Emergency:** Local XML parser in browser

---

## Project Structure

```
dailydose/
├── index.html          ← Main application (HTML + CSS + JS)
├── wrangler.jsonc      ← Cloudflare Workers Config
├── .gitignore          ← Ignores .wrangler, .env
└── README.md           ← This file
```

> **KISS Principle:** A single HTML file. No bundler, no framework, no dependencies.

---

## Roadmap / Ideas

- [ ] PWA support (Service Worker, offline mode)
- [ ] Custom feed categories/filtering
- [ ] Search function across all articles
- [ ] Favorites/bookmarks saving
- [ ] Push notifications for breaking news
- [ ] Multi-user support (personal feed lists)

---

## Credits

- **Idea & Development:** Sven Belz
- **RSS API:** [rss2json.com](https://rss2json.com)
- **CORS Proxy:** [corsproxy.io](https://corsproxy.io)
- **Icons:** Native Emoji (no icon library needed)

---

## License

Personal project – no commercial redistribution intended.

---

> *"Less is more. No distractions, no algorithms, just the news I want."* – Sven

🌫️ Built with ☕ and minimalism.
