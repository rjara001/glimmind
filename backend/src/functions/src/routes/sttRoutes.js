const { onRequest } = require("firebase-functions/v2/https");
const { getDb, getAuth } = require("../utils/firebase");
const { CHIPTT_STT_MAX_SINGLE_DURATION } = require("../utils/constants");
const sttService = require("../services/sttService");

// ~4 KB/s heuristic for 16 kHz 16-bit mono audio. The metered seconds must be
// derived from the payload the client actually sent; audioDuration is a
// client-supplied hint and is never trusted for billing or the ceiling (U-08).
function deriveMeteredAudioSeconds(audioContent) {
  const rawBytes = Buffer.from(audioContent, 'base64').length;
  return Math.max(1, Math.ceil(rawBytes / 4000));
}

exports.deriveMeteredAudioSeconds = deriveMeteredAudioSeconds;

exports.transcribeSpeech = onRequest(
  { cors: true, timeoutSeconds: 60, memory: "256MiB" },
  async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { audioContent, encoding, sampleRateHertz, languageCode, audioDuration } = req.body || {};
    if (!audioContent || typeof audioContent !== 'string') {
      return res.status(400).json({ error: 'Se requiere audioContent para transcribir.' });
    }

    let uid;
    try {
      const token = await getAuth().verifyIdToken(authHeader.slice(7));
      uid = token.uid;
    } catch (error) {
      console.error('[transcribeSpeech] token verification failed:', error.message);
      return res.status(401).json({ error: 'Unauthorized', reason: error.message });
    }

    const audioSeconds = deriveMeteredAudioSeconds(audioContent);
    if (audioSeconds > CHIPTT_STT_MAX_SINGLE_DURATION) {
      return res.status(400).json({ error: `Recording cannot exceed ${CHIPTT_STT_MAX_SINGLE_DURATION} seconds.` });
    }

    console.error('[transcribeSpeech] request', { uid, declaredAudioDuration: audioDuration, audioSeconds });

    let transcript;
    try {
      transcript = await sttService.transcribeWithQuota(getDb(), uid, audioSeconds, () =>
        sttService.sendAudioToGoogleSpeechRecognition(audioContent, encoding, sampleRateHertz, languageCode)
      );
    } catch (error) {
      console.error('[transcribeSpeech] failed', { uid, audioDuration, audioSeconds, code: error.code, message: error.message });
      if (error.code === 'TIER_REQUIRED') {
        return res.status(403).json({ error: error.message, code: error.code });
      }
      if (error.code === 'GLOBAL_QUOTA_EXCEEDED' || error.code === 'USER_QUOTA_EXCEEDED') {
        return res.status(429).json({ error: error.message, code: error.code });
      }
      if (error.code === 'RATE_LIMITED') {
        return res.status(503).json({ error: 'El servicio de STT está temporalmente saturado. Intenta en unos minutos.' });
      }
      if (error.code === 'NO_SPEECH') {
        return res.status(200).json({ noSpeech: true, message: 'No speech detected in the live recording.' });
      }
      return res.status(502).json({ error: 'Error al transcribir la voz.', detail: error.message });
    }

    res.json({ transcript });
  }
);

