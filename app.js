        const CONFIG = {
            rssUrls: [
                'https://www.blocktrainer.de/feed',
                'https://petapixel.com/feed',
                'https://www.ifun.de/feed',
                'https://stadt-bremerhaven.de/feed',
                'https://streetletter.substack.com/feed',
                'https://upphotographers.com/feed',
                'https://eortizfoto.substack.com/feed',
                'https://tarnkappe.info/feed/',
                'https://www.kuketz-blog.de/feed/',
                'https://www.heise.de/thema/Kuenstliche-Intelligenz.xml',
                'https://rss.golem.de/rss.php?feed=RSS2.0&ms=llm'
            ],
            apiKey: 'l42es2jwwhkaq8xn72z4ogwjrx2zepbbecqh4gfc',
            apiBase: 'https://api.rss2json.com/v1/api.json?rss_url=',
            xmlProxy: 'https://api.allorigins.win/get?url=',
            cacheDurationMs: 60 * 60 * 1000,
            articleMetaCacheDurationMs: 7 * 24 * 60 * 60 * 1000,
            hydrateConcurrency: 3,
            defaultImage: 'https://via.placeholder.com/280x180/e0e0e0/999999?text=News',
            sourceReadTimeMinutes: {
                'www.blocktrainer.de': 9,
                'petapixel.com': 7,
                'www.ifun.de': 4,
                'stadt-bremerhaven.de': 6,
                'streetletter.substack.com': 8,
                'upphotographers.com': 6,
                'eortizfoto.substack.com': 7,
                'tarnkappe.info': 7,
                'www.kuketz-blog.de': 8,
                'www.heise.de': 6,
                'rss.golem.de': 5
            },
            defaultReadTimeMinutes: 5
        };

        const SITE_STRATEGIES = [
            {
                match: (item) => item.feedUrl?.includes('stadt-bremerhaven.de'),
                fallbackImage: 'https://stadt-bremerhaven.de/wp-content/uploads/2018/08/sblogo-150x150.jpg',
                hydrateImageWhen: (src) => src.includes('sblogo') || src.includes('placeholder')
            },
            {
                match: (item) => item.feedUrl?.includes('tarnkappe.info'),
                fallbackImage: 'https://cdn.tarnkappe.info/wp-content/uploads/cropped-favicon-black-quad-2.png',
                hydrateImageWhen: (src) => src.includes('tarnkappe') || src.includes('placeholder')
            },
            {
                match: (item) => item.feedUrl?.includes('ifun.de'),
                fallbackImage: 'https://www.ifun.de/wp-content/themes/ifun/images/ifun_logo.png'
            },
            {
                match: (item) => item.feedUrl?.includes('petapixel.com'),
                fallbackImage: 'https://cdn.petapixel.com/assets/assets/images/logos/petapixel-logo.png'
            }
        ];

        const Cache = {
            feedKey(url) {
                return `feed_cache_${url}`;
            },
            articleMetaKey(link) {
                if (!link) return null;
                const cleanLink = link.replace(/^https?:\/\//, '').replace(/\/$/, '');
                return `article_meta_v3_cache_${cleanLink}`;
            },
            getFeed(url) {
                try {
                    const cached = localStorage.getItem(this.feedKey(url));
                    if (!cached) return null;
                    const parsed = JSON.parse(cached);
                    if ((Date.now() - parsed.timestamp) > CONFIG.cacheDurationMs) {
                        localStorage.removeItem(this.feedKey(url));
                        return null;
                    }
                    return parsed.data;
                } catch {
                    return null;
                }
            },
            setFeed(url, data) {
                try {
                    localStorage.setItem(this.feedKey(url), JSON.stringify({
                        timestamp: Date.now(),
                        data
                    }));
                } catch (e) {
                    console.warn('Feed cache full?', e);
                }
            },
            getArticleMeta(link) {
                const key = this.articleMetaKey(link);
                if (!key) return null;
                try {
                    const cached = localStorage.getItem(key);
                    if (!cached) return null;
                    const parsed = JSON.parse(cached);
                    if ((Date.now() - parsed.timestamp) > CONFIG.articleMetaCacheDurationMs) {
                        localStorage.removeItem(key);
                        return null;
                    }
                    return parsed.data || null;
                } catch {
                    return null;
                }
            },
            setArticleMeta(link, data) {
                const key = this.articleMetaKey(link);
                if (!key) return;
                try {
                    localStorage.setItem(key, JSON.stringify({
                        timestamp: Date.now(),
                        data
                    }));
                } catch (e) {
                    console.warn('Article meta cache full?', e);
                }
            },
            clearFeedCaches() {
                Object.keys(localStorage).forEach(key => {
                    if (key.startsWith('feed_cache_')) {
                        localStorage.removeItem(key);
                    }
                });
            }
        };

        const container = document.getElementById('feed-container');
        const updateInfo = document.getElementById('last-update');
        const themeToggle = document.getElementById('theme-toggle');
        const refreshBtn = document.getElementById('refresh-btn');

        const HydrationQueue = {
            queue: [],
            running: 0,
            enqueue(task) {
                this.queue.push(task);
                this.pump();
            },
            pump() {
                while (this.running < CONFIG.hydrateConcurrency && this.queue.length > 0) {
                    const task = this.queue.shift();
                    this.running += 1;
                    Promise.resolve()
                        .then(task)
                        .catch(() => {})
                        .finally(() => {
                            this.running -= 1;
                            this.pump();
                        });
                }
            }
        };

        function getSiteStrategy(item) {
            return SITE_STRATEGIES.find(strategy => strategy.match(item)) || null;
        }

        function initTheme() {
            const savedTheme = localStorage.getItem('theme');
            if (savedTheme) {
                document.documentElement.setAttribute('data-theme', savedTheme);
                updateToggleIcon(savedTheme);
            } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                document.documentElement.setAttribute('data-theme', 'dark');
                updateToggleIcon('dark');
            }
        }

        function toggleTheme() {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateToggleIcon(newTheme);
        }

        function updateToggleIcon(theme) {
            themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
        }

        async function fetchViaAllOrigins(url, responseType = 'text') {
            const proxyUrl = `${CONFIG.xmlProxy}${encodeURIComponent(url)}`;
            const response = await fetchWithTimeout(proxyUrl, { timeout: 8000 });
            if (!response.ok) throw new Error('Proxy fetch failed');
            const json = await response.json();
            const contents = json.contents || '';
            return responseType === 'json' ? JSON.parse(contents) : contents;
        }

        function parseXMLFeed(xmlText, feedUrl) {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
            const channel = xmlDoc.querySelector('channel');
            const feedTitle = channel?.querySelector('title')?.textContent || feedUrl;

            const items = Array.from(xmlDoc.querySelectorAll('item')).map(item => {
                const title = item.querySelector('title')?.textContent || 'Kein Titel';
                const link = item.querySelector('link')?.textContent || '#';
                const pubDate = item.querySelector('pubDate')?.textContent || new Date().toISOString();
                const description = item.querySelector('description')?.textContent || '';
                const content = item.querySelector('encoded')?.textContent || description;
                const enclosure = item.querySelector('enclosure');
                const enclosureLink = enclosure ? enclosure.getAttribute('url') : null;

                return {
                    title,
                    link,
                    pubDate,
                    description,
                    content,
                    enclosure: { link: enclosureLink },
                    source: feedTitle,
                    feedUrl,
                    fromCache: false,
                    isFallback: true
                };
            });

            return {
                status: 'ok',
                feed: { title: feedTitle, url: feedUrl },
                items
            };
        }

        async function fetchFeed(url) {
            const cached = Cache.getFeed(url);
            if (cached) {
                return cached.items.map(item => ({
                    ...item,
                    source: cached.feed.title,
                    feedUrl: url,
                    fromCache: true
                }));
            }

            try {
                const apiUrl = `${CONFIG.apiBase}${encodeURIComponent(url)}&api_key=${CONFIG.apiKey}`;
                const response = await fetchWithTimeout(apiUrl, { timeout: 6000 });
                if (!response.ok) throw new Error('Primary API failed');
                const data = await response.json();
                if (data.status !== 'ok') throw new Error('API returned error status');

                Cache.setFeed(url, data);
                return data.items.map(item => ({
                    ...item,
                    source: data.feed.title,
                    feedUrl: url,
                    fromCache: false
                }));
            } catch (primaryError) {
                try {
                    const xmlText = await fetchViaAllOrigins(url, 'text');
                    const data = parseXMLFeed(xmlText, url);
                    Cache.setFeed(url, data);
                    return data.items;
                } catch (fallbackError) {
                    console.error(`[Feed Fetch] Failed for ${url}:`, fallbackError);
                    return [];
                }
            }
        }

        async function fetchWithTimeout(resource, options = {}) {
            const { timeout = 8000 } = options;
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), timeout);
            try {
                const response = await fetch(resource, { ...options, signal: controller.signal });
                clearTimeout(id);
                return response;
            } catch (error) {
                clearTimeout(id);
                throw error;
            }
        }

        function stripHtml(html) {
            const div = document.createElement('div');
            div.innerHTML = html;
            return div.textContent || div.innerText || '';
        }

        function normalizeReadTime(value) {
            if (!value) return null;

            const text = String(value)
                .replace(/<[^>]*>/g, ' ')
                .replace(/&nbsp;|&#160;/gi, ' ')
                .replace(/\s+/g, ' ')
                .trim();

            if (!text) return null;

            const isoDurationMatch = text.match(/^PT(?:(\d+)H)?(?:(\d+)M)?$/i);
            if (isoDurationMatch) {
                const hours = parseInt(isoDurationMatch[1] || '0', 10);
                const mins = parseInt(isoDurationMatch[2] || '0', 10);
                return `${Math.max(1, hours * 60 + mins)} Min. Lesezeit`;
            }

            const numberMatch = text.match(/(\d+(?:[\.,]\d+)?)\s*(?:min(?:ute[n]?)?|minutes?|lesezeit|lesedauer|read(?:ing)?\s*time)/i);
            if (numberMatch) {
                return `${Math.max(1, Math.ceil(parseFloat(numberMatch[1].replace(',', '.'))))} Min. Lesezeit`;
            }

            const numberOnly = text.match(/^\d+(?:[\.,]\d+)?$/);
            if (numberOnly) {
                return `${Math.max(1, Math.ceil(parseFloat(numberOnly[0].replace(',', '.'))))} Min. Lesezeit`;
            }

            return null;
        }

        function getHostnameFromUrl(url) {
            if (!url) return null;
            try {
                return new URL(url).hostname.toLowerCase();
            } catch {
                return null;
            }
        }

        function getSourceBasedReadTime(item) {
            const hostname = getHostnameFromUrl(item?.link) || getHostnameFromUrl(item?.feedUrl);
            const knownMinutes = hostname ? CONFIG.sourceReadTimeMinutes[hostname] : null;
            const minutes = knownMinutes || CONFIG.defaultReadTimeMinutes;
            return `${Math.max(1, Math.ceil(minutes))} Min. Lesezeit`;
        }

        function extractReadTimeFromHtml(html) {
            if (!html) return null;

            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const selectors = [
                '[class*="read-time"]',
                '[class*="reading-time"]',
                '[class*="readingtime"]',
                '[class*="estimatedreadingtime"]',
                '[class*="dauer"]',
                '[class*="lesezeit"]',
                '[itemprop="timeRequired"]',
                'meta[itemprop="timeRequired"]',
                'meta[name="twitter:data2"]',
                'meta[property="article:reading_time"]',
                'meta[property="og:time_required"]'
            ];

            for (const selector of selectors) {
                const elements = doc.querySelectorAll(selector);
                for (const el of elements) {
                    const candidate = normalizeReadTime(el.getAttribute('content') || el.textContent);
                    if (candidate) return candidate;
                }
            }

            const fullText = stripHtml(html);
            const textMatch = fullText.match(/(?:Gesch(?:a|ä)tzte\s+Lesezeit|Lesezeit|Lesedauer|Estimated\s+Reading\s+Time|Reading\s+Time|Read\s+Time)\s*[:\-]?\s*(\d+(?:[\.,]\d+)?)/i);
            if (textMatch) {
                return `${Math.max(1, Math.ceil(parseFloat(textMatch[1].replace(',', '.'))))} Min. Lesezeit`;
            }

            return null;
        }

        function extractImageUrlFromHtml(html, articleUrl = null) {
            if (!html) return null;

            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            const normalizeImageSource = (src) => {
                if (!src) return null;
                let normalized = src.trim();
                if (!normalized || normalized.startsWith('data:')) return null;

                if (normalized.startsWith('//')) {
                    normalized = `https:${normalized}`;
                } else if (normalized.startsWith('/') && articleUrl) {
                    try {
                        normalized = new URL(normalized, articleUrl).href;
                    } catch {}
                }

                if (normalized.includes('vgwort.de') || normalized.includes('met.vgwort') || normalized.includes('emoji') || normalized.includes('1x1')) {
                    return null;
                }

                return normalized;
            };

            const firstImage = doc.querySelector('img');
            if (firstImage) {
                const firstImageSource = firstImage.getAttribute('src')
                    || firstImage.getAttribute('data-src')
                    || firstImage.getAttribute('data-lazy-src')
                    || firstImage.getAttribute('data-original')
                    || firstImage.getAttribute('srcset')?.split(',')[0]?.trim().split(/\s+/)[0];

                const normalizedFirstImage = normalizeImageSource(firstImageSource);
                if (normalizedFirstImage) return normalizedFirstImage;
            }

            const ogImage = doc.querySelector('meta[property="og:image"]')?.getAttribute('content');
            return normalizeImageSource(ogImage);
        }

        function getInitialArticleMeta(item) {
            const cachedMeta = Cache.getArticleMeta(item.link);
            let readTime = cachedMeta?.readTime || null;
            let readTimeQuality = cachedMeta?.quality || null;

            if (!readTime) {
                const directReadTime = [
                    item.readTime,
                    item.read_time,
                    item.readingTime,
                    item.reading_time,
                    item.timeRequired,
                    item.time_required
                ].map(normalizeReadTime).find(Boolean);

                const embeddedReadTime = extractReadTimeFromHtml(item.content || item.description || '');
                readTime = directReadTime || embeddedReadTime || null;
                if (readTime) readTimeQuality = 'source';
            }

            if (!readTime) {
                readTime = getSourceBasedReadTime(item);
                readTimeQuality = 'source-fallback';
            }

            const imageUrl = cachedMeta?.imageUrl || null;

            if (readTime || imageUrl) {
                Cache.setArticleMeta(item.link, {
                    readTime,
                    imageUrl,
                    quality: readTimeQuality || (imageUrl ? 'fallback' : null)
                });
            }

            return {
                readTime,
                imageUrl,
                quality: readTimeQuality
            };
        }

        function extractImage(item, articleMeta = null) {
            if (articleMeta?.imageUrl) return articleMeta.imageUrl;
            if (item.thumbnail && !item.thumbnail.match(/\.(mp3|wav|m4a|mp4)$/i)) return item.thumbnail;
            if (item.enclosure?.link && !item.enclosure.link.match(/\.(mp3|wav|m4a|mp4)$/i)) return item.enclosure.link;

            const htmlContent = item.content || item.description || '';
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlContent, 'text/html');
            let prominentImage = null;

            for (const img of doc.querySelectorAll('img')) {
                let src = img.getAttribute('src')
                    || img.getAttribute('data-src')
                    || img.getAttribute('data-lazy-src')
                    || img.getAttribute('data-original');

                if (!src) {
                    const srcSet = img.getAttribute('srcset')
                        || img.getAttribute('data-srcset')
                        || img.getAttribute('data-lazy-srcset');
                    if (srcSet) {
                        src = srcSet.split(',')[0]?.trim().split(/\s+/)[0];
                    }
                }

                if (!src) continue;
                if (src.startsWith('/') && item.feedUrl) {
                    try {
                        src = new URL(item.feedUrl).origin + src;
                    } catch {}
                }
                if (src.includes('vgwort.de') || src.includes('met.vgwort') || src.includes('emoji') || src.includes('1x1.png')) continue;
                const width = parseInt(img.getAttribute('width')) || 0;
                const height = parseInt(img.getAttribute('height')) || 0;
                if (width > 100 || height > 100) return src;
                if (!prominentImage) prominentImage = src;
            }

            if (prominentImage) return prominentImage;
            const strategy = getSiteStrategy(item);
            if (strategy?.fallbackImage) return strategy.fallbackImage;
            return CONFIG.defaultImage;
        }

        async function fetchArticleMeta(item) {
            if (!item?.link) return { readTime: null, imageUrl: null };

            let html = null;
            try {
                const response = await fetch(item.link, { mode: 'cors' });
                if (response.ok) html = await response.text();
            } catch {
                try {
                    html = await fetchViaAllOrigins(item.link, 'text');
                } catch {}
            }

            if (!html) return { readTime: null, imageUrl: null };

            let readTime = extractReadTimeFromHtml(html);
            const imageUrl = extractImageUrlFromHtml(html, item.link);

            if (!readTime) {
                try {
                    const doc = new DOMParser().parseFromString(html, 'text/html');
                    doc.querySelectorAll('script, style, nav, header, footer, aside, .sidebar, .comments').forEach(el => el.remove());
                    const textContent = doc.body ? doc.body.textContent : '';
                    const wordCount = textContent.trim().split(/\s+/).filter(Boolean).length;
                    if (wordCount > 50) {
                        readTime = `${Math.max(1, Math.ceil(wordCount / 200))} Min. Lesezeit`;
                    }
                } catch (e) {
                }
            }

            return { readTime, imageUrl };
        }
        function updateArticleInDom(link, meta) {
            if (!link) return;
            const articleLink = container.querySelector(`h2 a[href="${CSS.escape(link)}"]`);
            if (!articleLink) return;
            const article = articleLink.closest('.article-entry');
            if (!article) return;

            if (meta.readTime) {
                const readTimeNode = article.querySelector('[data-read-time]');
                if (readTimeNode) {
                    readTimeNode.textContent = `• ⏱️ ${meta.readTime}`;
                    readTimeNode.style.opacity = '0.7';
                }
            }

            if (meta.imageUrl) {
                const imgNode = article.querySelector('.article-image');
                if (imgNode) {
                    imgNode.src = meta.imageUrl;
                }
            }
        }

        async function hydrateArticleMeta(item) {
            const currentMeta = Cache.getArticleMeta(item.link) || {};
            const currentImage = extractImage(item, currentMeta);
            const strategy = getSiteStrategy(item);
            const needsImage = strategy?.hydrateImageWhen ? strategy.hydrateImageWhen(currentImage) : currentImage.includes('placeholder');
            const needsReadTime = !currentMeta.readTime || currentMeta.quality !== 'source';

            let mergedMeta = { ...currentMeta };

            if (needsImage || needsReadTime) {
                const fetchedMeta = await fetchArticleMeta(item);
                if (fetchedMeta.readTime) mergedMeta.readTime = fetchedMeta.readTime;
                if (fetchedMeta.imageUrl) mergedMeta.imageUrl = fetchedMeta.imageUrl;
                if (fetchedMeta.readTime) mergedMeta.quality = 'source';
            }

            if (!mergedMeta.readTime) {
                mergedMeta.readTime = getSourceBasedReadTime(item);
                mergedMeta.quality = mergedMeta.quality || 'source-fallback';
            }

            Cache.setArticleMeta(item.link, mergedMeta);
            updateArticleInDom(item.link, {
                readTime: mergedMeta.readTime,
                imageUrl: mergedMeta.imageUrl
            });
        }

        function renderArticle(item) {
            const article = document.createElement('article');
            article.className = 'article-entry';

            const articleMeta = getInitialArticleMeta(item);
            const imageUrl = extractImage(item, articleMeta);
            const fallbackImage = getSiteStrategy(item)?.fallbackImage || CONFIG.defaultImage;
            const date = new Date(item.pubDate);
            const dateStr = !isNaN(date)
                ? date.toLocaleDateString('de-DE', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                }) + ' Uhr'
                : '';

            let snippet = stripHtml(item.description || item.content);
            const readTime = articleMeta.readTime || 'wird ermittelt';
            if (snippet.length > 250) snippet = snippet.substring(0, 250) + '...';

            const cacheInfo = item.fromCache ? '⚡' : (item.isFallback ? '🛡️' : '🔄');

            article.innerHTML = `
                <div class="article-content">
                    <img src="${imageUrl}" alt="" class="article-image" loading="lazy" onerror="this.onerror=null;this.src='${fallbackImage}'">
                    <div class="article-text-wrapper">
                        <header>
                            <h2><a href="${item.link}" target="_blank">${item.title}</a></h2>
                            <div class="article-meta">
                                <span class="source-badge">${item.source} ${cacheInfo}</span>
                                <span>${dateStr}</span>
                                <span style="opacity:${readTime === 'wird ermittelt' ? '0.5' : '0.7'}" data-read-time>&bull; ⏱️ ${readTime}</span>
                            </div>
                        </header>
                        <p class="article-text">${snippet}</p>
                        <a href="${item.link}" target="_blank" class="read-more">Weiterlesen &rarr;</a>
                    </div>
                </div>
            `;

            HydrationQueue.enqueue(() => hydrateArticleMeta(item));

            return article;
        }

        function renderLoadingSkeleton() {
            container.innerHTML = Array(5).fill(`
                <article class="article-entry"><div class="article-content">
                <div class="article-image skeleton"></div><div class="article-text-wrapper"><h2 class="skeleton">Loading Title Placeholder</h2><p class="skeleton">Loading description text here. We need multiple lines so it looks like a real text block.</p></div></div></article>
            `).join('');
        }

        function updateLastUpdate(allFeedsFresh) {
            const now = new Date();
            const options = { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' };
            if (allFeedsFresh) {
                localStorage.setItem('lastSuccessUpdate', now.toISOString());
                updateInfo.textContent = 'Stand: ' + now.toLocaleDateString('de-DE', options) + ' Uhr';
                return;
            }

            const lastUpdate = localStorage.getItem('lastSuccessUpdate');
            if (lastUpdate) {
                const lastDate = new Date(lastUpdate);
                updateInfo.textContent = 'Stand: ' + lastDate.toLocaleDateString('de-DE', options) + ' Uhr';
            } else {
                updateInfo.textContent = 'Stand: ' + now.toLocaleDateString('de-DE', options) + ' Uhr';
            }
        }

        async function init() {
            try {
                if (container.innerHTML.trim() === '') {
                    renderLoadingSkeleton();
                }

                updateInfo.textContent = 'Aktualisiere Feeds (0/' + CONFIG.rssUrls.length + ')...';
                let loaded = 0;

                const fetchPromises = CONFIG.rssUrls.map(async url => {
                    try {
                        const items = await fetchFeed(url);
                        loaded++;
                        updateInfo.textContent = 'Aktualisiere Feeds (' + loaded + '/' + CONFIG.rssUrls.length + ')...';
                        return items;
                    } catch (e) {
                        loaded++;
                        updateInfo.textContent = 'Aktualisiere Feeds (' + loaded + '/' + CONFIG.rssUrls.length + ')...';
                        return [];
                    }
                });

                const results = await Promise.allSettled(fetchPromises);

                let allArticles = [];
                let allFeedsFresh = true;

                results.forEach(result => {
                    if (result.status === 'fulfilled' && result.value) {
                        allArticles.push(...result.value);
                        if (result.value.length === 0 || result.value[0].fromCache) {
                            allFeedsFresh = false;
                        }
                    } else {
                        allFeedsFresh = false;
                    }
                });

                allArticles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
                container.innerHTML = '';

                if (allArticles.length === 0) {
                    container.innerHTML = '<p style="text-align:center; padding: 20px;">Keine Nachrichten geladen.</p>';
                } else {
                    allArticles.forEach(item => container.appendChild(renderArticle(item)));
                }

                updateLastUpdate(allFeedsFresh);
            } catch (e) {
                container.innerHTML = `<p style="text-align:center; color:red;">Fehler: ${e.message}</p>`;
            }
        }

        function forceRefresh() {
            refreshBtn.classList.add('spinning');
            refreshBtn.disabled = true;
            Cache.clearFeedCaches();
            localStorage.removeItem('lastSuccessUpdate');
            container.innerHTML = '<div id="loading" style="text-align: center; color: var(--text-meta); padding: 40px;">Cache gelöscht, lade Feeds neu...</div>';
            setTimeout(() => {
                init()
                    .catch(() => {})
                    .finally(() => {
                        refreshBtn.classList.remove('spinning');
                        refreshBtn.disabled = false;
                    });
            }, 500);
        }

        function initHeaderAutoHide() {
            let lastScrollY = window.scrollY;
            window.addEventListener('scroll', () => {
                const header = document.querySelector('.main-header');
                if (!header) return;
                if (window.scrollY > lastScrollY && window.scrollY > 80) {
                    header.style.transform = 'translateY(-100%)';
                } else {
                    header.style.transform = 'translateY(0)';
                }
                lastScrollY = window.scrollY;
            }, { passive: true });
        }

        themeToggle.addEventListener('click', toggleTheme);
        if (refreshBtn) refreshBtn.addEventListener('click', forceRefresh);

        initTheme();
        initHeaderAutoHide();
        init();
        setInterval(init, 5 * 60 * 1000);
