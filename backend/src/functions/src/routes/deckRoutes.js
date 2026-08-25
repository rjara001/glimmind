const { onRequest } = require("firebase-functions/v2/https");
const { getDb } = require("../utils/firebase");
const deckService = require("../services/prebuiltDeckService");

exports.getPrebuiltDecks = onRequest({ cors: true }, async (req, res) => {
  try {
    const decks = await deckService.fetchAllActiveDecks(getDb());
    res.json(decks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
