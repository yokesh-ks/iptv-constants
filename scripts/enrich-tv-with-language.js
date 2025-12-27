#!/usr/bin/env node

/**
 * TV Channel Language Enrichment Script
 *
 * This script enriches TV channel JSON files with language information using
 * the websearch-language-detection helper module.
 *
 * Workflow:
 * 1. Loads TV channels from data/in.json
 * 2. Processes channels in batches with concurrent workers
 * 3. Detects language using helper module (web crawling, text analysis, pattern matching)
 * 4. Updates both data/in.json and individual channel files in tv/
 * 5. Caches results to avoid repeated requests
 * 6. Provides detailed progress logging and statistics
 *
 * Detection Strategy Priority:
 * - Cache → Web (metadata) → Web (franc) → Pattern matching
 *
 * @author Senior Backend Automation Engineer
 * @requires ../helpers/websearch-language-detection - Language detection module
 * @requires ../logger - Pino logger for structured logging
 */

const fs = require('fs');
const path = require('path');
const logger = require('../logger'); // Import the pino logger
const {
  CONFIG: WEB_CONFIG,
  ISO_TO_LANGUAGE,
  detectLanguage,
  sleep
} = require('../helpers/websearch-language-detection');

// Configuration
const CONFIG = {
  rateLimitDelay: 200,               // 200ms between batches
  cacheFile: '.language-cache.json', // Cache file path
  maxConcurrent: 15,                 // Max concurrent requests
  cacheSaveInterval: 20,             // Save cache every N operations
  ...WEB_CONFIG                       // Inherit web-related config from helper
};

// Cache management
class LanguageCache {
  constructor(cacheFile) {
    this.cacheFile = cacheFile;
    this.cache = this.load();
    this.pendingWrites = 0;
    this.dirty = false;
  }

  load() {
    try {
      if (fs.existsSync(this.cacheFile)) {
        return JSON.parse(fs.readFileSync(this.cacheFile, 'utf-8'));
      }
    } catch (error) {
      logger.warn({ error: error.message }, 'Failed to load cache');
    }
    return {};
  }

  save() {
    try {
      fs.writeFileSync(this.cacheFile, JSON.stringify(this.cache, null, 2));
      this.dirty = false;
    } catch (error) {
      logger.error({ error: error.message }, 'Failed to save cache');
    }
  }

  get(domain) {
    return this.cache[domain];
  }

  set(domain, language, source) {
    this.cache[domain] = { language, source, timestamp: Date.now() };
    this.dirty = true;
    this.pendingWrites++;

    // Batch saves - only save every N operations
    if (this.pendingWrites >= CONFIG.cacheSaveInterval) {
      this.save();
      this.pendingWrites = 0;
    }
  }

  has(domain) {
    return domain in this.cache;
  }

  // Force save (call at end of script)
  flush() {
    if (this.dirty) {
      this.save();
      this.pendingWrites = 0;
    }
  }
}


/**
 * Enrich a single channel (both in-memory and individual file)
 */
async function enrichChannel(channel, tvDir, cache, stats, progressInfo) {
  try {
    // Skip if language already exists (except "unknown")
    if (channel.language && channel.language !== 'unknown') {
      stats.skipped++;
      return;
    }

    // Detect language
    const startTime = Date.now();
    const { language, source } = await detectLanguage(channel, cache);
    const duration = Date.now() - startTime;

    // Add language field to in-memory channel
    channel.language = language;

    // Also update the individual file in tv/ directory
    const channelFilePath = path.join(tvDir, `${channel.id}.json`);
    if (fs.existsSync(channelFilePath)) {
      try {
        const fileChannel = JSON.parse(fs.readFileSync(channelFilePath, 'utf-8'));
        fileChannel.language = language;
        fs.writeFileSync(channelFilePath, JSON.stringify(fileChannel, null, 2) + '\n', 'utf-8');
      } catch (error) {
        logger.debug({ channelId: channel.id, error: error.message }, 'Error updating individual file');
      }
    }

    stats.enriched++;
    stats.sources[source] = (stats.sources[source] || 0) + 1;
    stats.languages[language] = (stats.languages[language] || 0) + 1;
    stats.totalProcessingTime += duration;

    // Log progress with better visibility
    const progress = stats.enriched + stats.skipped;
    const percentage = ((progress / progressInfo.total) * 100).toFixed(1);
    const avgTime = stats.enriched > 0 ? (stats.totalProcessingTime / stats.enriched) : 0;
    const remaining = progressInfo.total - progress;
    const estimatedTimeRemaining = avgTime > 0 ? (remaining * avgTime / 1000 / 60).toFixed(1) : '?';

    const langName = ISO_TO_LANGUAGE[language] || language;
    logger.info({
      channelName: channel.name,
      language: langName,
      source,
      progress: `${progress}/${progressInfo.total}`,
      percentage: `${percentage}%`,
      avgTime: `${avgTime.toFixed(0)}ms`,
      eta: `${estimatedTimeRemaining}min`,
      duration: `${duration}ms`
    }, `[${percentage}%] Enriched`);

  } catch (error) {
    logger.error({ channelId: channel.id, error: error.message }, 'Error processing channel');
    stats.errors++;
  }
}

