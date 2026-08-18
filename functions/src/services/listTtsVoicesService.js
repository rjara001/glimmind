const chirpVoicesService = require("./chirpVoicesService");

async function handleListTtsVoices(req, res) {
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.set('Access-Control-Max-Age', '3600');
    res.status(204).send('');
    return;
  }

  res.set('Access-Control-Allow-Origin', '*');

  try {
    const voices = await chirpVoicesService.getChirpVoices();
    console.log(`[listTtsVoices] returning ${voices.length} voices`);
    res.json({ voices });
  } catch (error) {
    console.error("[listTtsVoices] failed:", error.message);
    res.status(502).json({
      error: "Error al obtener las voces de TTS.",
      reason: error.message,
      code: error.code || null,
    });
  }
}

module.exports = { handleListTtsVoices };
