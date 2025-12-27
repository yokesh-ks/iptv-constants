# IPTV Conversion Scripts

This directory contains scripts to convert M3U playlist files to JSON format, split them into individual channel files, and enrich them with metadata.

## Available Scripts

1. **[m3u-to-json.js](m3u-to-json.js)** - Converts M3U playlist to consolidated JSON
2. **[json-to-individual.js](json-to-individual.js)** - Splits consolidated JSON into individual channel files
3. **[enrich-tv-with-language.js](enrich-tv-with-language.js)** - Adds language field to TV channel files

## Usage

### Script 1: M3U to JSON Conversion

Convert M3U playlist to consolidated JSON format.

**Using npm scripts (recommended):**

```bash
npm run convert
# or
npm run m3u-to-json
```

**Using Node.js directly:**

```bash
node scripts/m3u-to-json.js
```

### Script 2: Split into Individual Files

Split consolidated JSON into individual channel files in the `tv/` directory.

**Using npm scripts (recommended):**

```bash
npm run split
# or
npm run json-to-individual
```

**Using Node.js directly:**

```bash
node scripts/json-to-individual.js
```

### Script 3: Enrich with Language Field

Add language field to all TV channel JSON files based on auto-detection.

**Using npm scripts (recommended):**

```bash
npm run enrich
# or
npm run enrich-tv-with-language
```

**Using Node.js directly:**

```bash
node scripts/enrich-tv-with-language.js
```

## Input/Output

### Script 1: m3u-to-json.js

- **Input**: `data/iptv/streams/in.m3u`
- **Output**:
  - `in.json` (root directory)
  - `data/in.json`

### Script 2: json-to-individual.js

- **Input**: `data/in.json`
- **Output**: Individual JSON files in `tv/` directory (e.g., `tv/raj-tv.json`)

### Script 3: enrich-tv-with-language.js

- **Input**: All JSON files in `tv/` directory
- **Output**: Updates same files with added `language` field

## JSON Output Formats

### Consolidated Format (m3u-to-json.js output)

Each channel in the consolidated JSON array has the following structure:

```json
{
  "id": "channel-slug",
  "name": "Channel Name",
  "tvgId": "ChannelID.in@SD",
  "quality": "1080p",
  "streamUrl": "https://example.com/stream.m3u8",
  "attributes": {
    "tvg-id": "ChannelID.in@SD"
  }
}
```

### Fields

- `id`: Auto-generated slug from channel name
- `name`: Channel name (extracted from M3U, without quality/metadata)
- `tvgId`: TV guide ID from the `tvg-id` attribute
- `quality`: Video quality (e.g., "720p", "1080p") if specified
- `streamUrl`: The actual stream URL
- `attributes`: All original M3U attributes preserved
- `vlc-opts`: VLC options if present (stored in attributes)

### Individual File Format (json-to-individual.js output)

Each individual channel file has this structure:

```json
{
  "id": "raj-tv",
  "name": "Raj TV",
  "categoryId": "entertainment",
  "streamUrl": "https://example.com/stream.m3u8",
  "tvgId": "RajTV.in@SD",
  "isActive": true,
  "language": "tamil"
}
```

#### Fields

- `id`: Channel slug/identifier
- `name`: Channel display name
- `categoryId`: Auto-detected category (see categories below)
- `streamUrl`: Stream URL
- `tvgId`: TV guide ID
- `isActive`: Always set to `true`
- `language`: Channel language (added by enrich script, see supported languages below)

#### Auto-detected Categories

The script automatically categorizes channels based on name patterns:

- `news` - News channels (Aaj Tak, ABP, NDTV, etc.)
- `entertainment` - General entertainment (TV, Zee, Star, Sony, Colors, etc.)
- `music` - Music channels (MTV, 9XM, Jalwa, etc.)
- `movies` - Movie channels (Flix, Pictures, Cinema, etc.)
- `devotional` - Religious content (Aastha, Sanskar, etc.)
- `sports` - Sports channels (Cricket, Football, ESPN, etc.)
- `kids` - Children's content (Cartoon, Nick, Disney, etc.)
- `documentary` - Documentary channels (Discovery, Nat Geo, etc.)
- `lifestyle` - Lifestyle channels (Food, Travel, Fashion, etc.)
- `general` - Default category for unmatched channels

#### Auto-detected Languages

The enrich script automatically detects channel language based on name patterns:

- `tamil` - Tamil channels (Sun TV, Raj TV, Vijay, Kalaignar, etc.)
- `telugu` - Telugu channels (Gemini, ETV, Maa, 10TV, etc.)
- `hindi` - Hindi channels (Zee, Star Plus, Sony, Colors, Aaj Tak, etc.)
- `kannada` - Kannada channels (Udaya, Suvarna, Zee Kannada, etc.)
- `malayalam` - Malayalam channels (Asianet, Mazhavil, Surya, etc.)
- `english` - English channels (Discovery, BBC, CNN, Sony Pix, etc.)
- `bengali` - Bengali channels (Star Jalsha, Zee Bangla, Colors Bangla, etc.)
- `marathi` - Marathi channels (Zee Marathi, Star Pravah, etc.)
- `punjabi` - Punjabi channels (PTC, MH1, Zee Punjabi, etc.)
- `gujarati` - Gujarati channels (Sandesh, TV9 Gujarati, etc.)
- `bhojpuri` - Bhojpuri channels (B4U Bhojpuri, etc.)
- `urdu` - Urdu channels (Zee Salaam, etc.)
- `assamese` - Assamese channels (Pratidin, etc.)
- `odia` - Odia/Oriya channels (Alankar, MBC, etc.)
- `unknown` - Channels that couldn't be auto-detected

## Features

- Parses standard M3U format with `#EXTINF` directives
- Extracts channel metadata (tvg-id, quality, etc.)
- Handles VLC options (`#EXTVLCOPT`)
- Auto-generates readable channel IDs
- Preserves all original attributes
- Creates two output files for convenience

## Example

Converting `in.m3u` with content:

```m3u
#EXTM3U
#EXTINF:-1 tvg-id="SunTV.in@HD",Sun TV (1080p)
https://example.com/suntv/stream.m3u8
```

Produces:

```json
[
  {
    "id": "sun-tv",
    "name": "Sun TV",
    "tvgId": "SunTV.in@HD",
    "quality": "1080p",
    "streamUrl": "https://example.com/suntv/stream.m3u8",
    "attributes": {
      "tvg-id": "SunTV.in@HD"
    }
  }
]
```
