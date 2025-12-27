const fs = require('fs')
const path = require('path')

// Function to parse full.txt and extract tvg-id to tvg-logo mappings
function parseLogoMappings(fullTxtPath) {
  const logoMap = new Map()
  try {
    const content = fs.readFileSync(fullTxtPath, 'utf-8')
    const lines = content.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (line.startsWith('#EXTINF:-1')) {
        // Extract tvg-id and tvg-logo
        const tvgIdMatch = line.match(/tvg-id="([^"]*)"/)
        const tvgLogoMatch = line.match(/tvg-logo="([^"]*)"/)
        if (tvgIdMatch && tvgLogoMatch) {
          const tvgId = tvgIdMatch[1]
          const tvgLogo = tvgLogoMatch[1]
          if (tvgLogo && tvgLogo.trim() !== '') {
            logoMap.set(tvgId, tvgLogo)
          }
        }
      }
    }
    console.log(`Parsed ${logoMap.size} logo mappings from ${fullTxtPath}`)
  } catch (error) {
    console.error(`Error parsing ${fullTxtPath}:`, error.message)
  }
  return logoMap
}

// Function to process JSON files in tv/ directory
function processJsonFiles(tvDir, logoMap) {
  try {
    const files = fs.readdirSync(tvDir)
    const jsonFiles = files.filter(
      (file) => file.endsWith('.json') && file !== '_meta.json',
    )
    console.log(`Found ${jsonFiles.length} JSON files to process`)

    jsonFiles.forEach((file) => {
      const filePath = path.join(tvDir, file)
      try {
        const content = fs.readFileSync(filePath, 'utf-8')
        let data = JSON.parse(content)

        // Assuming data is an object with tvgId
        if (data.tvgId && logoMap.has(data.tvgId)) {
          data.logo = logoMap.get(data.tvgId)
          console.log(`Added logo to ${file} for tvgId: ${data.tvgId}`)
        }

        // Write back with 2-space indentation
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
      } catch (error) {
        console.error(`Error processing ${file}:`, error.message)
      }
    })
  } catch (error) {
    console.error(`Error reading tv directory:`, error.message)
  }
}

// Main function
function main() {
  const fullTxtPath = path.join(__dirname, '..', 'data', 'full.txt')
  const tvDir = path.join(__dirname, '..', 'tv')

  console.log('Starting logo extraction and assignment...')

  const logoMap = parseLogoMappings(fullTxtPath)
  processJsonFiles(tvDir, logoMap)

  console.log('Completed.')
}

if (require.main === module) {
  main()
}
