#!/usr/bin/env node

/**
 * Reset Language Field Script
 *
 * Resets the language field to "unknown" in:
 * - data/in.json (consolidated file)
 * - All individual TV channel files in tv/
 * - Optionally clears the language cache
 *
 * Usage:
 *   node scripts/reset-language.js
 *   node scripts/reset-language.js --clear-cache
 *
 * @author Senior Backend Automation Engineer
 */

const fs = require('fs')
const path = require('path')

// Configuration
const CONFIG = {
  dataFile: path.join(__dirname, '../data/in.json'),
  tvDir: path.join(__dirname, '../tv'),
  cacheFile: path.join(__dirname, '../.language-cache.json'),
  defaultLanguage: 'unknown',
}

// Parse command line arguments
const args = process.argv.slice(2)
const clearCache = args.includes('--clear-cache')

/**
 * Reset language field in consolidated data file
 */
function resetDataFile() {
  console.log('\n📄 Resetting language in data/in.json...')

  try {
    const data = JSON.parse(fs.readFileSync(CONFIG.dataFile, 'utf-8'))
    let resetCount = 0

    for (const channel of data) {
      if (channel.language && channel.language !== CONFIG.defaultLanguage) {
        channel.language = CONFIG.defaultLanguage
        resetCount++
      }
    }

    fs.writeFileSync(CONFIG.dataFile, JSON.stringify(data, null, 2))
    console.log(`   ✓ Reset ${resetCount} channels in data/in.json`)

    return resetCount
  } catch (error) {
    console.error(`   ✗ Error resetting data/in.json: ${error.message}`)
    return 0
  }
}

/**
 * Reset language field in all individual TV files
 */
function resetTvFiles() {
  console.log('\n📺 Resetting language in tv/*.json files...')

  try {
    const files = fs
      .readdirSync(CONFIG.tvDir)
      .filter((file) => file.endsWith('.json'))

    let resetCount = 0

    for (const file of files) {
      const filePath = path.join(CONFIG.tvDir, file)

      try {
        const channel = JSON.parse(fs.readFileSync(filePath, 'utf-8'))

        if (channel.language && channel.language !== CONFIG.defaultLanguage) {
          channel.language = CONFIG.defaultLanguage
          fs.writeFileSync(filePath, JSON.stringify(channel, null, 2))
          resetCount++
        }
      } catch (error) {
        console.error(`   ✗ Error processing ${file}: ${error.message}`)
      }
    }

    console.log(`   ✓ Reset ${resetCount} of ${files.length} channel files`)

    return resetCount
  } catch (error) {
    console.error(`   ✗ Error reading tv/ directory: ${error.message}`)
    return 0
  }
}

/**
 * Clear the language detection cache
 */
function clearLanguageCache() {
  console.log('\n🗑️  Clearing language cache...')

  try {
    if (fs.existsSync(CONFIG.cacheFile)) {
      fs.unlinkSync(CONFIG.cacheFile)
      console.log('   ✓ Cache file deleted')
    } else {
      console.log('   ℹ No cache file found')
    }
  } catch (error) {
    console.error(`   ✗ Error clearing cache: ${error.message}`)
  }
}

/**
 * Main execution
 */
function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🔄 RESET LANGUAGE FIELD')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  // Reset data file
  const dataReset = resetDataFile()

  // Reset TV files
  const tvReset = resetTvFiles()

  // Clear cache if requested
  if (clearCache) {
    clearLanguageCache()
  } else {
    console.log(
      '\n💡 Tip: Use --clear-cache to also clear the language detection cache',
    )
  }

  // Summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📊 SUMMARY')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`   data/in.json:      ${dataReset} channels reset`)
  console.log(`   tv/*.json:         ${tvReset} files reset`)
  console.log(`   Cache cleared:     ${clearCache ? 'Yes' : 'No'}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('\n✅ Reset complete! You can now run: npm run enrich\n')
}

// Run the script
main()
