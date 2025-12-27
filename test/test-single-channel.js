#!/usr/bin/env node

/**
 * Single Channel Language Detection Test
 *
 * This script tests language detection for a single channel.
 * Useful for debugging and validating the detection logic.
 *
 * Usage:
 *   node test/test-single-channel.js <channel-name>
 *   node test/test-single-channel.js "7s Music"
 *   node test/test-single-channel.js --domain 7SMusic.in
 *   node test/test-single-channel.js --tvg-id "7SMusic.in@SD"
 *
 * @author Senior Backend Automation Engineer
 */

const fs = require('fs');
const path = require('path');
const logger = require('../logger');
const {
  detectLanguage,
  detectLanguageByPattern,
  extractDomain,
  fetchWebsite,
  detectLanguageFromHTML,
  detectLanguageFromMetadata,
  detectLanguageFromBodyText,
  normalizeLanguageCode,
  ISO_TO_LANGUAGE
} = require('../helpers/websearch-language-detection');

// Simple cache for testing
class TestCache {
  constructor() {
    this.cache = {};
  }

  has(domain) {
    return domain in this.cache;
  }

  get(domain) {
    return this.cache[domain];
  }

  set(domain, language, source) {
    this.cache[domain] = { language, source, timestamp: Date.now() };
  }
}

/**
 * Find channel by name from data/in.json
 */
function findChannelByName(channelName) {
  const dataFilePath = path.join(__dirname, '..', 'data', 'in.json');

  if (!fs.existsSync(dataFilePath)) {
    logger.error('data/in.json not found');
    return null;
  }

  const channels = JSON.parse(fs.readFileSync(dataFilePath, 'utf-8'));
  return channels.find(ch =>
    ch.name.toLowerCase().includes(channelName.toLowerCase())
  );
}

/**
 * Test language detection for a channel
 */
