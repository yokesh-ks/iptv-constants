#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Category mapping based on channel name patterns
const categoryPatterns = {
  news: /news|aaj tak|abp|ndtv|zee news|india today|times now/i,
  entertainment: /tv|zee|star|sony|colors|&tv|sab|rishtey|dangal/i,
  music: /music|mtv|bindass|9xm|jalwa|jhakaas|tashan/i,
  movies: /movies|cinema|film|flix|pictures|bollywood/i,
  devotional: /aastha|god|bhajan|dharm|sanskar|shubh/i,
  sports: /sports|cricket|football|tennis|fifa|espn|star sports/i,
  kids: /kids|cartoon|pogo|nick|disney|hungama/i,
  documentary: /discovery|national geographic|animal planet|history|nat geo/i,
  lifestyle: /food|travel|lifestyle|fashion|living/i
};

function determineCategory(channelName) {
  const name = channelName.toLowerCase();

  for (const [category, pattern] of Object.entries(categoryPatterns)) {
    if (pattern.test(name)) {
      return category;
    }
  }

  return 'general';
}

function convertToTvFormat(channel) {
  return {
    id: channel.id,
    name: channel.name,
    categoryId: determineCategory(channel.name),
    streamUrl: channel.streamUrl,
    tvgId: channel.tvgId,
    isActive: true
  };
}

function main() {
  const inputFile = path.join(__dirname, '..', 'data', 'in.json');
  const outputDir = path.join(__dirname, '..', 'tv');

  console.log('Reading:', inputFile);
  const channels = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));

  console.log(`Found ${channels.length} channels`);

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  let created = 0;
  let skipped = 0;

  channels.forEach(channel => {
    const tvChannel = convertToTvFormat(channel);
    const outputFile = path.join(outputDir, `${channel.id}.json`);

    // Check if file already exists
    if (fs.existsSync(outputFile)) {
      console.log(`⏭  Skipped: ${channel.name} (${outputFile} already exists)`);
      skipped++;
      return;
    }

    const jsonContent = JSON.stringify(tvChannel, null, 2);
    fs.writeFileSync(outputFile, jsonContent + '\n', 'utf-8');

    created++;
    if (created <= 10) {
      console.log(`✓ Created: ${channel.name} → ${channel.id}.json [${tvChannel.categoryId}]`);
    }
  });

  console.log(`\n📊 Summary:`);
  console.log(`   Created: ${created} files`);
  console.log(`   Skipped: ${skipped} files (already exist)`);
  console.log(`   Output directory: ${outputDir}`);

  // Show category distribution
  const categories = channels.reduce((acc, channel) => {
    const category = determineCategory(channel.name);
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {});

  console.log(`\n📂 Category Distribution:`);
  Object.entries(categories)
    .sort((a, b) => b[1] - a[1])
    .forEach(([category, count]) => {
      console.log(`   ${category}: ${count}`);
    });
}

main();