exports.transcribeExistingAudio = onRequest(
  { cors: true, timeoutSeconds: 60, memory: "256MiB" },
  async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { audioContent, languageCode, audioDuration } = req.body || {};
    if (!audioContent || typeof audioContent !== 'string') {
      return res.status(400).json({ error: 'Se requiere audioContent para transcribir.' });
    }

    let uid;
    try {
      const token = await getAuth().verifyIdToken(authHeader.slice(7));
      uid = token.uid;
    } catch (error) {
      console.error('[transcribeExistingAudio] token verification failed:', error.message);
      return res.status(401).json({ error: 'Unauthorized', reason: error.message });
    }

    const audioSeconds = Math.max(1, Math.ceil(audioDuration || (Buffer.from(audioContent, 'base64').length / 4000)));

    console.error('[transcribeExistingAudio] request', { uid, audioDuration: audioSeconds });

    let result;
    try {
      result = await sttService.transcribeWithQuota(getDb(), uid, audioSeconds, () =>
        sttService.sendAudioToGoogleSpeechRecognitionRecognize(audioContent, languageCode)
      );
    } catch (error) {
      console.error('[transcribeExistingAudio] failed', { uid, audioSeconds, code: error.code, message: error.message });
      if (error.code === 'TIER_REQUIRED') {
        return res.status(403).json({ error: error.message, code: error.code });
      }
      if (error.code === 'GLOBAL_QUOTA_EXCEEDED' || error.code === 'USER_QUOTA_EXCEEDED') {
        return res.status(429).json({ error: error.message, code: error.code });
      }
      if (error.code === 'RATE_LIMITED') {
        return res.status(503).json({ error: 'El servicio de STT está temporalmente saturado. Intenta en unos minutos.' });
      }
      if (error.code === 'NO_SPEECH') {
        return res.status(200).json({ noSpeech: true, message: 'No speech detected in the stored audio.' });
      }
      return res.status(502).json({ error: 'Error al transcribir la voz.', detail: error.message });
    }

    res.json({ transcript: result.transcript, metadata: result.metadata });
  }
);

const CHIRP3_LANGUAGE_FALLBACKS = {
  es: 'es-ES',
  en: 'en-US',
  fr: 'fr-FR',
  de: 'de-DE',
  it: 'it-IT',
  pt: 'pt-BR',
};

function normalizeChirp3LanguageCode(languageCode) {
  if (!languageCode) return 'es-ES';
  const trimmed = languageCode.trim();
  if (CHIRP3_LANGUAGE_FALLBACKS[trimmed]) {
    return CHIRP3_LANGUAGE_FALLBACKS[trimmed];
  }
  return trimmed;
}

exports.transcribeChirp3 = onRequest(
  { cors: true, timeoutSeconds: 60, memory: "256MiB" },
  async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { audioContent, languageCode, audioDuration } = req.body || {};
    if (!audioContent || typeof audioContent !== 'string') {
      return res.status(400).json({ error: 'Se requiere audioContent para transcribir.' });
    }

    let uid;
    try {
      const token = await getAuth().verifyIdToken(authHeader.slice(7));
      uid = token.uid;
    } catch (error) {
      console.error('[transcribeChirp3] token verification failed:', error.message);
      return res.status(401).json({ error: 'Unauthorized', reason: error.message });
    }

    const audioSeconds = deriveMeteredAudioSeconds(audioContent);
    if (audioSeconds > CHIPTT_STT_MAX_SINGLE_DURATION) {
      return res.status(400).json({ error: `Recording cannot exceed ${CHIPTT_STT_MAX_SINGLE_DURATION} seconds.` });
    }

    console.error('[transcribeChirp3] request', { uid, declaredAudioDuration: audioDuration, audioSeconds, rawLanguageCode: languageCode });

    let result;
    try {
      const normalizedLanguageCode = normalizeChirp3LanguageCode(languageCode);
      result = await sttService.transcribeWithQuota(getDb(), uid, audioSeconds, () =>
        sttService.sendAudioToChirpRecognizer(audioContent, normalizedLanguageCode)
      );
    } catch (error) {
      console.error('[transcribeChirp3] failed', { uid, audioDuration, audioSeconds, code: error.code, message: error.message });
      if (error.code === 'TIER_REQUIRED') {
        return res.status(403).json({ error: error.message, code: error.code });
      }
      if (error.code === 'GLOBAL_QUOTA_EXCEEDED' || error.code === 'USER_QUOTA_EXCEEDED') {
        return res.status(429).json({ error: error.message, code: error.code });
      }
      if (error.code === 'RATE_LIMITED') {
        return res.status(503).json({ error: 'El servicio de STT está temporalmente saturado. Intenta en unos minutos.' });
      }
      if (error.code === 'NO_SPEECH') {
        return res.status(200).json({ noSpeech: true, message: 'No speech detected in the live recording.' });
      }
      return res.status(502).json({ error: 'Error al transcribir la voz.', detail: error.message });
    }

    res.json({ transcript: result.transcript, metadata: result.metadata });
  }
);
