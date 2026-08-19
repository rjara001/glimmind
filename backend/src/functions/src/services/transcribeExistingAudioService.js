const { getDb, getAuth } = require("../utils/firebase");
const { CHIPTT_STT_MAX_SINGLE_DURATION } = require("../utils/constants");
const sttService = require("./sttService");

async function handleTranscribeExistingAudio(req, res) {
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
    result = await sttService.sendAudioToChirpRecognizer(audioContent, languageCode);
  } catch (error) {
    console.error('[transcribeExistingAudio] STT failed', { uid, audioSeconds, code: error.code, message: error.message });
    if (error.code === 'RATE_LIMITED') {
      return res.status(503).json({ error: 'El servicio de STT está temporalmente saturado. Intenta en unos minutos.' });
    }
    if (error.code === 'NO_SPEECH') {
      return res.status(200).json({ noSpeech: true, message: 'No speech detected in stored audio (service handler).' });
    }
    return res.status(502).json({ error: 'Error al transcribir la voz.', detail: error.message });
  }

  try {
    await sttService.verifyUserHasRemainingSttQuota(getDb(), uid, audioSeconds);
  } catch (error) {
    console.error('[transcribeExistingAudio] quota failed after success', { uid, audioSeconds, code: error.code, message: error.message });
    if (error.code === 'GLOBAL_QUOTA_EXCEEDED' || error.code === 'USER_QUOTA_EXCEEDED') {
      return res.status(429).json({ error: error.message, code: error.code });
    }
    return res.status(502).json({ error: 'Error al registrar la transcripción.', detail: error.message });
  }

  res.json({ transcript: result.transcript, metadata: result.metadata });
}

module.exports = { handleTranscribeExistingAudio };
