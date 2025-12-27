/**
 * Web Search and Language Detection Helper
 *
 * This module provides utilities for detecting language from TV channel websites:
 * - Web crawling and HTML content fetching
 * - Multi-signal language detection (HTML metadata, text analysis, resources)
 * - Statistical text analysis using franc library
 * - Pattern-based fallback detection
 * - Language code normalization
 *
 * @author Senior Backend Automation Engineer
 * @requires axios - HTTP client for web requests
 * @requires cheerio - HTML parsing and DOM manipulation
 * @requires franc - Statistical language detection
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { franc } = require('franc');
const { convert } = require('html-to-text');

// Configuration
const CONFIG = {
  timeout: 8000,                     // 8 second timeout
  maxRetries: 1,                     // Retry failed requests once
  userAgent: 'Mozilla/5.0 (compatible; LanguageDetectorBot/1.0)'
};

// ISO 639-1 Language Code Mapping
const LANGUAGE_CODES = {
  tamil: 'ta',
  telugu: 'te',
  hindi: 'hi',
  kannada: 'kn',
  malayalam: 'ml',
  english: 'en',
  bengali: 'bn',
  marathi: 'mr',
  punjabi: 'pa',
  gujarati: 'gu',
  urdu: 'ur',
  bhojpuri: 'bh',
  assamese: 'as',
  odia: 'or',
  unknown: 'unknown'
};

// Reverse mapping: ISO code to full name
const ISO_TO_LANGUAGE = Object.fromEntries(
  Object.entries(LANGUAGE_CODES).map(([lang, code]) => [code, lang])
);

// Franc ISO 639-3 to full language name mapping (for Indian languages)
const FRANC_TO_LANGUAGE_NAME = {
  tam: 'tamil',
  tel: 'telugu',
  hin: 'hindi',
  kan: 'kannada',
  mal: 'malayalam',
  eng: 'english',
  ben: 'bengali',
  mar: 'marathi',
  pan: 'punjabi',
  guj: 'gujarati',
  urd: 'urdu',
  asm: 'assamese',
  ori: 'odia',
  bho: 'bhojpuri',
  und: null    // Undetermined
};

// Pattern-based fallback detection
const LANGUAGE_PATTERNS = {
  tamil: /tamil|sun tv|raj tv|raj musix|kalaignar|vijay|puthiya|thanthi|polimer|news ?7 tamil|jaya|vasanth|makkal|captain|aaseervatham|dd tamil|tamilan|blessing.*tamil|naaptol.*tamil|aastha.*tamil/i,
  telugu: /telugu|gemini|etv|maa|10 ?tv|6 ?tv|4 ?tv|ntv|v6|abn|sakshi|t ?news|vanitha|zee telugu|star maa|aastha.*telugu/i,
  kannada: /kannada|udaya|suvarna|zee kannada|colors kannada|kasturi|dd chandana|public.*tv.*kannada|raj.*news.*kannada|aastha.*kannada/i,
  malayalam: /malayalam|asianet|mazhavil|surya|kairali|manorama|amrita|jaihind|media ?one|mathrubhumi|safari|flowers|kaumudy|zee keralam|jeevan/i,
  hindi: /hindi|zee(?!.*tamil|.*telugu|.*kannada|.*malayalam|.*bengali|.*marathi|.*punjabi|.*gujarati)|star plus|sony|colors|&tv|sab tv|rishtey|dangal|aaj tak|abp news|ndtv|india tv|news18|republic|times now|india today|dd india|dd national|dd bharati|news ?24|epic|big magic|zing|dd rajasthan|dd uttar|dd madhya|dd bihar|dd jharkhand|dd delhi|dhakad|aastha|sanskar|ishara|manoranjan|9x.*(?:jalwa|jhakaas|m\b)|music india/i,
  marathi: /marathi|zee marathi|star pravah|colors marathi|fakt marathi/i,
  bengali: /bengali|bangla|jalsha|zee bangla|colors bangla|aakaash|amar.*bangla|calcutta|akd|ananda/i,
  punjabi: /punjab|ptc|mh1|zee punjabi|9x tashan/i,
  gujarati: /gujarati|sandesh|tv9 gujarati|abp asmita|zee 24 kalak|colors gujarati/i,
  urdu: /urdu|salaam/i,
  bhojpuri: /bhojpuri|b4u bhojpuri/i,
  assamese: /assam|pratidin|news.*live.*assam|prag/i,
  odia: /odia|oriya|alankar|mbc/i,
  english: /discovery|national geographic|nat geo|animal planet|bbc|cnn|fox|history|sony pix|&flix|&prive|movies now|romedy|mtv|vh1|comedy central|nick|cartoon|pogo|disney|hungama|sony yay|travel xp|fashion|food|tlc|living|espn|star sports|sony.*sports|eurosport|dd sports|mirror now|wion|zoom/i
};

/**
 * Sleep utility
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Extract domain from tvgId field
 * @param {string} tvgId - Format: "DomainName.tld@Quality"
 * @returns {string|null} - Extracted domain or null
 */
