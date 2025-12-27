#!/usr/bin/env node

/**
 * Debug Body Text Analysis
 * Shows exactly what text is extracted and script breakdown
 */

const { fetchWebsite } = require('../helpers/websearch-language-detection');
const { convert } = require('html-to-text');

async function debugBodyText(domain) {
  console.log(`\n🔍 Debugging body text for: ${domain}\n`);

  try {
    const { html, url } = await fetchWebsite(domain);
    console.log(`✓ Fetched: ${url}\n`);

    // Use html-to-text for clean extraction (same as detection logic)
    const bodyText = convert(html, {
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

    console.log(`Total characters: ${bodyText.length}`);
    console.log(`Sample (first 500 chars):`);
    console.log('─'.repeat(80));
    console.log(bodyText.substring(0, 500));
    console.log('─'.repeat(80));
    console.log();

    // Analyze script composition
    const sample = bodyText.substring(0, 5000);
    const scripts = {
      tamil: (sample.match(/[\u0B80-\u0BFF]/g) || []).length,
      telugu: (sample.match(/[\u0C00-\u0C7F]/g) || []).length,
      kannada: (sample.match(/[\u0C80-\u0CFF]/g) || []).length,
      malayalam: (sample.match(/[\u0D00-\u0D7F]/g) || []).length,
      devanagari: (sample.match(/[\u0900-\u097F]/g) || []).length,
      bengali: (sample.match(/[\u0980-\u09FF]/g) || []).length,
      gujarati: (sample.match(/[\u0A80-\u0AFF]/g) || []).length,
      punjabi: (sample.match(/[\u0A00-\u0A7F]/g) || []).length,
      latin: (sample.match(/[a-zA-Z]/g) || []).length
    };

    console.log('Script Breakdown (first 5000 chars):');
    console.log('═'.repeat(80));
    Object.entries(scripts)
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .forEach(([script, count]) => {
        const percentage = ((count / sample.length) * 100).toFixed(2);
        const bar = '█'.repeat(Math.floor(percentage / 2));
        console.log(`${script.padEnd(12)} ${count.toString().padStart(5)} (${percentage.padStart(6)}%) ${bar}`);
      });
    console.log('═'.repeat(80));
    console.log();

    // Show Tamil samples if found
    const tamilChars = bodyText.match(/[\u0B80-\u0BFF]+/g);
    if (tamilChars && tamilChars.length > 0) {
      console.log(`\n📝 Tamil text samples found (${tamilChars.length} instances):`);
      tamilChars.slice(0, 10).forEach((text, i) => {
        console.log(`${i + 1}. ${text}`);
      });
    } else {
      console.log('\n⚠ No Tamil script detected in body text');
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run
const domain = process.argv[2] || '7SMusic.in';
debugBodyText(domain);
