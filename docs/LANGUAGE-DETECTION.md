# Language Detection System

## Overview

The language enrichment script uses a **multi-strategy approach** to detect and assign ISO 639-1 language codes to TV channel data:

1. **Web-based Detection** (Primary) - Crawls channel websites to analyze language signals
2. **Pattern-based Detection** (Fallback) - Uses regex patterns on channel names
3. **Intelligent Caching** - Stores results to avoid repeated web requests

## Architecture

### Domain Extraction

The script extracts website domains from the `tvgId` field:

```
Input:  "7SMusic.in@SD"
Output: "7SMusic.in"
```

**Validation Rules:**
- Format: `<domain>@<quality>`
- Domain must match pattern: `^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$`
- Examples:
  - ✅ `SunTV.in@HD` → `SunTV.in`
  - ✅ `ZeeNews.in@SD` → `ZeeNews.in`
  - ❌ `InvalidFormat` → `null`

### Web-based Language Detection

The script crawls channel websites and analyzes multiple signals:

#### Signal Sources (Weighted)

1. **HTML `lang` attribute** (Weight: 10)
   ```html
   <html lang="ta">
   ```

2. **Meta Content-Language** (Weight: 8)
   ```html
   <meta http-equiv="content-language" content="ta-IN">
   ```

3. **Open Graph Locale** (Weight: 7)
   ```html
   <meta property="og:locale" content="ta_IN">
   ```

4. **Meta Language Tag** (Weight: 7)
   ```html
   <meta name="language" content="Tamil">
   ```

5. **Text Character Analysis** (Weight: 5)
   - Analyzes first 5000 characters of body text
   - Detects Unicode character ranges for Indian scripts:
     - Devanagari (Hindi/Marathi): `\u0900-\u097F`
     - Tamil: `\u0B80-\u0BFF`
     - Telugu: `\u0C00-\u0C7F`
     - Kannada: `\u0C80-\u0CFF`
     - Malayalam: `\u0D00-\u0D7F`
     - Bengali: `\u0980-\u09FF`
     - Gujarati: `\u0A80-\u0AFF`
     - Punjabi: `\u0A00-\u0A7F`
     - Latin (English): `a-zA-Z`

6. **Resource URL Analysis** (Weight: 3)
   - Analyzes `<script src>` and `<link href>` URLs
   - Looks for language indicators in paths (e.g., `/ta-in/`, `/tamil/`)

#### Weighted Aggregation

Signals are scored and aggregated:

```javascript
// Example signal collection
signals = [
  { source: 'html-lang', value: 'ta', weight: 10 },
  { source: 'text-analysis', value: 'ta', weight: 5 }
]

// Scoring
scores = {
  'ta': 10 + 5 = 15  // Tamil wins
}
```

### HTTP Request Strategy

**Multi-URL Attempt:**
```javascript
[
  'https://7SMusic.in',
  'http://7SMusic.in',
  'https://www.7SMusic.in',
  'http://www.7SMusic.in'
]
```

**Retry Logic:**
- Max retries: 2
- Exponential backoff: 500ms × (attempt + 1)
- Timeout: 10 seconds per request
- Max redirects: 5

**Headers:**
```
User-Agent: Mozilla/5.0 (compatible; LanguageDetectorBot/1.0)
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8
Accept-Language: en-US,en;q=0.9
Accept-Encoding: gzip, deflate
```

### Caching System

Results are cached to `.language-cache.json`:

```json
{
  "SunTV.in": {
    "language": "ta",
    "source": "web",
    "timestamp": 1703712345678
  },
  "ZeeNews.in": {
    "language": "hi",
    "source": "pattern",
    "timestamp": 1703712345679
  }
}
```

**Benefits:**
- Avoids re-crawling websites
- Persists across script runs
- Speeds up subsequent enrichments
- Reduces network load

### Pattern-based Fallback

When web detection fails, the script falls back to regex pattern matching:

```javascript
LANGUAGE_PATTERNS = {
  tamil: /tamil|sun tv|raj tv|kalaignar|vijay.../i,
  telugu: /telugu|gemini|etv|maa|10 ?tv|6 ?tv.../i,
  hindi: /hindi|zee|star plus|sony|colors.../i,
  // ... more patterns
}
```

**Fallback Triggers:**
- Domain extraction fails
- Website is unreachable
- No valid language signals detected from HTML

### ISO 639-1 Normalization

All languages are normalized to ISO 639-1 codes:

