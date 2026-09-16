const { onRequest } = require("firebase-functions/v2/https");
const { getDb, getAuth } = require("../utils/firebase");
const chirpTtsService = require("../services/chirpTtsService");
const chirpVoicesService = require("../services/chirpVoicesService");
const { SynthesizeSpeechSchema } = require("../utils/validation");
const { rateLimit } = require("../utils/rateLimit");

function applyRateLimit(fnName, handler) {
  const limiter = rateLimit(fnName);
  return async (req, res) => {
    await new Promise((resolve, reject) => {
      limiter(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    return handler(req, res);
  };
}

async function runValidation(req, res, schema) {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const errors = result.error.flatten();
    res.status(400).json({
      error: "Invalid request body",
      details: errors.fieldErrors,
    });
    return null;
  }
  req.validatedBody = result.data;
  return req.validatedBody;
}

exports.synthesizeSpeech = onRequest(
  { cors: true, timeoutSeconds: 60, memory: "256MiB" },
  applyRateLimit("synthesizeSpeech", async (req, res) => {
    const body = await runValidation(req, res, SynthesizeSpeechSchema);
    if (!body) return;

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { text, voiceId, rate, pitch, languageCode, speakingRate, volumeGainDb } = body;

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
      const audioContent = await chirpTtsService.sendTextToChirpSynthesizer(text, voiceId, rate || speakingRate, pitch);
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
  })
);

exports.listTtsVoices = onRequest(
  { cors: true, timeoutSeconds: 30, memory: "256MiB" },
  applyRateLimit("default", async (req, res) => {
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
      const voices = await chirpVoicesService.getCachedOrFreshChirpVoices();
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
  })
);