function extractDomain(tvgId) {
  if (!tvgId || typeof tvgId !== 'string') {
    return null;
  }

  // Split by @ and take the first part
  const parts = tvgId.split('@');
  if (parts.length === 0) {
    return null;
  }

  const domain = parts[0].trim();

  // Validate domain format (basic validation)
  if (domain && /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/.test(domain)) {
    return domain;
  }

  return null;
}

/**
 * Fetch website content with retry logic
 * @param {string} domain - Domain name to fetch
 * @param {number} retries - Number of retries (default: CONFIG.maxRetries)
 * @returns {Promise<{html: string, url: string}>}
 * @throws {Error} If all fetch attempts fail
 */
async function fetchWebsite(domain, retries = CONFIG.maxRetries) {
  // Prioritize HTTPS and www variations
  const urls = [
    `https://www.${domain}`,
    `https://${domain}`,
    `http://www.${domain}`
  ];

  for (const url of urls) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await axios.get(url, {
          timeout: CONFIG.timeout,
          headers: {
            'User-Agent': CONFIG.userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive'
          },
          maxRedirects: 5,
          validateStatus: (status) => status < 400
        });

        if (response.data) {
          return { html: response.data, url };
        }
      } catch (error) {
        if (attempt === retries) {
          // Last attempt failed, try next URL
          break;
        }
        // Shorter wait before retry
        await sleep(300);
      }
    }
  }

  throw new Error(`Failed to fetch any URL for domain: ${domain}`);
}

/**
 * Analyze text content using script detection (fast and reliable for Indian languages)
 *
 * Strategy:
 * 1. Unicode script detection (primary, fastest, most reliable)
 * 2. Statistical detection with franc (secondary)
 * 3. Character-based fallback
 *
 * @param {string} text - Text content to analyze
 * @returns {{language: string|null, confidence: number, method: string}} - Detection result with confidence
 */
function analyzeTextLanguage(text) {
  // Clean and prepare text
  const cleanText = text.replace(/\s+/g, ' ').trim();

  // Skip if text is too short
  if (cleanText.length < 50) {
    return { language: null, confidence: 0, method: 'insufficient-text' };
  }

  const sample = cleanText.substring(0, 5000); // Larger sample for better accuracy

  // Step 1: Unicode Script Detection (FASTEST and MOST RELIABLE for Indian languages)
  const scripts = {
    tamil: (sample.match(/[\u0B80-\u0BFF]/g) || []).length,
    telugu: (sample.match(/[\u0C00-\u0C7F]/g) || []).length,
    kannada: (sample.match(/[\u0C80-\u0CFF]/g) || []).length,
    malayalam: (sample.match(/[\u0D00-\u0D7F]/g) || []).length,
    devanagari: (sample.match(/[\u0900-\u097F]/g) || []).length,  // Hindi, Marathi
    bengali: (sample.match(/[\u0980-\u09FF]/g) || []).length,
    gujarati: (sample.match(/[\u0A80-\u0AFF]/g) || []).length,
    punjabi: (sample.match(/[\u0A00-\u0A7F]/g) || []).length,
    latin: (sample.match(/[a-zA-Z]/g) || []).length
  };

  const totalChars = sample.length;
  const maxScript = Object.entries(scripts).reduce((max, [script, count]) =>
    count > max.count ? { script, count } : max
  , { script: null, count: 0 });

  // Calculate confidence based on script character ratio
  const scriptRatio = maxScript.count / totalChars;

  // If we have strong script detection (>5% of content), use it
  if (maxScript.count > 50 && scriptRatio > 0.05) {
    const scriptMap = {
      tamil: 'tamil',
      telugu: 'telugu',
      kannada: 'kannada',
      malayalam: 'malayalam',
      bengali: 'bengali',
      gujarati: 'gujarati',
      punjabi: 'punjabi',
      devanagari: 'hindi',
      latin: 'english'
    };

    const language = scriptMap[maxScript.script];
    if (language && language !== 'english') {
      // Very high confidence for non-English scripts
      return {
        language,
        confidence: Math.min(0.95, scriptRatio * 10), // Cap at 0.95
        method: 'script-detection'
      };
    }
  }

  // Step 2: Statistical detection with franc (for English/mixed content)
  if (cleanText.length >= 100) {
    const detected = franc(cleanText, { minLength: 100 });
    const language = FRANC_TO_LANGUAGE_NAME[detected];

    if (language && language !== 'english') {
      // Medium confidence for franc detection (non-English)
      return {
        language,
        confidence: 0.7,
        method: 'franc-statistical'
      };
    }

    if (language === 'english' && scriptRatio > 0.3 && maxScript.script === 'latin') {
      // High Latin script ratio = likely English
      return {
        language: 'english',
        confidence: 0.6,
        method: 'franc-english'
      };
    }
  }

  // Step 3: Fallback to script detection with lower threshold
  if (maxScript.count > 20) {
    const scriptMap = {
      tamil: 'tamil',
      telugu: 'telugu',
      kannada: 'kannada',
      malayalam: 'malayalam',
      bengali: 'bengali',
      gujarati: 'gujarati',
      punjabi: 'punjabi',
      devanagari: 'hindi',
      latin: 'english'
    };

    const language = scriptMap[maxScript.script];
    if (language) {
      return {
        language,
        confidence: 0.4,
        method: 'script-fallback'
      };
    }
  }

  return { language: null, confidence: 0, method: 'undetermined' };
}