| Full Name | ISO Code | Example Channels |
|-----------|----------|------------------|
| Tamil | `ta` | Sun TV, Raj TV |
| Telugu | `te` | Gemini, ETV, Maa |
| Hindi | `hi` | Zee, Star Plus, Sony |
| Kannada | `kn` | Udaya, Suvarna |
| Malayalam | `ml` | Asianet, Mazhavil |
| English | `en` | BBC, CNN, Discovery |
| Bengali | `bn` | Star Jalsha, Zee Bangla |
| Marathi | `mr` | Zee Marathi |
| Punjabi | `pa` | PTC, MH1 |
| Gujarati | `gu` | Sandesh News |
| Urdu | `ur` | Zee Salaam |
| Bhojpuri | `bh` | B4U Bhojpuri |
| Assamese | `as` | Pratidin Time |
| Odia | `or` | Alankar TV |
| Unknown | `unknown` | Undetected |

**Normalization Handles:**
- Direct ISO codes: `ta`, `hi`, `en`
- Locale codes: `ta-IN`, `en-US` → `ta`, `en`
- Full names: `Tamil`, `Hindi` → `ta`, `hi`
- Variants: `Bangla` → `bn`

## Configuration

```javascript
const CONFIG = {
  timeout: 10000,                    // 10 second timeout per request
  maxRetries: 2,                     // Retry failed requests twice
  rateLimitDelay: 1000,              // 1 second between batches
  cacheFile: '.language-cache.json', // Cache file path
  userAgent: 'Mozilla/5.0 (compatible; LanguageDetectorBot/1.0)',
  maxConcurrent: 5                   // Process 5 channels concurrently
};
```

## Concurrency & Rate Limiting

**Batch Processing:**
- Processes 5 channels concurrently (configurable)
- 1 second delay between batches
- Prevents overwhelming target servers
- Maintains good citizenship

**Example Flow:**
```
Batch 1: [Ch1, Ch2, Ch3, Ch4, Ch5] → Process in parallel
         ↓ (1 second delay)
Batch 2: [Ch6, Ch7, Ch8, Ch9, Ch10] → Process in parallel
         ↓ (1 second delay)
...
```

## Error Handling

**Graceful Degradation:**
1. Web request fails → Try next URL variant
2. All URLs fail → Fall back to pattern matching
3. Pattern matching → Default to `hi` for Indian channels
4. Non-Indian channels → Mark as `unknown`

**Error Logging:**
- Failed web requests: Logged as debug messages
- File processing errors: Logged with file path
- Fatal errors: Exit with code 1

## Performance Metrics

**Example Output:**
```
📊 Summary:
   Enriched: 565 files
   Skipped: 1 files (already have language)
   Errors: 0 files
   Total: 566 files

📍 Detection Sources:
   cached-web: 312
   cached-pattern: 198
   web: 42
   pattern: 13

🌐 Language Distribution:
   hi (hindi): 277
   unknown (unknown): 142
   en (english): 26
   te (telugu): 25
   ta (tamil): 19
```

## Usage

### Basic Usage

```bash
npm run enrich
```

### Testing

```bash
# Test domain extraction
node scripts/test-language-detection.js
```

### Cache Management

```bash
# View cache
cat .language-cache.json

# Clear cache (forces re-detection)
rm .language-cache.json
```

## Integration Example

```javascript
// Channel file: tv/sun-tv.json
{
  "id": "sun-tv",
  "name": "Sun TV",
  "categoryId": "entertainment",
  "streamUrl": "https://...",
  "tvgId": "SunTV.in@HD",
  "isActive": true,
  "language": "ta"  // ← Added by enrichment script
}
```

## Best Practices

1. **Run with cache:** Subsequent runs will be much faster
2. **Monitor rate limits:** Adjust `CONFIG.rateLimitDelay` if needed
3. **Review unknown:** Manually verify channels marked as `unknown`
4. **Update patterns:** Add new channel name patterns as needed
5. **Respect robots.txt:** Ensure crawling is permitted

## Troubleshooting

### High "unknown" count
- Check if websites are accessible
- Verify domain extraction is working
- Add missing patterns to `LANGUAGE_PATTERNS`

### Slow performance
- Increase `CONFIG.maxConcurrent`
- Decrease `CONFIG.timeout`
- Use cached results

### Wrong language detected
- Check website's actual language tags
- Verify pattern matching logic
- Manually override in JSON file

## Future Enhancements

- [ ] Machine learning-based text classification
- [ ] Support for multilingual channels
- [ ] Confidence scores for detections
- [ ] API-based language detection services
- [ ] Historical tracking of language changes
