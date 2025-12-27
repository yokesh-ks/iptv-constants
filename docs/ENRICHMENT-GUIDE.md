# Language Enrichment System - Production Guide

## Overview

The language enrichment script is a **production-grade, multi-strategy language detection system** designed for TV channel metadata. It combines web crawling, statistical analysis, and pattern matching to accurately detect and assign ISO 639-1 language codes.

## Key Features

### ✅ Multi-Strategy Detection
1. **HTML Metadata** (Highest Priority)
   - `<html lang="">` attributes
   - Meta content-language tags
   - Open Graph locale tags

2. **Statistical Text Analysis** (High Accuracy)
   - Uses `franc` library for language detection
   - Analyzes website body text
   - Handles all major Indian languages

3. **Character Script Detection** (Fallback)
   - Unicode range analysis
   - Detects Devanagari, Tamil, Telugu, Kannada, Malayalam, Bengali, etc.

4. **Pattern Matching** (Last Resort)
   - Regex-based channel name matching
   - Domain-specific patterns

### ✅ Production-Ready Features
- **Intelligent Caching**: Persistent JSON cache to avoid redundant requests
- **Rate Limiting**: Configurable delays between batches
- **Concurrent Processing**: Process multiple channels in parallel
- **Retry Logic**: Exponential backoff for failed requests
- **Error Handling**: Graceful degradation with comprehensive logging

##Usage

### Basic Command

```bash
npm run enrich
```

### With Custom Configuration

Edit `scripts/enrich-tv-with-language.js` CONFIG object:

```javascript
const CONFIG = {
  timeout: 10000,          // Request timeout (ms)
  maxRetries: 2,           // Retry attempts
  rateLimitDelay: 1000,    // Delay between batches (ms)
  cacheFile: '.language-cache.json',
  maxConcurrent: 5         // Parallel requests
};
```

## Detection Flow

```
┌─────────────────┐
│  Extract Domain │  (from tvgId field)
│  7SMusic.in@SD  │
│       ↓         │
│  7SMusic.in     │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Check Cache?   │──YES──→ Return Cached Result
└────────┬────────┘
         │ NO
         ↓
┌─────────────────┐
│  Fetch Website  │  (https://7SMusic.in)
│  - Try HTTPS    │
│  - Try HTTP     │
│  - Try www      │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Parse HTML     │
│  1. lang attr   │  Weight: 10
│  2. meta tags   │  Weight: 8
│  3. og:locale   │  Weight: 7
│  4. franc(text) │  Weight: 5
│  5. resources   │  Weight: 3
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Aggregate      │
│  Weighted       │
│  Signals        │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Found?         │──YES──→ Cache & Return
└────────┬────────┘
         │ NO
         ↓
┌─────────────────┐
│  Pattern Match  │  (channel name)
│  Fallback       │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Cache & Return │
└─────────────────┘
```

## Language Support

### Supported Languages (ISO 639-1)

| Code | Language | Detection Method |
|------|----------|------------------|
| `ta` | Tamil | Web + franc + Script |
| `te` | Telugu | Web + franc + Script |
| `hi` | Hindi | Web + franc + Script |
| `kn` | Kannada | Web + franc + Script |
| `ml` | Malayalam | Web + franc + Script |
| `en` | English | Web + franc |
| `bn` | Bengali | Web + franc + Script |
| `mr` | Marathi | Web + franc + Script |
| `pa` | Punjabi | Web + franc + Script |
| `gu` | Gujarati | Web + franc + Script |
| `ur` | Urdu | Web + franc |
| `bh` | Bhojpuri | Pattern only |
| `as` | Assamese | Web + franc + Script |
| `or` | Odia | Web + franc + Script |

## Testing

### Test Domain Extraction

```bash
node scripts/test-language-detection.js
```

### Test Franc Library

```bash
node scripts/test-franc.js
```

### Test Full Enrichment (Dry Run)

```bash
# Process first 10 channels
node -e "
const script = require('./scripts/enrich-tv-with-language.js');
// Set CONFIG.maxConcurrent = 1 for sequential testing
"
```

## Cache Management

### View Cache

```bash
cat .language-cache.json | jq '.'
```

### Cache Structure

```json
{
  "SunTV.in": {
    "language": "ta",
    "source": "web",
    "timestamp": 1703712345678
  }
}
```

### Clear Cache

```bash
# Force re-detection for all channels
rm .language-cache.json
```

### Clear Specific Domain

```bash
# Using jq
cat .language-cache.json | jq 'del(.["SunTV.in"])' > .language-cache.json
```

## Performance Tuning

### For Faster Processing

