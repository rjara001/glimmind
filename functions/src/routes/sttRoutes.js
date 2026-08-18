const { onRequest } = require("firebase-functions/v2/https");
const { getDb, getAuth } = require("../utils/firebase");
const { CHIPTT_STT_MAX_SINGLE_DURATION } = require("../utils/constants");
const chipttSttService = require("../services/chipttSttService");

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

    const audioSeconds = Math.max(1, Math.ceil(audioDuration || (Buffer.from(audioContent, 'base64').length / 4000)));
    if (audioDuration > CHIPTT_STT_MAX_SINGLE_DURATION) {
      return res.status(400).json({ error: `Recording cannot exceed ${CHIPTT_STT_MAX_SINGLE_DURATION} seconds.` });
    }

    console.error('[transcribeSpeech] request', { uid, audioDuration, audioSeconds });

    let transcript;
    try {
      transcript = await chipttSttService.sendAudioToGoogleSpeechRecognition(audioContent, encoding, sampleRateHertz, languageCode);
    } catch (error) {
      console.error('[transcribeSpeech] STT failed', { uid, audioDuration, audioSeconds, code: error.code, message: error.message });
      if (error.code === 'RATE_LIMITED') {
        return res.status(503).json({ error: 'El servicio de STT está temporalmente saturado. Intenta en unos minutos.' });
      }
      if (error.code === 'NO_SPEECH') {
        return res.status(200).json({ noSpeech: true, message: 'No speech detected.' });
      }
      return res.status(502).json({ error: 'Error al transcribir la voz.', detail: error.message });
    }

    try {
      await chipttSttService.verifyUserHasRemainingSttQuota(getDb(), uid, audioSeconds);
    } catch (error) {
      console.error('[transcribeSpeech] quota failed after success', { uid, audioSeconds, code: error.code, message: error.message });
      if (error.code === 'GLOBAL_QUOTA_EXCEEDED' || error.code === 'USER_QUOTA_EXCEEDED') {
        return res.status(429).json({ error: error.message, code: error.code });
      }
      return res.status(502).json({ error: 'Error al registrar la transcripción.', detail: error.message });
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
      result = await chipttSttService.sendAudioToGoogleSpeechRecognitionRecognize(audioContent, languageCode);
    } catch (error) {
      console.error('[transcribeExistingAudio] STT failed', { uid, audioSeconds, code: error.code, message: error.message });
      if (error.code === 'RATE_LIMITED') {
        return res.status(503).json({ error: 'El servicio de STT está temporalmente saturado. Intenta en unos minutos.' });
      }
      if (error.code === 'NO_SPEECH') {
        return res.status(200).json({ noSpeech: true, message: 'No speech detected.' });
      }
      return res.status(502).json({ error: 'Error al transcribir la voz.', detail: error.message });
    }

    try {
      await chipttSttService.verifyUserHasRemainingSttQuota(getDb(), uid, audioSeconds);
    } catch (error) {
      console.error('[transcribeExistingAudio] quota failed after success', { uid, audioSeconds, code: error.code, message: error.message });
      if (error.code === 'GLOBAL_QUOTA_EXCEEDED' || error.code === 'USER_QUOTA_EXCEEDED') {
        return res.status(429).json({ error: error.message, code: error.code });
      }
      return res.status(502).json({ error: 'Error al registrar la transcripción.', detail: error.message });
    }

    res.json({ transcript: result.transcript, metadata: result.metadata });
  }
);
