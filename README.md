# Daily Dose 📰

> A personal RSS aggregator – all important news at a glance.

## What is Daily Dose?

**Daily Dose** is a lean, self-hosted RSS reader that bundles favorite feeds for tech, photography, Bitcoin & more in one place. It stays intentionally simple in the UI, while the internals now handle feed caching, article metadata hydration, image fallbacks, and source-specific fixes more robustly.

## Current Features

| Feature | Description |
|---------|-------------|
| 🌓 **Dark Mode** | Automatic or manual toggle, persists in browser |
| 🔄 **Force Refresh** | Clears feed caches and reloads feeds |
| 📱 **Mobile-optimized** | Fixed header, touch-friendly, responsive layout |
| 💾 **Feed Cache** | 1-hour cache for feed payloads via localStorage |
| 🧠 **Article Meta Cache** | Separate cache for article-level read times + hydrated images |
| 🖼️ **Image Preview** | Feed image extraction plus background hydration from article pages |
| ⏱️ **Read Time Detection** | Source metadata detection with controlled fallback behavior |
| 🚦 **Hydration Queue** | Limits background article fetches to avoid flooding the browser |
| 🏷️ **Source Badges** | Recognize the source at a glance |
| 🚀 **Lightweight UI** | Still a single static page with no framework |

## Tech Stack

```text
Frontend:     Vanilla HTML5 + CSS3 + ES6 JavaScript
Styling:      CSS Custom Properties, Flexbox
Hosting:      Cloudflare Pages / static hosting
Build:        None required
Feed Source:  rss2json.com (primary)
Fallback:     XML fetch + in-browser parser via AllOrigins
```

## Architecture

### Data Flow

```text
RSS Feed
  ↓
rss2json API (primary)
  ↓
Feed Cache (localStorage)
  ↓
Initial Render
  ↓
Background Article Hydration Queue
  ↓
Article Meta Cache (readTime + imageUrl)
  ↓
Live DOM updates
```

### Cache Model

Daily Dose now uses two separate browser caches:

- `feed_cache_*` → raw feed/API responses
- `article_meta_cache_*` → hydrated article metadata like:
  - `readTime`
  - `imageUrl`
  - `quality`

This keeps feed refresh behavior separate from article-specific enrichment.

## Source Handling

The app includes source-specific fallbacks where feeds are known to omit proper images or metadata.

Examples:
- **stadt-bremerhaven.de** → hydrate article image from `og:image`
- **tarnkappe.info** → replace favicon-style fallback with article image
- **ifun.de / petapixel.com** → source-specific image fallbacks

## Local Development

```bash
git clone <repo-url>
cd dailydose
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Deployment

### Cloudflare Pages / static hosting

Because this project is still fully static, deployment stays simple.

### Notes

- The rss2json API key is currently client-side in the HTML.
- For a cleaner production setup, this should eventually move behind a Worker or backend proxy.

## Project Structure

```text
dailydose/
├── index.html
├── wrangler.jsonc
├── README.md
└── .gitignore
```

## Improvement Status

Implemented internal improvements:

- [x] separated feed cache from article metadata cache
- [x] centralized source strategies
- [x] hydration queue with limited parallelism
- [x] unified proxy/fallback logic
- [x] more robust read-time handling
- [x] more robust article image hydration
- [x] repo cleanup preparation
- [x] README updated to match current behavior

## Roadmap

Potential next steps:

- [ ] move JavaScript into `app.js`
- [ ] move CSS into `styles.css`
- [ ] replace client-side API key with Worker proxy
- [ ] add search/filtering
- [ ] add PWA support
- [ ] add persistent favorites/bookmarks

## License

Personal project – no commercial redistribution intended.

> *"Less is more. No distractions, no algorithms, just the news I want."* – Sven
