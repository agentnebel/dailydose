(() => {
  'use strict';

  const CONFIG = {
    rssUrls: [
      'https://www.blocktrainer.de/feed',
      'https://petapixel.com/feed',
      'https://www.ifun.de/feed',
      'https://www.iphone-ticker.de/feed/',
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
    textProxy: 'https://r.jina.ai/http://',

    cacheDurationMs: 60 * 60 * 1000,
    articleMetaCacheDurationMs: 7 * 24 * 60 * 60 * 1000,

    hydrateConcurrency: 5,
    visibleHydrationBoostCount: 8,
    backgroundHydrationDelayMs: 1200,

    defaultImage: 'https://via.placeholder.com/280x180/e0e0e0/999999?text=News',

    sourceReadTimeMinutes: {
      'www.blocktrainer.de': 9,
      'petapixel.com': 7,
      'www.ifun.de': 4,
      'www.iphone-ticker.de': 4,
      'stadt-bremerhaven.de': 6,
      'streetletter.substack.com': 8,
      'upphotographers.com': 6,
      'eortizfoto.substack.com': 7,
      'tarnkappe.info': 7,
      'www.kuketz-blog.de': 8,
      'www.heise.de': 6,
      'rss.golem.de': 5
    },

    defaultReadTimeMinutes: 5,

    priority: {
      enabled: true,
      sourceWeights: {
        'www.blocktrainer.de': 12,
        'www.heise.de': 10,
        'rss.golem.de': 9,
        'www.kuketz-blog.de': 8,
        'tarnkappe.info': 8,
        'petapixel.com': 6,
        'www.ifun.de': 5,
        'www.iphone-ticker.de': 5
      },
      keywordWeights: {
        bitcoin: 8,
        btc: 8,
        ki: 7,
        ai: 7,
        llm: 7,
        sicherheit: 6,
        security: 6,
        datenschutz: 5,
        kamera: 4,
        apple: 4,
        iphone: 4
      },
      maxScore: 100
    }
  };

  const SITE_STRATEGIES = [
    {
      match: (item) => item.feedUrl?.includes('stadt-bremerhaven.de'),
      fallbackImage:
        'https://stadt-bremerhaven.de/wp-content/uploads/2018/08/sblogo-150x150.jpg',
      hydrateImageWhen: (src) => src.includes('sblogo') || src.includes('placeholder')
    },
    {
      match: (item) => item.feedUrl?.includes('tarnkappe.info'),
      fallbackImage:
        'https://cdn.tarnkappe.info/wp-content/uploads/cropped-favicon-black-quad-2.png',
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

  const PRIORITY_STOPWORDS = new Set([
    'der', 'die', 'das', 'und', 'oder', 'ein', 'eine', 'einer', 'einem', 'dem', 'den', 'des',
    'mit', 'auf', 'im', 'in', 'zu', 'von', 'for', 'the', 'and', 'mit', 'bei', 'nicht', 'aber',
    'this', 'that', 'wie', 'was', 'ist', 'sind', 'bei', 'aus', 'zum', 'zur', 'auch'
  ]);

  const SORT_MODE_STORAGE_KEY = 'sortMode';

  const Cache = {
    feedKey(url) {
      return `feed_cache_${url}`;
    },
    articleMetaKey(link) {
      if (!link) return null;
      const cleanLink = link.replace(/^https?:\/\//, '').replace(/\/$/, '');
      return `article_meta_v6_cache_${cleanLink}`;
    },

    getFeed(url) {
      try {
        const cached = localStorage.getItem(this.feedKey(url));
        if (!cached) return null;
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.timestamp > CONFIG.cacheDurationMs) {
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
        localStorage.setItem(
          this.feedKey(url),
          JSON.stringify({ timestamp: Date.now(), data })
        );
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
        if (Date.now() - parsed.timestamp > CONFIG.articleMetaCacheDurationMs) {
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
        localStorage.setItem(
          key,
          JSON.stringify({ timestamp: Date.now(), data })
        );
      } catch (e) {
        console.warn('Article meta cache full?', e);
      }
    },

    clearFeedCaches() {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('feed_cache_')) localStorage.removeItem(key);
      });
    }
  };

  const container = document.getElementById('feed-container');
  const updateInfo = document.getElementById('last-update');
  const themeToggle = document.getElementById('theme-toggle');
  const refreshBtn = document.getElementById('refresh-btn');
  const sortLatestBtn = document.getElementById('sort-latest-btn');
  const sortPriorityBtn = document.getElementById('sort-priority-btn');

  const UI_STATE = {
    sortMode: 'latest',
    currentArticles: []
  };

  if (!container || !updateInfo) {
    console.error('[DailyDose] Missing #feed-container or #last-update');
    return;
  }

  const HydrationQueue = {
    queue: [],
    pendingKeys: new Set(),
    running: 0,

    enqueue(key, task, priority = 0) {
      if (!key || this.pendingKeys.has(key)) return;
      this.pendingKeys.add(key);
      this.queue.push({ key, task, priority });
      this.queue.sort((a, b) => b.priority - a.priority);
      this.pump();
    },

    pump() {
      while (this.running < CONFIG.hydrateConcurrency && this.queue.length > 0) {
        const { key, task } = this.queue.shift();
        this.running += 1;
        Promise.resolve()
          .then(task)
          .catch(() => {})
          .finally(() => {
            this.running -= 1;
            this.pendingKeys.delete(key);
            this.pump();
          });
      }
    }
  };

  function safeHttpUrl(input) {
    if (!input) return null;
    try {
      const url = new URL(String(input));
      if (url.protocol === 'http:' || url.protocol === 'https:') return url.href;
      return null;
    } catch {
      return null;
    }
  }

  function getSiteStrategy(item) {
    return SITE_STRATEGIES.find((strategy) => strategy.match(item)) || null;
  }

  function isValidSortMode(mode) {
    return mode === 'latest' || mode === 'priority';
  }

  function updateSortModeControls() {
    if (!sortLatestBtn || !sortPriorityBtn) return;

    const latestActive = UI_STATE.sortMode === 'latest';
    sortLatestBtn.classList.toggle('is-active', latestActive);
    sortPriorityBtn.classList.toggle('is-active', !latestActive);
    sortLatestBtn.setAttribute('aria-pressed', String(latestActive));
    sortPriorityBtn.setAttribute('aria-pressed', String(!latestActive));
  }

  function updateToggleIcon(theme) {
    if (!themeToggle) return;
    const isDark = theme === 'dark';
    themeToggle.textContent = isDark ? '☀️' : '🌙';
    themeToggle.setAttribute('aria-pressed', String(isDark));
    themeToggle.title = isDark ? 'Light Mode umschalten' : 'Dark Mode umschalten';
  }

  function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || savedTheme === 'light') {
      document.documentElement.setAttribute('data-theme', savedTheme);
      updateToggleIcon(savedTheme);
      return;
    }

    const prefersDark =
      window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = prefersDark ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', initialTheme);
    updateToggleIcon(initialTheme);
  }

  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateToggleIcon(newTheme);
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

  async function fetchViaAllOrigins(url, responseType = 'text') {
    const proxyUrl = `${CONFIG.xmlProxy}${encodeURIComponent(url)}`;
    const response = await fetchWithTimeout(proxyUrl, { timeout: 8000 });
    if (!response.ok) throw new Error('Proxy fetch failed');
    const json = await response.json();
    const contents = json.contents || '';
    return responseType === 'json' ? JSON.parse(contents) : contents;
  }

  async function fetchViaJina(url) {
    const cleanUrl = url.replace(/^https?:\/\//, '');
    const proxyUrl = `${CONFIG.textProxy}${cleanUrl}`;
    const response = await fetchWithTimeout(proxyUrl, { timeout: 12000 });
    if (!response.ok) throw new Error('Jina fetch failed');
    return response.text();
  }

  function stripHtml(html) {
    const div = document.createElement('div');
    div.innerHTML = String(html || '');
    return div.textContent || div.innerText || '';
  }

  function getItemPubDateMs(item, fallbackValue = -Infinity) {
    const pubDateMs = Date.parse(item?.pubDate || item?.pub_date || item?.published || '');
    return Number.isFinite(pubDateMs) ? pubDateMs : fallbackValue;
  }

  function sortItemsByPubDateDesc(items) {
    items.sort((a, b) => getItemPubDateMs(b) - getItemPubDateMs(a));
    return items;
  }

  function sortItemsByPriorityDesc(items) {
    items.sort((a, b) => {
      const scoreA = Number.isFinite(a.priorityScore) ? a.priorityScore : 0;
      const scoreB = Number.isFinite(b.priorityScore) ? b.priorityScore : 0;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return getItemPubDateMs(b) - getItemPubDateMs(a);
    });
    return items;
  }

  function sortItems(items, sortMode) {
    if (!Array.isArray(items) || items.length < 2) return items;
    if (sortMode === 'priority') return sortItemsByPriorityDesc(items);
    return sortItemsByPubDateDesc(items);
  }

  function parseXMLFeed(xmlText, feedUrl) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    const channel = xmlDoc.querySelector('channel');
    const feedTitle = channel?.querySelector('title')?.textContent || feedUrl;

    const items = Array.from(xmlDoc.querySelectorAll('item')).map((item) => {
      const title = item.querySelector('title')?.textContent || 'Kein Titel';
      const link = item.querySelector('link')?.textContent || '#';
      const pubDate = item.querySelector('pubDate')?.textContent || new Date().toISOString();
      const description = item.querySelector('description')?.textContent || '';

      const encoded =
        item.querySelector('content\\:encoded')?.textContent ||
        item.querySelector('encoded')?.textContent ||
        '';
      const content = encoded || description;

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

    return { status: 'ok', feed: { title: feedTitle, url: feedUrl }, items };
  }

  async function fetchFeed(url) {
    const cached = Cache.getFeed(url);
    if (cached) {
      return cached.items.map((item) => ({
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
      return data.items.map((item) => ({
        ...item,
        source: data.feed.title,
        feedUrl: url,
        fromCache: false
      }));
    } catch {
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

  function normalizeReadTime(value) {
    if (!value) return null;

    const text = String(value)
      .replace(/<[^>]*>/g, ' ')
      .replace(/\u00A0/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!text) return null;

    const isoDurationMatch = text.match(/^PT(?:(\d+)H)?(?:(\d+)M)?$/i);
    if (isoDurationMatch) {
      const hours = parseInt(isoDurationMatch[1] || '0', 10);
      const mins = parseInt(isoDurationMatch[2] || '0', 10);
      return `${Math.max(1, hours * 60 + mins)} Min. Lesezeit`;
    }

    const numberMatch = text.match(
      /(\d+(?:[\.,]\d+)?)\s*(?:min(?:ute[n]?)?|minutes?|lesezeit|lesedauer|read(?:ing)?\s*time)/i
    );
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

  function normalizeTextForPriority(text) {
    return String(text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function buildPriorityContext(items) {
    const repeatedWordCounts = new Map();

    for (const preparedItem of items) {
      const uniqueWords = new Set(preparedItem.tokens);
      // Count per item once, so long texts do not dominate the trend signal.
      uniqueWords.forEach((word) => {
        if (word.length < 3 || PRIORITY_STOPWORDS.has(word)) return;
        repeatedWordCounts.set(word, (repeatedWordCounts.get(word) || 0) + 1);
      });
    }

    return {
      nowMs: Date.now(),
      repeatedWordCounts,
      sourceWeights: CONFIG.priority.sourceWeights,
      keywordWeights: CONFIG.priority.keywordWeights,
      maxScore: Math.max(1, CONFIG.priority.maxScore || 100)
    };
  }

  function calculatePriorityScore(preparedItem, context) {
    let score = 0;
    const reasons = [];

    const ageHours = Number.isFinite(preparedItem.pubDateMs)
      ? (context.nowMs - preparedItem.pubDateMs) / (60 * 60 * 1000)
      : null;

    let recencyScore = 4;
    if (ageHours !== null && ageHours >= 0) {
      if (ageHours <= 6) recencyScore = 30;
      else if (ageHours <= 24) recencyScore = 22;
      else if (ageHours <= 72) recencyScore = 14;
      else if (ageHours <= 168) recencyScore = 8;
      else recencyScore = 3;
    }
    score += recencyScore;
    if (recencyScore >= 22) reasons.push('fresh');

    const sourceScore = context.sourceWeights[preparedItem.hostname] || 0;
    score += sourceScore;
    if (sourceScore > 0) reasons.push('source');

    let keywordScore = 0;
    Object.keys(context.keywordWeights).forEach((keyword) => {
      if (preparedItem.tokenSet.has(keyword) || preparedItem.normalizedText.includes(` ${keyword} `)) {
        keywordScore += context.keywordWeights[keyword];
      }
    });
    keywordScore = Math.min(28, keywordScore);
    score += keywordScore;
    if (keywordScore > 0) reasons.push('keywords');

    let trendScore = 0;
    preparedItem.tokenSet.forEach((word) => {
      if (word.length < 3 || PRIORITY_STOPWORDS.has(word)) return;
      const count = context.repeatedWordCounts.get(word) || 0;
      if (count >= 2) trendScore += Math.min(2, count - 1);
    });
    trendScore = Math.min(10, trendScore);
    score += trendScore;
    if (trendScore > 0) reasons.push('trend');

    const clampedScore = Math.max(0, Math.min(context.maxScore, Math.round(score)));
    const highThreshold = Math.round(context.maxScore * 0.7);
    const mediumThreshold = Math.round(context.maxScore * 0.4);

    let priorityLevel = 'low';
    if (clampedScore >= highThreshold) priorityLevel = 'high';
    else if (clampedScore >= mediumThreshold) priorityLevel = 'medium';

    return {
      priorityScore: clampedScore,
      priorityLevel,
      priorityReasons: reasons.slice(0, 3)
    };
  }

  function decorateArticlesWithPriority(items) {
    if (!Array.isArray(items) || items.length === 0) return items;

    if (!CONFIG.priority.enabled) {
      items.forEach((item) => {
        item.priorityScore = 0;
        item.priorityLevel = 'low';
        item.priorityReasons = [];
      });
      return items;
    }

    const preparedItems = items.map((item) => {
      const normalizedText = ` ${normalizeTextForPriority(
        `${item.title || ''} ${stripHtml(item.description || '')}`
      )} `;
      const tokens = normalizedText.trim().split(' ').filter(Boolean);
      const pubDateMs = getItemPubDateMs(item, null);
      return {
        item,
        normalizedText,
        tokens,
        tokenSet: new Set(tokens),
        pubDateMs,
        hostname: getHostnameFromUrl(item.link) || getHostnameFromUrl(item.feedUrl) || ''
      };
    });

    const context = buildPriorityContext(preparedItems);

    preparedItems.forEach((preparedItem) => {
      const meta = calculatePriorityScore(preparedItem, context);
      preparedItem.item.priorityScore = meta.priorityScore;
      preparedItem.item.priorityLevel = meta.priorityLevel;
      preparedItem.item.priorityReasons = meta.priorityReasons;
    });

    return items;
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
    const textMatch = fullText.match(
      /(?:Gesch(?:a|ä)tzte\s+Lesezeit|Lesezeit|Lesedauer|Estimated\s+Reading\s+Time|Reading\s+Time|Read\s+Time)\s*[:\-]?\s*(\d+(?:[\.,]\d+)?)/i
    );
    if (textMatch) {
      return `${Math.max(1, Math.ceil(parseFloat(textMatch[1].replace(',', '.'))))} Min. Lesezeit`;
    }

    return null;
  }

  function resolveImageUrl(rawUrl, baseUrl = null) {
    if (!rawUrl) return null;
    try {
      return new URL(rawUrl, baseUrl || window.location.href).href;
    } catch {
      return rawUrl;
    }
  }

  function isUsableArticleImage(src) {
    if (!src) return false;
    const lowered = src.toLowerCase();
    return !(
      lowered.includes('vgwort.de') ||
      lowered.includes('met.vgwort') ||
      lowered.includes('emoji') ||
      lowered.includes('1x1.png') ||
      lowered.includes('placeholder') ||
      lowered.includes('favicon') ||
      lowered.includes('/icon/') ||
      lowered.includes('cropped-favicon') ||
      lowered.includes('sblogo') ||
      lowered.includes('cropped-caschy') ||
      lowered.includes('caschy-logo') ||
      lowered.includes('tarnkappe-info-logo') ||
      lowered.includes('logo-header') ||
      lowered.includes('gravatar.com') ||
      lowered.includes('avatar') ||
      lowered.includes('m.media-amazon.com') ||
      lowered.startsWith('data:image/gif')
    );
  }

  function extractFirstArticleImageFromDoc(doc, baseUrl = null) {
    if (!doc) return null;

    const scopedRoots = [
      '[itemprop="articleBody"]',
      '.entry-content',
      '.post-content',
      '.article-content',
      '.td-post-content',
      '.content',
      'article',
      'main article',
      'main'
    ];

    for (const selector of scopedRoots) {
      const root = doc.querySelector(selector);
      if (!root) continue;

      for (const img of root.querySelectorAll('img')) {
        const src = resolveImageUrl(
          img.getAttribute('src') ||
            img.getAttribute('data-src') ||
            img.getAttribute('data-lazy-src'),
          baseUrl
        );

        if (!isUsableArticleImage(src)) continue;

        const width = parseInt(img.getAttribute('width')) || 0;
        const height = parseInt(img.getAttribute('height')) || 0;
        if ((width && width < 80) || (height && height < 80)) continue;

        return src;
      }
    }

    for (const img of doc.querySelectorAll('img')) {
      const src = resolveImageUrl(
        img.getAttribute('src') ||
          img.getAttribute('data-src') ||
          img.getAttribute('data-lazy-src'),
        baseUrl
      );
      if (!isUsableArticleImage(src)) continue;
      return src;
    }

    return null;
  }

  function extractImageUrlFromHtml(html, baseUrl = null) {
    if (!html) return null;
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const firstArticleImage = extractFirstArticleImageFromDoc(doc, baseUrl);
    if (firstArticleImage) return firstArticleImage;

    const ogImage = doc.querySelector('meta[property="og:image"]');
    const ogImageUrl = resolveImageUrl(ogImage ? ogImage.getAttribute('content') : null, baseUrl);
    if (isUsableArticleImage(ogImageUrl)) return ogImageUrl;

    return null;
  }

  function extractImageUrlFromMarkdown(markdown, baseUrl = null, itemTitle = '') {
    if (!markdown) return null;

    const startMarker = 'Markdown Content:';
    let scopedMarkdown = markdown.includes(startMarker)
      ? markdown.slice(markdown.indexOf(startMarker) + startMarker.length)
      : markdown;

    const firstHeadingIndex = scopedMarkdown.search(/^#\s+/m);
    if (firstHeadingIndex >= 0) scopedMarkdown = scopedMarkdown.slice(firstHeadingIndex);

    const stopMarkers = [
      '\n**Gefällt dir der Artikel?**',
      '\n## Kommentare',
      '\n# Kommentare',
      '\n## Related',
      '\n## Ähnliche',
      '\n## Weitere Artikel',
      '\n## Mehr zum Thema',
      '\n## Author',
      '\n## Über den Autor'
    ];

    const lowerScoped = scopedMarkdown.toLowerCase();
    let cutIndex = scopedMarkdown.length;
    for (const marker of stopMarkers) {
      const idx = lowerScoped.indexOf(marker.toLowerCase());
      if (idx >= 0 && idx < cutIndex) cutIndex = idx;
    }
    scopedMarkdown = scopedMarkdown.slice(0, cutIndex);

    const contextRejects = [
      'avatar',
      'author',
      'autor',
      'comment',
      'kommentar',
      'gravatar',
      'cookie',
      'consentmanager',
      'newsletter',
      'forum',
      'shop',
      'podcast',
      'teilen',
      'share',
      'social',
      'amazon',
      'werben',
      'anzeige',
      'sponsored',
      'recommended',
      'related'
    ];

    const lines = scopedMarkdown.split(/\r?\n/);
    const candidates = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const urls =
        line.match(/https?:\/\/[^\s)\]]+\.(?:jpg|jpeg|png|webp)(?:\?[^\s)\]]*)?/gi) || [];
      if (!urls.length) continue;

      const localContext = [line, lines[i + 1] || '', lines[i + 2] || '']
        .join(' ')
        .toLowerCase();
      if (contextRejects.some((term) => localContext.includes(term))) continue;

      for (const raw of urls) {
        const resolved = resolveImageUrl(raw, baseUrl);
        if (!isUsableArticleImage(resolved)) continue;

        let score = 0;
        if (i < 40) score += 4;
        if (i < 80) score += 2;
        if (resolved.includes('/wp-content/uploads/')) score += 2;
        if (resolved.includes('/uploads/20')) score += 2;
        if (itemTitle && localContext.includes(itemTitle.toLowerCase().slice(0, 24))) score += 1;
        if (/^!\[image/i.test(line.trim())) score += 1;

        candidates.push({ resolved, score, lineIndex: i });
      }
    }

    candidates.sort((a, b) => b.score - a.score || a.lineIndex - b.lineIndex);
    return candidates[0]?.resolved || null;
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
      ]
        .map(normalizeReadTime)
        .find(Boolean);

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

    return { readTime, imageUrl, quality: readTimeQuality };
  }

  function extractImage(item, articleMeta = null) {
    if (articleMeta?.imageUrl) return articleMeta.imageUrl;

    if (item.thumbnail && !item.thumbnail.match(/\.(mp3|wav|m4a|mp4)$/i)) return item.thumbnail;
    if (item.enclosure?.link && !item.enclosure.link.match(/\.(mp3|wav|m4a|mp4)$/i)) {
      return item.enclosure.link;
    }

    const htmlContent = item.content || item.description || '';
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');

    let prominentImage = null;
    for (const img of doc.querySelectorAll('img')) {
      let src =
        img.getAttribute('src') ||
        img.getAttribute('data-src') ||
        img.getAttribute('data-lazy-src') ||
        img.getAttribute('data-original');

      if (!src) {
        const srcSet =
          img.getAttribute('srcset') ||
          img.getAttribute('data-srcset') ||
          img.getAttribute('data-lazy-srcset');
        if (srcSet) src = srcSet.split(',')[0]?.trim().split(/\s+/)[0];
      }

      if (!src) continue;

      if (src.startsWith('/') && item.feedUrl) {
        try {
          src = new URL(item.feedUrl).origin + src;
        } catch {
          // ignore
        }
      }

      if (src.includes('vgwort.de') || src.includes('met.vgwort') || src.includes('emoji') || src.includes('1x1.png')) {
        continue;
      }

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
    const url = safeHttpUrl(item?.link);
    if (!url) return { readTime: null, imageUrl: null };

    let html = null;
    let markdown = null;

    try {
      const response = await fetch(url, { mode: 'cors' });
      if (response.ok) html = await response.text();
    } catch {
      // ignore
    }

    if (!html) {
      try {
        html = await fetchViaAllOrigins(url, 'text');
      } catch {
        // ignore
      }
    }

    if (!html) {
      try {
        markdown = await fetchViaJina(url);
      } catch {
        // ignore
      }
    }

    if (!html && !markdown) return { readTime: null, imageUrl: null };

    let readTime = html ? extractReadTimeFromHtml(html) : null;

    const imageUrl = html
      ? extractImageUrlFromHtml(html, url)
      : extractImageUrlFromMarkdown(markdown, url, item.title || '');

    if (!readTime) {
      try {
        const textContent = html
          ? (() => {
              const doc = new DOMParser().parseFromString(html, 'text/html');
              doc
                .querySelectorAll('script, style, nav, header, footer, aside, .sidebar, .comments')
                .forEach((el) => el.remove());
              return doc.body ? doc.body.textContent : '';
            })()
          : stripHtml(markdown || '');

        const wordCount = textContent.trim().split(/\s+/).filter(Boolean).length;
        if (wordCount > 50) {
          readTime = `${Math.max(1, Math.ceil(wordCount / 200))} Min. Lesezeit`;
        }
      } catch {
        // ignore
      }
    }

    return { readTime, imageUrl };
  }

  function updateArticleInDom(link, meta) {
    if (!link) return;

    const article = container.querySelector(`.article-entry[data-link="${CSS.escape(link)}"]`);
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
      if (imgNode) imgNode.src = meta.imageUrl;
    }
  }

  async function hydrateArticleMeta(item) {
    const currentMeta = Cache.getArticleMeta(item.link) || {};
    const currentImage = extractImage(item, currentMeta);

    const strategy = getSiteStrategy(item);
    const needsImage = strategy?.hydrateImageWhen
      ? strategy.hydrateImageWhen(currentImage)
      : currentImage.includes('placeholder');

    const needsReadTime = !currentMeta.readTime || currentMeta.quality !== 'source';

    const mergedMeta = { ...currentMeta };

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

  function enqueueHydrationForItem(item, priority = 0) {
    if (!item?.link) return;
    HydrationQueue.enqueue(item.link, () => hydrateArticleMeta(item), priority);
  }

  function scheduleHydration(allArticles) {
    if (!Array.isArray(allArticles) || allArticles.length === 0) return;

    const visibleItems = allArticles.slice(0, CONFIG.visibleHydrationBoostCount);
    visibleItems.forEach((item, index) => enqueueHydrationForItem(item, 100 - index));

    if ('IntersectionObserver' in window) {
      const articleMap = new Map(allArticles.map((item) => [item.link, item]));

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const link = entry.target.getAttribute('data-link');
            const item = articleMap.get(link);
            if (item) enqueueHydrationForItem(item, 80);
            observer.unobserve(entry.target);
          });
        },
        { rootMargin: '600px 0px' }
      );

      requestAnimationFrame(() => {
        container
          .querySelectorAll('.article-entry[data-link]')
          .forEach((article) => observer.observe(article));
      });
    }

    setTimeout(() => {
      allArticles.forEach((item, index) => enqueueHydrationForItem(item, Math.max(1, 40 - index)));
    }, CONFIG.backgroundHydrationDelayMs);
  }

  function renderArticle(item) {
    const safeLink = safeHttpUrl(item.link) || '#';

    const article = document.createElement('article');
    article.className = 'article-entry';
    if (safeLink !== '#') article.dataset.link = safeLink;

    const articleMeta = getInitialArticleMeta(item);
    const imageUrl = extractImage(item, articleMeta);
    const fallbackImage = getSiteStrategy(item)?.fallbackImage || CONFIG.defaultImage;

    const pubDate = new Date(item.pubDate || item.pub_date || item.published || Date.now());
    const dateStr =
      !isNaN(pubDate)
        ? pubDate.toLocaleString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }) + ' Uhr'
        : '';

    let snippet = stripHtml(item.description || item.content || '');
    if (snippet.length > 250) snippet = snippet.substring(0, 250) + '...';

    const readTime = articleMeta.readTime || 'wird ermittelt';

    const cacheInfo = item.fromCache ? '⚡' : item.isFallback ? '🛟' : '';

    const content = document.createElement('div');
    content.className = 'article-content';

    const img = document.createElement('img');
    img.className = 'article-image';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.referrerPolicy = 'no-referrer';
    img.alt = '';
    img.src = imageUrl;
    img.addEventListener(
      'error',
      () => {
        if (img.src !== fallbackImage) img.src = fallbackImage;
      },
      { once: true }
    );

    const wrapper = document.createElement('div');
    wrapper.className = 'article-text-wrapper';

    const header = document.createElement('header');

    const h2 = document.createElement('h2');
    const titleLink = document.createElement('a');
    titleLink.href = safeLink;
    titleLink.target = '_blank';
    titleLink.rel = 'noopener noreferrer';
    titleLink.referrerPolicy = 'no-referrer';
    titleLink.textContent = String(item.title || 'Kein Titel');
    h2.appendChild(titleLink);

    const meta = document.createElement('div');
    meta.className = 'article-meta';

    const badge = document.createElement('span');
    badge.className = 'source-badge';
    badge.textContent = String(item.source || '').trim() || 'Feed';

    const metaText = document.createElement('span');
    metaText.textContent = `${cacheInfo ? cacheInfo + ' ' : ''}${dateStr}`.trim();

    const readTimeNode = document.createElement('span');
    readTimeNode.setAttribute('data-read-time', '');
    readTimeNode.textContent = `• ⏱️ ${readTime}`;

    meta.appendChild(badge);
    if (metaText.textContent) meta.appendChild(metaText);
    meta.appendChild(readTimeNode);

    header.appendChild(h2);
    header.appendChild(meta);

    const p = document.createElement('p');
    p.className = 'article-text';
    p.textContent = snippet;

    const more = document.createElement('a');
    more.className = 'read-more';
    more.href = safeLink;
    more.target = '_blank';
    more.rel = 'noopener noreferrer';
    more.referrerPolicy = 'no-referrer';
    more.textContent = 'Weiterlesen →';

    wrapper.appendChild(header);
    wrapper.appendChild(p);
    wrapper.appendChild(more);

    content.appendChild(img);
    content.appendChild(wrapper);

    article.appendChild(content);
    return article;
  }

  function renderLoadingSkeleton() {
    container.innerHTML = Array(5)
      .fill(
        `
        <article class="article-entry"><div class="article-content">
          <div class="article-image skeleton"></div>
          <div class="article-text-wrapper">
            <h2 class="skeleton">Loading Title Placeholder</h2>
            <p class="skeleton">Loading description text here. We need multiple lines so it looks like a real text block.</p>
          </div>
        </div></article>
      `.trim()
      )
      .join('');
  }

  function renderCurrentArticles() {
    const sortedArticles = UI_STATE.currentArticles.slice();
    sortItems(sortedArticles, UI_STATE.sortMode);

    container.innerHTML = '';

    if (sortedArticles.length === 0) {
      container.innerHTML =
        '<p style="text-align:center; padding: 20px;">Keine Nachrichten geladen.</p>';
      return sortedArticles;
    }

    sortedArticles.forEach((item) => container.appendChild(renderArticle(item)));
    return sortedArticles;
  }

  function setSortMode(mode, options = {}) {
    const { persist = true, rerender = true } = options;
    if (!isValidSortMode(mode)) return;

    UI_STATE.sortMode = mode;
    if (persist) localStorage.setItem(SORT_MODE_STORAGE_KEY, mode);

    updateSortModeControls();

    if (rerender && UI_STATE.currentArticles.length > 0) {
      renderCurrentArticles();
    }
  }

  function initSortMode() {
    const savedMode = localStorage.getItem(SORT_MODE_STORAGE_KEY);
    if (isValidSortMode(savedMode)) UI_STATE.sortMode = savedMode;
    updateSortModeControls();
  }

  function updateLastUpdate(allFeedsFresh) {
    const now = new Date();

    if (allFeedsFresh) {
      localStorage.setItem('lastSuccessUpdate', now.toISOString());
      updateInfo.textContent = 'Stand: ' + now.toLocaleString('de-DE') + ' Uhr';
      return;
    }

    const lastUpdate = localStorage.getItem('lastSuccessUpdate');
    if (lastUpdate) {
      const lastDate = new Date(lastUpdate);
      updateInfo.textContent = 'Stand: ' + lastDate.toLocaleString('de-DE') + ' Uhr';
    } else {
      updateInfo.textContent = 'Stand: ' + now.toLocaleString('de-DE') + ' Uhr';
    }
  }

  async function init() {
    try {
      renderLoadingSkeleton();

      updateInfo.textContent = `Aktualisiere Feeds (0/${CONFIG.rssUrls.length})...`;
      let loaded = 0;

      const fetchPromises = CONFIG.rssUrls.map(async (url) => {
        try {
          const items = await fetchFeed(url);
          loaded += 1;
          updateInfo.textContent = `Aktualisiere Feeds (${loaded}/${CONFIG.rssUrls.length})...`;
          return items;
        } catch {
          loaded += 1;
          updateInfo.textContent = `Aktualisiere Feeds (${loaded}/${CONFIG.rssUrls.length})...`;
          return [];
        }
      });

      const results = await Promise.allSettled(fetchPromises);

      let allArticles = [];
      let allFeedsFresh = true;

      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          allArticles.push(...result.value);
          if (result.value.length === 0 || result.value[0].fromCache) allFeedsFresh = false;
        } else {
          allFeedsFresh = false;
        }
      });

      decorateArticlesWithPriority(allArticles);
      UI_STATE.currentArticles = allArticles;

      const sortedArticles = renderCurrentArticles();
      if (sortedArticles.length > 0) scheduleHydration(sortedArticles);

      updateLastUpdate(allFeedsFresh);
    } catch (e) {
      container.innerHTML = `<p style="text-align:center; color:red;">Fehler: ${e?.message || e}</p>`;
    }
  }

  function forceRefresh() {
    if (!refreshBtn) return;

    refreshBtn.classList.add('spinning');
    refreshBtn.disabled = true;

    Cache.clearFeedCaches();
    localStorage.removeItem('lastSuccessUpdate');

    container.innerHTML =
      '<div id="loading" style="text-align: center; color: var(--text-meta); padding: 40px;">Cache gelöscht, lade Feeds neu...</div>';

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
    window.addEventListener(
      'scroll',
      () => {
        const header = document.querySelector('.main-header');
        if (!header) return;

        if (window.scrollY > lastScrollY && window.scrollY > 80) {
          header.style.transform = 'translateY(-100%)';
        } else {
          header.style.transform = 'translateY(0)';
        }

        lastScrollY = window.scrollY;
      },
      { passive: true }
    );
  }

  if (themeToggle) themeToggle.addEventListener('click', toggleTheme);
  if (refreshBtn) refreshBtn.addEventListener('click', forceRefresh);
  if (sortLatestBtn) sortLatestBtn.addEventListener('click', () => setSortMode('latest'));
  if (sortPriorityBtn) sortPriorityBtn.addEventListener('click', () => setSortMode('priority'));

  initTheme();
  initSortMode();
  initHeaderAutoHide();
  init();
  setInterval(init, 5 * 60 * 1000);
})();
