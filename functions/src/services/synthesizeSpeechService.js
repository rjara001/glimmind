const { getDb, getAuth } = require("../utils/firebase");
const chirpTtsService = require("./chirpTtsService");

async function handleSynthesizeSpeech(req, res) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { text, voiceId, rate, pitch } = req.body || {};
  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Se requiere texto para sintetizar.' });
  }
  if (!voiceId || typeof voiceId !== 'string') {
    return res.status(400).json({ error: 'Se requiere voiceId para sintetizar.' });
  }

  let uid;
  try {
    const token = await getAuth().verifyIdToken(authHeader.slice(7));
    uid = token.uid;
  } catch (error) {
    console.error('[synthesizeSpeech] token verification failed:', error.message);
    return res.status(401).json({ error: 'Unauthorized', reason: error.message });
  }

  const charCount = text.length;

  try {
    await chirpTtsService.verifyUserHasRemainingTtsQuota(getDb(), uid, charCount);
    const audioContent = await chirpTtsService.sendTextToChirpSynthesizer(text, voiceId, rate, pitch);
    res.json({ audioContent });
  } catch (error) {
    console.error('[synthesizeSpeech] failed:', error.message);
    if (error.code === 'GLOBAL_QUOTA_EXCEEDED' || error.code === 'USER_QUOTA_EXCEEDED') {
      return res.status(429).json({ error: error.message });
    }
    if (error.code === 'RATE_LIMITED') {
      return res.status(503).json({ error: 'El servicio de TTS está temporalmente saturado. Intenta en unos minutos.' });
    }
    return res.status(502).json({ error: 'Error al sintetizar la voz.' });
  }
}

module.exports = { handleSynthesizeSpeech };
