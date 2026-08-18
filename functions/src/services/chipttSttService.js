const { getDb } = require("../utils/firebase");
const { CHIPTT_STT_GLOBAL_LIMIT, CHIPTT_STT_USER_LIMIT, CHIPTT_STT_PREMIUM_USER_LIMIT, CHIPTT_STT_CALL_TIMEOUT_MS, GOOGLE_STT_RECOGNIZE_URL, GOOGLE_STT_URL } = require("../utils/constants");
const { sendAuthenticatedRequest } = require("../utils/googleApiClient");

function resolveCurrentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function buildSttQuotaDocumentRefs(db, uid, monthKey) {
  const globalRef = db
    .collection("usage")
    .doc("chipttStt")
    .collection("global")
    .doc(monthKey);

  const userRef = db
    .collection("usage")
    .doc("chipttStt")
    .collection("users")
    .doc(uid)
    .collection("months")
    .doc(monthKey);

  return { globalRef, userRef };
}

async function fetchSttQuotaDocuments(db, uid, monthKey) {
  const { globalRef, userRef } = buildSttQuotaDocumentRefs(db, uid, monthKey);
  const [globalSnap, userSnap] = await Promise.all([
    globalRef.get(),
    userRef.get(),
  ]);

  const globalData = globalSnap.exists
    ? globalSnap.data()
    : { monthKey: monthKey, audioSecondsUsed: 0 };

  const userData = userSnap.exists
    ? userSnap.data()
    : { monthKey: monthKey, audioSecondsUsed: 0 };

  return { globalRef, userRef, globalData, userData };
}

function assertGlobalSttQuotaHasCapacity(globalData, audioSeconds) {
  if (globalData.audioSecondsUsed >= CHIPTT_STT_GLOBAL_LIMIT) {
    console.error('[Chiptt] global quota exceeded', {
      audioSeconds,
      globalUsed: globalData.audioSecondsUsed,
      globalLimit: CHIPTT_STT_GLOBAL_LIMIT,
    });
    const error = new Error(
      "El servicio de transcripción alcanzó su límite mensual global. Intenta el próximo mes."
    );
    error.code = "GLOBAL_QUOTA_EXCEEDED";
    throw error;
  }
}

async function assertUserSttQuotaHasCapacity(db, uid, userData, audioSeconds) {
  const metaRef = db.collection("users").doc(uid).collection("meta").doc("main");
  const metaSnap = await metaRef.get();
  const userTier = metaSnap.exists ? (metaSnap.data().tier || 'free') : 'free';
  const userLimit = userTier === 'premium' ? CHIPTT_STT_PREMIUM_USER_LIMIT : CHIPTT_STT_USER_LIMIT;

  if (userData.audioSecondsUsed >= userLimit) {
    console.error('[Chiptt] user quota exceeded', {
      uid,
      audioSeconds,
      userUsed: userData.audioSecondsUsed,
      userLimit,
      tier: userTier,
    });
    const error = new Error(
      `Llegaste a tu límite mensual de transcripción (${userLimit} segundos). Vuelve el próximo mes.`
    );
    error.code = "USER_QUOTA_EXCEEDED";
    throw error;
  }
}

function logSttQuotaCheckPassed(uid, audioSeconds, globalData, userData) {
  console.error('[Chiptt] quota check passed', {
    uid,
    audioSeconds,
    globalUsed: globalData.audioSecondsUsed,
    userUsed: userData.audioSecondsUsed,
  });
}

async function persistSttQuotaUsage(db, globalRef, userRef, globalData, userData, audioSeconds, monthKey) {
  const batch = db.batch();

  batch.set(
    globalRef,
    {
      monthKey: monthKey,
      audioSecondsUsed: globalData.audioSecondsUsed + audioSeconds,
    },
    { merge: true }
  );

  batch.set(
    userRef,
    {
      monthKey: monthKey,
      audioSecondsUsed: userData.audioSecondsUsed + audioSeconds,
    },
    { merge: true }
  );

  await batch.commit();
}

async function verifyUserHasRemainingSttQuota(db, uid, audioSeconds) {
  const monthKey = resolveCurrentMonthKey();
  const { globalRef, userRef, globalData, userData } = await fetchSttQuotaDocuments(db, uid, monthKey);
  assertGlobalSttQuotaHasCapacity(globalData, audioSeconds);
  await assertUserSttQuotaHasCapacity(db, uid, userData, audioSeconds);
  logSttQuotaCheckPassed(uid, audioSeconds, globalData, userData);
  await persistSttQuotaUsage(db, globalRef, userRef, globalData, userData, audioSeconds, monthKey);
}

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
  verifyUserHasRemainingSttQuota,
  sendAudioToChirpRecognizer,
  sendAudioToGoogleSpeechRecognition,
  CHIPTT_STT_GLOBAL_LIMIT,
  CHIPTT_STT_USER_LIMIT,
  CHIPTT_STT_PREMIUM_USER_LIMIT,
};
