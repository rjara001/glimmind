const { CHIRP_TTS_CALL_TIMEOUT_MS, GOOGLE_TTS_URL } = require("../../utils/constants");
const { sendAuthenticatedRequest } = require("../../utils/googleApiClient");

async function sendTextToChirpSynthesizer(text, voiceId, rate, pitch) {
  const parts = String(voiceId).split("-");
  const languageCode =
    parts.length >= 2 ? `${parts[0]}-${parts[1]}` : parts[0] || "es";

  const audioConfig = {
    audioEncoding: "MP3",
    speakingRate: typeof rate === "number" ? rate : 1,
  };

  const data = await sendAuthenticatedRequest(
    GOOGLE_TTS_URL,
    {
      input: { text: String(text) },
      voice: { languageCode, name: String(voiceId) },
      audioConfig,
    },
    CHIRP_TTS_CALL_TIMEOUT_MS,
    (data) => {
      if (!data.audioContent) {
        const error = new Error("Respuesta vacía de TTS.");
        error.code = "TTS_ERROR";
        return error;
      }
      return null;
    }
  );

  return data.audioContent;
}

module.exports = {
  sendTextToChirpSynthesizer,
};