async function testChannel(channel, options = {}) {
  const cache = new TestCache();

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 CHANNEL LANGUAGE DETECTION TEST');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('📺 Channel Information:');
  console.log(`   Name:   ${channel.name}`);
  console.log(`   ID:     ${channel.id}`);
  console.log(`   tvgId:  ${channel.tvgId || 'N/A'}`);
  console.log(`   Existing Language: ${channel.language || 'N/A'}\n`);

  const domain = extractDomain(channel.tvgId);
  console.log('🌐 Domain Extraction:');
  console.log(`   Domain: ${domain || 'Not found'}\n`);

  // Test 1: Pattern-based detection
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 Test 1: Pattern-Based Detection');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const patternLang = detectLanguageByPattern(channel.name);
  const patternLangName = ISO_TO_LANGUAGE[patternLang] || patternLang;
  console.log(`   Result: ${patternLang} (${patternLangName})\n`);

  // Test 2: Web-based detection
  if (domain && !options.skipWeb) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🌍 Test 2: Web-Based Detection');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    try {
      console.log(`   Fetching: ${domain}...`);
      const startTime = Date.now();
      const { html, url } = await fetchWebsite(domain);
      const fetchDuration = Date.now() - startTime;

      console.log(`   ✓ Fetched: ${url} (${fetchDuration}ms)`);
      console.log(`   HTML Size: ${(html.length / 1024).toFixed(2)} KB\n`);

      // Step 2a: Metadata detection
      console.log('   Step 2a: Metadata Extraction...');
      const metadataStartTime = Date.now();
      const metadataResult = detectLanguageFromMetadata(html);
      const metadataDuration = Date.now() - metadataStartTime;

      const metadataLangName = metadataResult.language
        ? (ISO_TO_LANGUAGE[metadataResult.language] || metadataResult.language)
        : 'unknown';

      console.log(`   Language: ${metadataResult.language || 'unknown'} (${metadataLangName})`);
      console.log(`   Confidence: ${metadataResult.confidence}`);

      // Show metadata description
      if (metadataResult.metadata) {
        if (metadataResult.metadata.title) {
          console.log(`   Title: ${metadataResult.metadata.title.substring(0, 60)}${metadataResult.metadata.title.length > 60 ? '...' : ''}`);
        }
        if (metadataResult.metadata.description) {
          console.log(`   Description: ${metadataResult.metadata.description.substring(0, 80)}${metadataResult.metadata.description.length > 80 ? '...' : ''}`);
        }
      }

      if (metadataResult.signals.length > 0) {
        console.log(`   Signals:`);
        metadataResult.signals.forEach(s => {
          console.log(`     • ${s.source}: ${s.value} (weight: ${s.weight})`);
        });
      }

      if (metadataResult.language === 'en') {
        console.log(`   ⚠ Metadata indicates template language (English)`);
      }
      console.log(`   Duration: ${metadataDuration}ms\n`);

      // Step 2b: Body text detection (PRIMARY)
      console.log('   Step 2b: Body Text Detection (PRIMARY)...');
      const bodyStartTime = Date.now();
      const bodyResult = detectLanguageFromBodyText(html);
      const bodyDuration = Date.now() - bodyStartTime;

      const bodyLangName = bodyResult.language
        ? (ISO_TO_LANGUAGE[bodyResult.language] || bodyResult.language)
        : 'unknown';

      console.log(`   Language: ${bodyResult.language || 'unknown'} (${bodyLangName})`);
      console.log(`   Confidence: ${(bodyResult.confidence * 100).toFixed(1)}%`);
      console.log(`   Method: ${bodyResult.method}`);
      console.log(`   Duration: ${bodyDuration}ms`);

      // Show HTML text content sample
      const { convert } = require('html-to-text');
      const extractedText = convert(html, {
        wordwrap: false,
        preserveNewlines: false,
        selectors: [
          { selector: 'script', format: 'skip' },
          { selector: 'style', format: 'skip' },
          { selector: 'noscript', format: 'skip' },
          { selector: 'iframe', format: 'skip' },
          { selector: 'svg', format: 'skip' },
          { selector: 'a', options: { ignoreHref: true } },
          { selector: 'img', format: 'skip' }
        ]
      });

      // Show text content (configurable length)
      const showTextChars = options.showTextChars || 300;
      console.log(`\n   📄 HTML Text Content Sample (first ${showTextChars} chars):`);
      console.log(`   ${'─'.repeat(70)}`);
      const textSample = extractedText.substring(0, showTextChars).replace(/\n/g, ' ').trim();
      console.log(`   ${textSample}${extractedText.length > showTextChars ? '...' : ''}`);
      console.log(`   ${'─'.repeat(70)}`);
      console.log(`   Total extracted: ${extractedText.length} characters\n`);

      // Step 2c: Full HTML detection with conflict resolution
      console.log('   Step 2c: Full Detection (with conflict resolution)...');
      const fullStartTime = Date.now();
      const webLang = detectLanguageFromHTML(html);
      const fullDuration = Date.now() - fullStartTime;
      const webLangName = webLang ? (ISO_TO_LANGUAGE[webLang] || webLang) : 'unknown';

      console.log(`   Final Result: ${webLang || 'unknown'} (${webLangName})`);
      console.log(`   Duration: ${fullDuration}ms`);

      // Show conflict resolution
      if (metadataResult.language && bodyResult.language && metadataResult.language !== bodyResult.language) {
        if (metadataResult.language === 'en' && bodyResult.language !== 'en' && bodyResult.confidence >= 0.5) {
          console.log(`   🔁 CONFLICT RESOLVED: Metadata (${metadataResult.language}) overridden by body content (${bodyResult.language})`);
        } else {
          console.log(`   ⚠ Conflict detected: Metadata=${metadataResult.language}, Body=${bodyResult.language}`);
        }
      } else if (bodyResult.confidence >= 0.7) {
        console.log(`   ✓ High confidence body text detection used`);
      }
      console.log();
    } catch (error) {
      console.log(`   ✗ Web detection failed: ${error.message}\n`);
    }
  } else if (!domain) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🌍 Test 2: Web-Based Detection');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('   ⚠ Skipped: No domain found in tvgId\n');
  }

  // Test 3: Full detection (combines all strategies)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎯 Test 3: Full Detection Pipeline');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const startTime = Date.now();
  const { language, source } = await detectLanguage(channel, cache);
  const duration = Date.now() - startTime;
  const langName = ISO_TO_LANGUAGE[language] || language;

  console.log(`   Language: ${language} (${langName})`);
  console.log(`   Source:   ${source}`);
  console.log(`   Duration: ${duration}ms\n`);

  // Summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log(`   Channel:          ${channel.name}`);
  console.log(`   Detected:         ${language} (${langName})`);
  console.log(`   Detection Source: ${source}`);
  console.log(`   Total Time:       ${duration}ms`);

  if (channel.language && channel.language !== 'unknown') {
    const match = channel.language === language ? '✓' : '✗';
    console.log(`   Matches Existing: ${match} (existing: ${channel.language})`);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage:
  node test/test-single-channel.js <channel-name>
  node test/test-single-channel.js "7s Music"
  node test/test-single-channel.js --domain 7SMusic.in
  node test/test-single-channel.js --tvg-id "7SMusic.in@SD"
  node test/test-single-channel.js --skip-web "Sun TV"

Options:
  --domain <domain>     Test using domain directly
  --tvg-id <tvgId>      Test using tvgId directly
  --skip-web            Skip web-based detection (pattern only)
  --show-text <chars>   Show more text content (default: 300)
  -h, --help            Show this help message

Examples:
  node test/test-single-channel.js "sun tv"
  node test/test-single-channel.js --domain 7SMusic.in
  node test/test-single-channel.js --tvg-id "7SMusic.in@SD"
  node test/test-single-channel.js --show-text 500 "7s music"
    `);
    process.exit(0);
  }

  let channel = null;
  const options = {};

  // Parse arguments
  if (args.includes('--domain')) {
    const domainIndex = args.indexOf('--domain');
    const domain = args[domainIndex + 1];
    channel = {
      name: domain,
      id: 'test',
      tvgId: `${domain}@SD`
    };
  } else if (args.includes('--tvg-id')) {
    const tvgIdIndex = args.indexOf('--tvg-id');
    const tvgId = args[tvgIdIndex + 1];
    const domain = extractDomain(tvgId);
    channel = {
      name: domain || tvgId,
      id: 'test',
      tvgId: tvgId
    };
  } else {
    // Find by channel name
    const channelName = args.find(arg => !arg.startsWith('--'));

    if (!channelName) {
      console.error('Error: Please provide a channel name');
      process.exit(1);
    }

    channel = findChannelByName(channelName);

    if (!channel) {
      console.error(`Error: Channel "${channelName}" not found in data/in.json`);
      console.error('\nTip: Search is case-insensitive and uses partial matching');
      process.exit(1);
    }
  }

  // Check for skip-web option
  if (args.includes('--skip-web')) {
    options.skipWeb = true;
  }

  // Check for show-text option
  if (args.includes('--show-text')) {
    const textIndex = args.indexOf('--show-text');
    const textLength = parseInt(args[textIndex + 1], 10);
    if (!isNaN(textLength) && textLength > 0) {
      options.showTextChars = textLength;
    }
  }

  // Run test
  await testChannel(channel, options);
}

// Execute
main().catch(error => {
  console.error('Fatal error:', error.message);
  console.error(error.stack);
  process.exit(1);
});
