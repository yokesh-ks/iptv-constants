const axios = require('axios');
const cheerio = require('cheerio');

(async () => {
  const r = await axios.get('https://www.7SMusic.in');
  const $ = cheerio.load(r.data);

  console.log('Title:', $('title').text());
  console.log('Description:', $('meta[name="description"]').attr('content'));
  console.log('OG Description:', $('meta[property="og:description"]').attr('content'));

  // Test the function
  const { detectLanguageFromDescription } = require('../helpers/websearch-language-detection');
  const desc = $('meta[name="description"]').attr('content') || '';
  const title = $('title').text() || '';
  const combined = desc + ' ' + title;

  console.log('\nCombined text:', combined);
  console.log('Detected from description:', detectLanguageFromDescription(combined));
})();