```javascript
CONFIG.maxConcurrent = 10;  // More parallel requests
CONFIG.timeout = 5000;      // Shorter timeout
CONFIG.rateLimitDelay = 500; // Less delay
```

### For Better Accuracy (Slower)

```javascript
CONFIG.maxConcurrent = 3;   // Fewer parallel requests
CONFIG.timeout = 15000;     // Longer timeout
CONFIG.maxRetries = 3;      // More retries
```

### For Respectful Crawling

```javascript
CONFIG.maxConcurrent = 5;
CONFIG.rateLimitDelay = 2000; // 2 second delay
```

## Troubleshooting

### High "unknown" Count

**Symptoms**: Many channels marked as `unknown`

**Solutions**:
1. Check if websites are accessible
2. Verify domain extraction: `node scripts/test-language-detection.js`
3. Check network/firewall issues
4. Add patterns to `LANGUAGE_PATTERNS` for specific channels

### Slow Performance

**Symptoms**: Script takes too long

**Solutions**:
1. Increase `CONFIG.maxConcurrent`
2. Decrease `CONFIG.timeout`
3. Use cached results (don't delete cache)
4. Check network speed

### Wrong Language Detected

**Symptoms**: Incorrect language assignments

**Solutions**:
1. Check website's actual HTML lang tags
2. Verify franc detection: `node scripts/test-franc.js`
3. Review pattern matching logic
4. Manually override in JSON file if needed

### Memory Issues

**Symptoms**: Out of memory errors

**Solutions**:
1. Decrease `CONFIG.maxConcurrent`
2. Process in smaller batches
3. Clear cache periodically

## Security & Best Practices

### Rate Limiting
- Default: 1 second between batches
- Prevents server overload
- Respectful of target websites

### User Agent
```
Mozilla/5.0 (compatible; LanguageDetectorBot/1.0)
```

### Timeout Handling
- 10 second default timeout
- Prevents hanging requests
- Graceful error handling

### robots.txt Compliance
- Script does not check robots.txt
- Ensure manual compliance if needed
- Consider adding robots.txt parser

## Advanced Usage

### Custom Language Patterns

Add new patterns in `LANGUAGE_PATTERNS`:

```javascript
LANGUAGE_PATTERNS = {
  // ... existing patterns
  newlang: /pattern1|pattern2|pattern3/i
};
```

### Manual Overrides

For channels that can't be auto-detected:

```javascript
// In enrichChannelFile function
const MANUAL_OVERRIDES = {
  'channel-id': 'ta',  // Force Tamil
  'another-id': 'hi'   // Force Hindi
};
```

### Custom Signal Weights

Adjust detection priorities:

```javascript
// In detectLanguageFromHTML function
signals.push({ source: 'html-lang', value: htmlLang, weight: 15 });  // Increase weight
signals.push({ source: 'text-analysis', value: textAnalysis, weight: 3 });  // Decrease weight
```

## Output Examples

### Successful Run

```
🚀 Starting TV Channel Language Enrichment
📊 Configuration:
   - Timeout: 10000ms
   - Max Retries: 2
   - Rate Limit: 1000ms
   - Max Concurrent: 5
   - Cache File: .language-cache.json

📁 Found 566 channel files

✓ [1] Sun TV → tamil (web)
✓ [2] Zee News → hindi (cached-web)
✓ [3] Raj TV → tamil (cached-web)
...
✓ [50] Discovery → english (web)
✓ [100] ABP News → hindi (pattern)
...

✅ Enrichment Complete!

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
   ml (malayalam): 17
   bn (bengali): 15
   pa (punjabi): 14
   kn (kannada): 10
   gu (gujarati): 5
   mr (marathi): 4
   bh (bhojpuri): 4
   as (assamese): 3
   or (odia): 3
   ur (urdu): 1

💾 Cache saved to: .language-cache.json
```

## Integration with CI/CD

### GitHub Actions Example

```yaml
- name: Enrich Channel Languages
  run: |
    npm install
    npm run enrich
    git add tv/*.json .language-cache.json
    git commit -m "chore: update language metadata"
```

### Pre-commit Hook

```.git/hooks/pre-commit
#!/bin/bash
npm run enrich
git add .language-cache.json
```

## Future Enhancements

- [ ] ML-based classification
- [ ] Confidence scores
- [ ] Multilingual channel support
- [ ] API-based detection services
- [ ] Real-time language detection API
- [ ] Language change tracking

## Support

For issues or questions:
1. Check this guide
2. Review [LANGUAGE-DETECTION.md](LANGUAGE-DETECTION.md)
3. Test with sample channels
4. Check cache for inconsistencies