/**
 * Detect language from resource URLs
 * @param {string} resources - Concatenated resource URLs
 * @returns {string|null} - ISO 639-1 language code or null
 */
function detectLanguageFromResources(resources) {
  const patterns = {
    ta: /tamil|ta[-_]in/i,
    te: /telugu|te[-_]in/i,
    hi: /hindi|hi[-_]in/i,
    kn: /kannada|kn[-_]in/i,
    ml: /malayalam|ml[-_]in/i,
    bn: /bengali|bangla|bn[-_]in/i,
    mr: /marathi|mr[-_]in/i,
    gu: /gujarati|gu[-_]in/i,
    pa: /punjabi|pa[-_]in/i,
    en: /en[-_]us|en[-_]gb|english/i
  };

  for (const [code, pattern] of Object.entries(patterns)) {
    if (pattern.test(resources)) {
      return code;
    }
  }

  return null;
}

/**
 * Normalize language code to ISO 639-1
 * @param {string} value - Language code or name to normalize
 * @returns {string|null} - ISO 639-1 code or null
 */
function normalizeLanguageCode(value) {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const normalized = value.toLowerCase().trim();

  // Direct ISO code
  if (/^[a-z]{2}$/.test(normalized)) {
    return normalized;
  }

  // Extract from locale (e.g., "en-US", "ta-IN")
  const localeMatch = normalized.match(/^([a-z]{2})[-_]/);
  if (localeMatch) {
    return localeMatch[1];
  }

  // Full language names
  const langMap = {
    'tamil': 'ta',
    'telugu': 'te',
    'hindi': 'hi',
    'kannada': 'kn',
    'malayalam': 'ml',
    'english': 'en',
    'bengali': 'bn',
    'bangla': 'bn',
    'marathi': 'mr',
    'punjabi': 'pa',
    'gujarati': 'gu',
    'urdu': 'ur',
    'assamese': 'as',
    'odia': 'or',
    'oriya': 'or'
  };

  return langMap[normalized] || null;
}

/**
 * Detect language hints from description text
 *
 * Looks for explicit language mentions like "Tamil language channel", "Telugu news", etc.
 * This helps catch channels that describe their broadcast language in English.
 *
 * @param {string} description - Description text to analyze
 * @returns {string|null} - Full language name or null
 */
