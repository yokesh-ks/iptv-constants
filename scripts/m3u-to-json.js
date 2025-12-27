#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function parseM3U(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').map(line => line.trim());
  const channels = [];

  let currentChannel = null;
  let vlcOpts = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('#EXTM3U')) {
      continue;
    }

    if (line.startsWith('#EXTINF:')) {
      const attributes = {};

      const attrRegex = /(\w+(?:-\w+)*)="([^"]*)"/g;
      let match;
      while ((match = attrRegex.exec(line)) !== null) {
        attributes[match[1]] = match[2];
      }

      const commaIndex = line.indexOf(',');
      const nameAndInfo = commaIndex !== -1 ? line.substring(commaIndex + 1) : '';

      const qualityMatch = nameAndInfo.match(/\((\d+p)\)/);
      const quality = qualityMatch ? qualityMatch[1] : '';

      const nameWithoutQuality = nameAndInfo
        .replace(/\(\d+p\)/g, '')
        .replace(/\[.*?\]/g, '')
        .trim();

      currentChannel = {
        id: '',
        name: nameWithoutQuality,
        tvgId: attributes['tvg-id'] || '',
        quality: quality,
        streamUrl: '',
        attributes: attributes
      };

      vlcOpts = [];
    }

    if (line.startsWith('#EXTVLCOPT:')) {
      vlcOpts.push(line.substring(12));
    }

    if (line && !line.startsWith('#') && currentChannel) {
      currentChannel.streamUrl = line;

      const slug = currentChannel.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      currentChannel.id = slug;

      if (vlcOpts.length > 0) {
        currentChannel.attributes['vlc-opts'] = vlcOpts.join('; ');
      }

      channels.push(currentChannel);
      currentChannel = null;
      vlcOpts = [];
    }
  }

  return channels;
}

function main() {
  const inputFile = path.join(__dirname, '..', 'data', 'iptv', 'streams', 'in.m3u');
  const outputFile1 = path.join(__dirname, '..', 'in.json');
  const outputFile2 = path.join(__dirname, '..', 'data', 'in.json');

  console.log('Parsing M3U file:', inputFile);
  const channels = parseM3U(inputFile);

  console.log(`Found ${channels.length} channels`);

  const jsonOutput = JSON.stringify(channels, null, 2);

  fs.writeFileSync(outputFile1, jsonOutput, 'utf-8');
  console.log('Written to:', outputFile1);

  fs.writeFileSync(outputFile2, jsonOutput, 'utf-8');
  console.log('Written to:', outputFile2);

  console.log('\nSample channels:');
  channels.slice(0, 3).forEach(channel => {
    console.log(`- ${channel.name} (${channel.quality}) [${channel.tvgId}]`);
  });
}

main();
