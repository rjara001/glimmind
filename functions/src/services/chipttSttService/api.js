const { CHIPTT_STT_CALL_TIMEOUT_MS, GOOGLE_STT_RECOGNIZE_URL, GOOGLE_STT_URL } = require("../../utils/constants");
const { sendAuthenticatedRequest } = require("../../utils/googleApiClient");

async function sendAudioToChirpRecognizer(audioContent, languageCode) {
  const data = await sendAuthenticatedRequest(
    GOOGLE_STT_RECOGNIZE_URL,
    {
      config: {
        auto_decoding_config: {},
        language_codes: [languageCode || "es-US"],
        model: "chirp_3",
      },
      content: audioContent,
    },
    CHIPTT_STT_CALL_TIMEOUT_MS,
    (data) => {
      const transcript = data.results?.[0]?.alternatives?.[0]?.transcript;
      if (!transcript) {
        console.error('[Chiptt] Google STT Recognize no transcript', {
          resultsCount: data.results?.length || 0,
          alternativesCount: data.results?.[0]?.alternatives?.length || 0,
        });
        const error = new Error("No speech detected.");
        error.code = "NO_SPEECH";
        return error;
      }
      return null;
    }
  );

  const transcript = data.results?.[0]?.alternatives?.[0]?.transcript;

  console.error('[Chiptt] Google STT Recognize success', {
    transcriptLength: transcript.length,
    transcriptPreview: transcript.slice(0, 100),
    billedDuration: data.metadata?.totalBilledDuration,
    requestId: data.metadata?.requestId,
  });

  return { transcript, metadata: data.metadata };
}

async function sendAudioToGoogleSpeechRecognition(audioContent, encoding, sampleRateHertz, languageCode) {
  const data = await sendAuthenticatedRequest(
    GOOGLE_STT_URL,
    {
      config: {
        encoding: encoding || "WEBM_OPUS",
        sampleRateHertz: sampleRateHertz || 48000,
        languageCode: languageCode || "es",
        alternativeLanguageCodes: ["en"],
        maxAlternatives: 1,
      },
      audio: {
        content: audioContent,
      },
    },
    CHIPTT_STT_CALL_TIMEOUT_MS,
    (data) => {
      const transcript = data.results?.[0]?.alternatives?.[0]?.transcript;
      if (!transcript) {
        console.error('[Chiptt] Google STT no transcript', {
          resultsCount: data.results?.length || 0,
          alternativesCount: data.results?.[0]?.alternatives?.length || 0,
        });
        const error = new Error("No speech detected.");
        error.code = "NO_SPEECH";
        return error;
      }
      return null;
    }
  );

  const transcript = data.results?.[0]?.alternatives?.[0]?.transcript;

  console.error('[Chiptt] Google STT success', {
    transcriptLength: transcript.length,
    transcriptPreview: transcript.slice(0, 100),
  });

  return transcript;
}

module.exports = {
  sendAudioToChirpRecognizer,
  sendAudioToGoogleSpeechRecognition,
};