/**
 * Process channels in batches to control concurrency
 */
async function processBatch(channels, tvDir, cache, stats, batchSize = CONFIG.maxConcurrent) {
  const progressInfo = { total: channels.length };
  const startTime = Date.now();

  for (let i = 0; i < channels.length; i += batchSize) {
    const batch = channels.slice(i, i + batchSize);

    await Promise.all(
      batch.map(channel => enrichChannel(channel, tvDir, cache, stats, progressInfo))
    );

    // Periodic cache flush
    if ((i + batchSize) % 100 === 0) {
      cache.flush();
    }

    // Rate limiting between batches
    if (i + batchSize < channels.length) {
      await sleep(CONFIG.rateLimitDelay);

      // Log batch completion every 50 files
      if ((i + batchSize) % 50 === 0) {
        const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
        const processed = stats.enriched + stats.skipped;
        const rate = (processed / ((Date.now() - startTime) / 1000)).toFixed(1);
        logger.info({
          processed,
          total: channels.length,
          elapsed: `${elapsed}min`,
          rate: `${rate} files/sec`
        }, 'Batch progress');
      }
    }
  }
}

/**
 * Main execution
 */
async function main() {
  const overallStartTime = Date.now();
  const tvDir = path.join(__dirname, '..', 'tv');
  const dataFilePath = path.join(__dirname, '..', 'data', 'in.json');
  const cache = new LanguageCache(path.join(__dirname, '..', CONFIG.cacheFile));

  logger.info('🚀 Starting TV Channel Language Enrichment');
  logger.info({
    config: {
      timeout: CONFIG.timeout,
      maxRetries: CONFIG.maxRetries,
      rateLimitDelay: CONFIG.rateLimitDelay,
      maxConcurrent: CONFIG.maxConcurrent,
      cacheSaveInterval: CONFIG.cacheSaveInterval,
      cacheFile: CONFIG.cacheFile
    }
  }, 'Configuration loaded');

  // Read data/in.json
  if (!fs.existsSync(dataFilePath)) {
    logger.error({ dataFilePath }, 'data/in.json file not found');
    process.exit(1);
  }

  logger.info('📋 Loading data/in.json...');
  const dataContent = fs.readFileSync(dataFilePath, 'utf-8');
  const channels = JSON.parse(dataContent);

  logger.info({
    totalChannels: channels.length,
    cacheSize: Object.keys(cache.cache).length
  }, 'Channels loaded');

  const stats = {
    enriched: 0,
    skipped: 0,
    errors: 0,
    sources: {},
    languages: {},
    totalProcessingTime: 0
  };

  logger.info(`⚡ Processing ${channels.length} channels in order with ${CONFIG.maxConcurrent} concurrent workers...`);

  // Process channels in batches (in exact order from data/in.json)
  await processBatch(channels, tvDir, cache, stats);

  // Final cache flush
  cache.flush();

  // Write enriched data back to data/in.json
  logger.info('💾 Saving enriched data to data/in.json...');
  fs.writeFileSync(dataFilePath, JSON.stringify(channels, null, 2) + '\n', 'utf-8');

  const totalDuration = ((Date.now() - overallStartTime) / 1000 / 60).toFixed(2);
  const avgTimePerFile = stats.enriched > 0 ? (stats.totalProcessingTime / stats.enriched).toFixed(0) : 0;

  // Print summary
  logger.info('✅ Enrichment complete');
  logger.info({
    summary: {
      enriched: stats.enriched,
      skipped: stats.skipped,
      errors: stats.errors,
      total: channels.length,
      duration: `${totalDuration} minutes`,
      avgTimePerChannel: `${avgTimePerFile}ms`
    },
    sources: stats.sources,
    languages: stats.languages
  }, 'Enrichment summary');

  logger.info({
    cacheFile: CONFIG.cacheFile,
    cacheEntries: Object.keys(cache.cache).length
  }, '💾 Cache saved');

  logger.info({ totalDuration: `${totalDuration} minutes` }, '🎉 All enrichment tasks complete');
}

// Execute
main().catch(error => {
  logger.error({ error: error.message, stack: error.stack }, 'Fatal error occurred');
  process.exit(1);
});