function detectLanguageFromDescription(description) {
  if (!description || typeof description !== 'string') {
    return null;
  }

  const text = description.toLowerCase();

  // Language mention patterns (e.g., "Tamil language channel", "Telugu TV", "Hindi news")
  const languageMentions = {
    tamil: /\b(tamil|tamizh)\s+(language|channel|tv|music|news|cinema|movies|satellite)\b/i,
    telugu: /\b(telugu)\s+(language|channel|tv|music|news|cinema|movies|satellite)\b/i,
    hindi: /\b(hindi)\s+(language|channel|tv|music|news|cinema|movies|satellite)\b/i,
    kannada: /\b(kannada)\s+(language|channel|tv|music|news|cinema|movies|satellite)\b/i,
    malayalam: /\b(malayalam)\s+(language|channel|tv|music|news|cinema|movies|satellite)\b/i,
    bengali: /\b(bengali|bangla)\s+(language|channel|tv|music|news|cinema|movies|satellite)\b/i,
    marathi: /\b(marathi)\s+(language|channel|tv|music|news|cinema|movies|satellite)\b/i,
    gujarati: /\b(gujarati)\s+(language|channel|tv|music|news|cinema|movies|satellite)\b/i,
    punjabi: /\b(punjabi)\s+(language|channel|tv|music|news|cinema|movies|satellite)\b/i
  };

  for (const [language, pattern] of Object.entries(languageMentions)) {
    if (pattern.test(text)) {
      return language;
    }
  }

  return null;
}

/**
 * Aggregate language signals and determine final language
 * @param {Array<{source: string, value: string, weight: number}>} signals - Language detection signals
 * @returns {string|null} - ISO 639-1 language code or null
 */
function aggregateLanguageSignals(signals) {
  if (signals.length === 0) {
    return null;
  }

  // Calculate weighted scores
  const scores = {};
  signals.forEach(signal => {
    const langCode = normalizeLanguageCode(signal.value);
    if (langCode) {
      scores[langCode] = (scores[langCode] || 0) + signal.weight;
    }
  });

  // Find highest scoring language
  const entries = Object.entries(scores);
  if (entries.length === 0) {
    return null;
  }

  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0]; // Return highest scoring language code
}

/**
 * Extract and analyze metadata from HTML (fast, metadata-only detection)
 *
 * This function prioritizes metadata extraction from the HTML head section,
 * which is much faster than analyzing the entire body content.
 *
 * @param {string} html - HTML content to analyze
 * @returns {{language: string|null, confidence: 'high'|'low', signals: Array, metadata: Object}} - Detection result
 */
function detectLanguageFromMetadata(html) {
  const $ = cheerio.load(html);
  const signals = [];
  const metadata = {};

  // Extract common metadata for debugging/logging
  metadata.title = $('title').text().trim() || null;
  metadata.description = $('meta[name="description"]').attr('content') || null;
  metadata.ogTitle = $('meta[property="og:title"]').attr('content') || null;
  metadata.ogDescription = $('meta[property="og:description"]').attr('content') || null;
  metadata.ogSiteName = $('meta[property="og:site_name"]').attr('content') || null;

  // 0. Check for language hints in descriptions (CRITICAL for channels like "7S Music - Tamil language channel")
  const descriptionText = (metadata.description || '') + ' ' + (metadata.ogDescription || '') + ' ' + (metadata.title || '');
  const languageHint = detectLanguageFromDescription(descriptionText);
  if (languageHint) {
    signals.push({ source: 'description-hint', value: languageHint, weight: 9 });
  }

  // 1. HTML lang attribute (highest priority)
  const htmlLang = $('html').attr('lang');
  if (htmlLang) {
    signals.push({ source: 'html-lang', value: htmlLang, weight: 10 });
  }

  // 2. Meta content-language
  const metaLang = $('meta[http-equiv="content-language"]').attr('content');
  if (metaLang) {
    signals.push({ source: 'meta-content-language', value: metaLang, weight: 8 });
  }

  // 3. Meta og:locale
  const ogLocale = $('meta[property="og:locale"]').attr('content');
  if (ogLocale) {
    signals.push({ source: 'og-locale', value: ogLocale, weight: 7 });
  }

  // 4. Meta lang
  const metaLangAttr = $('meta[name="language"]').attr('content');
  if (metaLangAttr) {
    signals.push({ source: 'meta-language', value: metaLangAttr, weight: 7 });
  }

  // 5. Check for language-specific resources (scripts/links)
  const scripts = $('script[src]').map((_, el) => $(el).attr('src')).get().join(' ');
  const links = $('link[href]').map((_, el) => $(el).attr('href')).get().join(' ');
  const resources = (scripts + ' ' + links).toLowerCase();

  const resourceLang = detectLanguageFromResources(resources);
  if (resourceLang) {
    signals.push({ source: 'resource-analysis', value: resourceLang, weight: 3 });
  }

  const language = aggregateLanguageSignals(signals);

  // High confidence if we have HTML lang or meta language tags
  const hasStrongSignal = signals.some(s =>
    ['html-lang', 'meta-content-language', 'og-locale', 'meta-language'].includes(s.source)
  );

  return {
    language,
    confidence: hasStrongSignal ? 'high' : 'low',
    signals,
    metadata
  };
}

