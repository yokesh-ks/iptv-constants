const fs = require('fs')
const path = require('path')

const tvDir = path.join(__dirname, '..', 'tv')
const languageDir = path.join(tvDir, 'language')

// Get all .json files in tv/
const files = fs
  .readdirSync(tvDir)
  .filter((file) => file.endsWith('.json') && file !== '_meta.json')

// Group channels by language
const languageGroups = {}

files.forEach((file) => {
  const filePath = path.join(tvDir, file)
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    if (data.language) {
      const lang = data.language.toLowerCase()
      if (!languageGroups[lang]) {
        languageGroups[lang] = []
      }
      languageGroups[lang].push(data)
    }
  } catch (error) {
    console.error(`Error reading ${file}:`, error.message)
  }
})

// Create language directory if not exists
if (!fs.existsSync(languageDir)) {
  fs.mkdirSync(languageDir, { recursive: true })
}

// Filter to only active channels
Object.keys(languageGroups).forEach((lang) => {
  languageGroups[lang] = languageGroups[lang].filter(
    (channel) => channel.isActive === true,
  )
})

// Clean channels by removing specified fields
Object.keys(languageGroups).forEach((lang) => {
  languageGroups[lang] = languageGroups[lang].map((channel) => {
    const {
      streamUrl,
      language,
      isActive,
      tvgId,
      categoryId,
      quality,
      ...rest
    } = channel
    return rest
  })
})

// Write each language file
const summary = {}
Object.keys(languageGroups).forEach((lang) => {
  const filePath = path.join(languageDir, `${lang}.json`)
  fs.writeFileSync(filePath, JSON.stringify(languageGroups[lang], null, 2))
  summary[lang] = languageGroups[lang].length
})

// Output summary
console.log('Summary of created files:')
Object.keys(summary)
  .sort()
  .forEach((lang) => {
    console.log(`${lang}: ${summary[lang]} channels`)
  })
console.log(`Total languages: ${Object.keys(summary).length}`)
