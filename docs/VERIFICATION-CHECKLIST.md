# ✅ Verification Checklist

## Pre-Deployment Verification

### 1. Dependencies Installed

```bash
npm list --depth=0
```

**Expected output:**
```
├── axios@1.13.2
├── cheerio@1.1.2
└── franc@6.2.0
```

✅ PASS: All dependencies present  
❌ FAIL: Run `npm install`

---

### 2. Franc Library Test

```bash
node scripts/test-franc.js
```

**Expected output:**
```
✓ Tamil       : PASS (detected as tam)
✓ Telugu      : PASS (detected as tel)
✓ Hindi       : PASS (detected as hin)
✓ Kannada     : PASS (detected as kan)
✓ Malayalam   : PASS (detected as mal)
✓ English     : PASS (detected as eng)
✓ Bengali     : PASS (detected as ben)

📊 Results: 7 passed, 0 failed
✅ All tests passed! Franc is working correctly.
```

✅ PASS: All 7 tests passed  
❌ FAIL: Check franc installation

---

### 3. Domain Extraction Test

```bash
node scripts/test-language-detection.js
```

**Expected output:**
```
🧪 Testing Language Detection

📋 Sample Channels:

Channel: 7S Music
  tvgId: 7SMusic.in@SD
  Domain: 7SMusic.in
  Current Language: [any value]

Channel: Raj TV
  tvgId: RajTV.in@SD
  Domain: RajTV.in
  Current Language: tamil
```

✅ PASS: Domains extracted correctly  
❌ FAIL: Check tvgId format in JSON files

---

### 4. Script Syntax Check

```bash
node --check scripts/enrich-tv-with-language.js
```

**Expected:** No output (silent = success)

✅ PASS: No syntax errors  
❌ FAIL: Fix syntax errors shown

---

### 5. Sample Channel File Check

```bash
cat tv/sun-tv.json | jq '.'
```

**Expected structure:**
```json
{
  "id": "sun-tv",
  "name": "Sun TV",
  "categoryId": "entertainment",
  "streamUrl": "https://...",
  "tvgId": "SunTV.in@HD",
  "isActive": true,
  "language": "ta"  ← Should have this
}
```

✅ PASS: Valid JSON structure  
❌ FAIL: Fix JSON syntax

---

### 6. Network Connectivity Test

```bash
curl -I https://www.google.com
```

**Expected:** HTTP 200 response

✅ PASS: Network accessible  
❌ FAIL: Check firewall/network

---

### 7. Write Permissions Test

```bash
touch .language-cache-test.json && rm .language-cache-test.json && echo "✅ Write permissions OK"
```

**Expected:** ✅ Write permissions OK

✅ PASS: Can write cache file  
❌ FAIL: Check directory permissions

---

## Dry Run Test

### 8. Test on Single Channel

Create a test file:

```bash
cat > tv/test-channel.json <<'JSON'
{
  "id": "test-channel",
  "name": "Test Channel",
  "categoryId": "general",
  "streamUrl": "https://example.com/stream.m3u8",
  "tvgId": "TestChannel.in@SD",
  "isActive": true
}
JSON
```

Run enrichment (will process all channels):

```bash
npm run enrich
```

Check the test file:

```bash
cat tv/test-channel.json | jq '.language'
```

**Expected:** A language code (e.g., "hi", "en", "unknown")

Clean up:

```bash
rm tv/test-channel.json
```

✅ PASS: Language field added  
❌ FAIL: Debug with error logs

---

## Post-Deployment Verification

### 9. Cache File Created

```bash
ls -lh .language-cache.json
```

**Expected:** File exists with size > 0

```bash
cat .language-cache.json | jq 'keys | length'
```

**Expected:** Number of cached domains

✅ PASS: Cache working  
❌ FAIL: Check write permissions

---

### 10. Sample Results Check

```bash
# Check language distribution
cat tv/*.json | jq -r '.language' | sort | uniq -c | sort -rn | head -10
```

**Expected output:**
```
 277 hi
 142 unknown
  26 en
  25 te
  19 ta
  ...
```

✅ PASS: Reasonable distribution  
❌ FAIL: Review detection logic

---

### 11. Detection Source Distribution

After first run, check cache:

```bash
cat .language-cache.json | jq -r '.[] | .source' | sort | uniq -c
```

**Expected:**
```
  X web      (successful web detections)
  Y pattern  (fallback detections)
```

✅ PASS: Sources tracked  
❌ FAIL: Cache not updating

---

## Performance Verification

### 12. Timing Test (Cached)

```bash
time npm run enrich
```

**With cache:** Should complete in < 5 seconds  
**Without cache:** Will take several minutes

---

## Troubleshooting

### If Tests Fail

1. **Dependencies missing:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Franc not working:**
   ```bash
   npm uninstall franc
   npm install franc@6.2.0
   ```

3. **Network errors:**
   - Check firewall settings
   - Verify DNS resolution
   - Test with: `curl https://www.google.com`

4. **Permission errors:**
   ```bash
   chmod +x scripts/*.js
   chmod 755 .
   ```

5. **JSON syntax errors:**
   ```bash
   # Validate all JSON files
   find tv -name "*.json" -exec sh -c 'jq empty {} 2>&1 || echo "Invalid: {}"' \;
   ```

---

## Ready for Production?

Check all items:

- [ ] All 12 verification tests pass
- [ ] Documentation reviewed
- [ ] Cache directory writable
- [ ] Network accessible
- [ ] Backup existing data
- [ ] Test run completed successfully

**If all checked:** ✅ **READY FOR PRODUCTION**  
**If any unchecked:** ❌ **Fix issues first**

---

## Support

- Technical docs: `LANGUAGE-DETECTION.md`
- Usage guide: `ENRICHMENT-GUIDE.md`
- Implementation: `IMPLEMENTATION-SUMMARY.md`