/**
 * Analyze body text for language detection (PRIMARY detection method)
 *
 * Uses html-to-text for proper text extraction:
 * - Removes scripts, styles, and hidden elements
 * - Properly handles whitespace and line breaks
 * - Extracts only visible content
 *
 * @param {string} html - HTML content to analyze
 * @returns {{language: string|null, confidence: number, method: string}} - Detection result with confidence
 */
function detectLanguageFromBodyText(html) {
  // Use html-to-text for clean text extraction
  // This is MUCH better than cheerio's .text() because:
  // 1. Removes scripts, styles, and hidden elements
  // 2. Properly handles whitespace
  // 3. Only extracts visible text content
  const bodyText = convert(html, {
    wordwrap: false,
    preserveNewlines: false,
    selectors: [
      // Ignore these elements completely
      { selector: 'script', format: 'skip' },
      { selector: 'style', format: 'skip' },
      { selector: 'noscript', format: 'skip' },
      { selector: 'iframe', format: 'skip' },
      { selector: 'svg', format: 'skip' },
      // Extract text from these
      { selector: 'a', options: { ignoreHref: true } },
      { selector: 'img', format: 'skip' }
    ]
  });

  // CRITICAL: Check for language mentions in body text first
  // Example: "7smusic is a famous Tamil language music Free-to-Air satellite TV channel"
  // This catches channels that describe their language in English
  const languageHint = detectLanguageFromDescription(bodyText);
  if (languageHint) {
    return {
      language: languageHint,
      confidence: 0.85,
      method: 'body-language-mention'
    };
  }

  // Fallback to script/statistical analysis
  return analyzeTextLanguage(bodyText);
}

/**
 * Detect language from HTML content (CORRECT strategy for TV/Media sites)
 *
 * CRITICAL: For IPTV/TV channels, visible content language > metadata
 * Many Indian media sites use English templates but serve regional content.
 *
 * Strategy (AUTHORITATIVE for media/TV domains):
 * 1. ALWAYS analyze body text (PRIMARY signal)
 * 2. Extract metadata (SECONDARY hint)
 * 3. Apply conflict resolution (body overrides metadata)
 * 4. Return most reliable result
 *
 * @param {string} html - HTML content to analyze
 * @param {Object} options - Detection options
 * @param {boolean} options.metadataOnly - Only use metadata (NOT RECOMMENDED for TV sites)
 * @returns {string|null} - ISO 639-1 language code or null
 */
function detectLanguageFromHTML(html, options = {}) {
  const signals = [];

  // Step 1: Extract metadata (fast, but NOT authoritative)
  const metadataResult = detectLanguageFromMetadata(html);
  const metadataLang = metadataResult.language;

  // Add metadata signals with adjusted weights
  metadataResult.signals.forEach(signal => {
    // Reduce metadata weight since it's often template language, not content language
    signals.push({ ...signal, weight: signal.weight * 0.5 });
  });

  // Step 2: ALWAYS analyze body text (PRIMARY for TV/media)
  if (!options.metadataOnly) {
    const bodyResult = detectLanguageFromBodyText(html);

    if (bodyResult.language) {
      // Body text gets high weight, especially for non-English
      const bodyWeight = bodyResult.language === 'en' ? 8 : 15; // Non-English body = very strong signal
      signals.push({
        source: 'body-text',
        value: bodyResult.language,
        weight: bodyWeight,
        confidence: bodyResult.confidence,
        method: bodyResult.method
      });

      // CONFLICT RESOLUTION (Critical for Indian media sites)
      // If metadata says "en" but body is non-English with good confidence, override
      if (metadataLang === 'en' && bodyResult.language !== 'en' && bodyResult.confidence >= 0.5) {
        // Body text overrides English metadata
        return bodyResult.language;
      }

      // If body text has very high confidence (script detected), trust it
      if (bodyResult.confidence >= 0.7) {
        return bodyResult.language;
      }
    }
  }

  // Step 3: If metadata-only mode or no body text found
  if (options.metadataOnly) {
    return metadataLang;
  }

  // Step 4: Aggregate all signals (body text weighted higher)
  return aggregateLanguageSignals(signals);
}

