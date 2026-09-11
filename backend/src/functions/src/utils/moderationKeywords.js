const BANNED_KEYWORDS = {
  POLITICS: ['politica', 'gobierno', 'dictador', 'presidente', 'eleccion', 'partido politico'],
  ADULT:    ['explicito', 'sexual', 'desnudo', '+18', 'pornografia', 'erotico'],
  VIOLENCE: ['violencia', 'sangre', 'muerte', 'asesinato', 'tortura', 'arma'],
  HATE:     ['discriminacion', 'racismo', 'homofobia', 'xenofobia', 'supremacia'],
};

function scanForBannedKeywords(text) {
  if (typeof text !== 'string' || text.length === 0) return [];
  const lower = text.toLowerCase();
  const matched = [];
  for (const [category, words] of Object.entries(BANNED_KEYWORDS)) {
    for (const word of words) {
      if (word && lower.includes(word)) matched.push({ category, word });
    }
  }
  return matched;
}

module.exports = { BANNED_KEYWORDS, scanForBannedKeywords };
