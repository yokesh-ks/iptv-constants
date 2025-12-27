# Test Directory

This directory contains test scripts for validating the IPTV constants functionality.

## Available Tests

### test-single-channel.js

Test language detection for a single TV channel. Useful for debugging and validating the detection logic.

**Features:**
- Tests pattern-based detection
- Tests web-based detection (HTML analysis, text analysis)
- Shows full detection pipeline
- Detailed output with timing information
- Supports multiple input methods

**Usage:**

```bash
# Test by channel name (searches data/in.json)
node test/test-single-channel.js "7s Music"
node test/test-single-channel.js "sun tv"

# Test by domain directly
node test/test-single-channel.js --domain 7SMusic.in

# Test by tvgId directly
node test/test-single-channel.js --tvg-id "7SMusic.in@SD"

# Skip web detection (pattern only)
node test/test-single-channel.js --skip-web "Sun TV"

# Show help
node test/test-single-channel.js --help
```

**Example Output:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧪 CHANNEL LANGUAGE DETECTION TEST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📺 Channel Information:
   Name:   7s Music
   ID:     7s-music
   tvgId:  7SMusic.in@SD
   Existing Language: hi

🌐 Domain Extraction:
   Domain: 7SMusic.in

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Test 1: Pattern-Based Detection
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   Result: hi (hindi)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌍 Test 2: Web-Based Detection
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   Fetching: 7SMusic.in...
   ✓ Fetched: https://www.7SMusic.in (1234ms)
   HTML Size: 45.67 KB

   Analyzing HTML...
   Result: hi (hindi)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 Test 3: Full Detection Pipeline
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   Language: hi (hindi)
   Source:   web
   Duration: 1456ms

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   Channel:          7s Music
   Detected:         hi (hindi)
   Detection Source: web
   Total Time:       1456ms
   Matches Existing: ✓ (existing: hi)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Running Tests

Make sure you have all dependencies installed:

```bash
yarn install
# or
npm install
```

Then run any test script using Node.js:

```bash
node test/test-single-channel.js "channel name"
```