/**
 * Detect explicit language mentions in channel name
 * Examples: "6 TV Telugu", "Sun TV Tamil", "Zee Hindi"
 *
 * @param {string} channelName - TV channel name
 * @returns {string|null} - Language name or null
 */
function detectExplicitLanguageInName(channelName) {
  const name = channelName.toLowerCase();

  // Explicit language word patterns (must match whole word)
  const explicitPatterns = {
    tamil: /\btamil\b|\btamizh\b/i,
    telugu: /\btelugu\b/i,
    kannada: /\bkannada\b/i,
    malayalam: /\bmalayalam\b/i,
    hindi: /\bhindi\b/i,
    bengali: /\bbengali\b|\bbangla\b/i,
    marathi: /\bmarathi\b/i,
    punjabi: /\bpunjabi\b|\bpunjab\b/i,
    gujarati: /\bgujarati\b/i,
    english: /\benglish\b/i,
    urdu: /\burdu\b/i,
    bhojpuri: /\bbhojpuri\b/i
  };

  for (const [language, pattern] of Object.entries(explicitPatterns)) {
    if (pattern.test(name)) {
      return language; // Return full language name
    }
  }

  return null;
}

/**
 * Pattern-based language detection (fallback)
 * @param {string} channelName - TV channel name
 * @returns {string} - Language name (not ISO code)
 */
function detectLanguageByPattern(channelName) {
  const name = channelName.toLowerCase();

  for (const [language, pattern] of Object.entries(LANGUAGE_PATTERNS)) {
    if (pattern.test(name)) {
      return language; // Return full language name
    }
  }

  // Default to Hindi for most Indian channels
  if (/tv|channel|news|bharat|india|desi/.test(name)) {
    return 'hindi';
  }

  return 'unknown';
}

/**
 * Main language detection function with web crawling
 * @param {Object} channel - Channel object with name and tvgId
 * @param {Object} cache - Cache object with get/set/has methods
 * @returns {Promise<{language: string, source: string}>}
 */
async function detectLanguage(channel, cache) {
  const domain = extractDomain(channel.tvgId);

  // Strategy 0: Check for EXPLICIT language mention in channel name (HIGHEST PRIORITY)
  // Examples: "6 TV Telugu", "Sun TV Tamil", "Zee Hindi"
  const explicitLang = detectExplicitLanguageInName(channel.name);
  if (explicitLang) {
    // Explicit language in name overrides everything else
    if (domain) {
      cache.set(domain, explicitLang, 'name-explicit');
    }
    return { language: explicitLang, source: 'name-explicit' };
  }

  // Strategy 1: Check cache
  if (domain && cache.has(domain)) {
    const cached = cache.get(domain);
    return { language: cached.language, source: `cached-${cached.source}` };
  }

  // Strategy 2: Web-based detection
  if (domain) {
    try {
      const { html } = await fetchWebsite(domain);
      const detectedLang = detectLanguageFromHTML(html);

      if (detectedLang && detectedLang !== 'unknown') {
        cache.set(domain, detectedLang, 'web');
        return { language: detectedLang, source: 'web' };
      }
    } catch (error) {
      // Web detection failed, will fall back to pattern
      // Note: Logging is handled by the caller
    }
  }

  // Strategy 3: Pattern-based fallback
  const patternLang = detectLanguageByPattern(channel.name);

  if (domain) {
    cache.set(domain, patternLang, 'pattern');
  }

  return { language: patternLang, source: 'pattern' };
}

// Export all functions and constants
module.exports = {
  // Configuration
  CONFIG,
  LANGUAGE_CODES,
  ISO_TO_LANGUAGE,
  LANGUAGE_PATTERNS,

  // Utility functions
  sleep,
  extractDomain,
  normalizeLanguageCode,

  // Web fetching
  fetchWebsite,

  // Language detection
  analyzeTextLanguage,
  detectLanguageFromDescription,  // New: Description language hints
  detectLanguageFromResources,
  aggregateLanguageSignals,
  detectLanguageFromMetadata,     // New: Fast metadata-only detection
  detectLanguageFromBodyText,     // New: Body text analysis
  detectLanguageFromHTML,
  detectLanguageByPattern,
  detectLanguage
};
