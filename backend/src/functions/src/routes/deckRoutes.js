const { onRequest } = require("firebase-functions/v2/https");
const { getDb } = require("../utils/firebase");
const deckService = require("../services/prebuiltDeckService");

exports.getPrebuiltDecks = onRequest({ cors: true }, async (req, res) => {
  console.log('[deckRoutes] getPrebuiltDecks called');
  try {
    const db = getDb();
    console.log('[deckRoutes] got db');
    const decks = await deckService.fetchAllActiveDecks(db);
    console.log('[deckRoutes] decks found:', decks.length);
    res.json(decks);
  } catch (error) {
    console.error('[deckRoutes] error:', error.message, error.stack);
    res.status(500).json({ error: error.message });
  }
});
