const { getDb } = require("../utils/firebase");
const { FieldValue } = require("../utils/firebase");
const { CHIPTT_STT_GLOBAL_LIMIT, CHIPTT_STT_USER_LIMIT, CHIPTT_STT_PREMIUM_USER_LIMIT, CHIPTT_STT_CALL_TIMEOUT_MS } = require("../utils/constants");

function monthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

async function checkAndIncrementQuota(db, uid, audioSeconds) {
  const currentMonth = monthKey();

  const globalRef = db
    .collection("usage")
    .doc("chipttStt")
    .collection("global")
    .doc(currentMonth);

  const userRef = db
    .collection("usage")
    .doc("chipttStt")
    .collection("users")
    .doc(uid)
    .collection("months")
    .doc(currentMonth);

  const [globalSnap, userSnap] = await Promise.all([
    globalRef.get(),
    userRef.get(),
  ]);

  const globalData = globalSnap.exists
    ? globalSnap.data()
    : { monthKey: currentMonth, audioSecondsUsed: 0 };

  const userData = userSnap.exists
    ? userSnap.data()
    : { monthKey: currentMonth, audioSecondsUsed: 0 };

  if (globalData.audioSecondsUsed >= CHIPTT_STT_GLOBAL_LIMIT) {
    console.error('[Chiptt] global quota exceeded', {
      uid,
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

  console.error('[Chiptt] quota check passed', {
    uid,
    audioSeconds,
    globalUsed: globalData.audioSecondsUsed,
    userUsed: userData.audioSecondsUsed,
  });

  const batch = db.batch();

  batch.set(
    globalRef,
    {
      monthKey: currentMonth,
      audioSecondsUsed: globalData.audioSecondsUsed + audioSeconds,
    },
    { merge: true }
  );

  batch.set(
    userRef,
    {
      monthKey: currentMonth,
      audioSecondsUsed: userData.audioSecondsUsed + audioSeconds,
    },
    { merge: true }
  );

  await batch.commit();
}

async function getAccessToken() {
  try {
    const response = await fetch(
      'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
      {
        headers: { 'Metadata-Flavor': 'Google' },
        signal: AbortSignal.timeout(2000),
      }
    );

    if (response.ok) {
      const data = await response.json();
      return data.access_token;
    }
  } catch (e) {
    // Local development: use ADC
  }

  try {
    const { execSync } = require("child_process");

    const token = execSync(
      "gcloud auth application-default print-access-token",
      { encoding: "utf8" }
    ).trim();

    if (token) return token;
  } catch (e) {
    console.error("[Chiptt] ADC token error:", e);
  }

  throw new Error(
    "No se pudo obtener access token para Google Cloud STT."
  );
}

async function callGoogleSttRecognize(audioContent, languageCode) {
  console.log('Passthrouhgt callGoogleSttRecognize');
  
  const accessToken = await getAccessToken();

  const body = {
    config: {
      auto_decoding_config: {},
      language_codes: [languageCode || "es-US"],
      model: "chirp_3",
    },
    content: audioContent,
  };

  const response = await fetch(
    "https://eu-speech.googleapis.com/v2/projects/fladycard-22a3e/locations/eu/recognizers/_:recognize",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Authorization": `Bearer ${accessToken}`,
        "x-goog-user-project": "fladycard-22a3e",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(CHIPTT_STT_CALL_TIMEOUT_MS),
    }
  );

  if (!response.ok) {
    const bodyText = await response.text().catch(() => "");

    console.error('[Chiptt] Google STT Recognize HTTP error', {
      status: response.status,
      body: bodyText.slice(0, 500),
    });

    const error = new Error(
      `STT HTTP ${response.status}: ${bodyText.slice(0, 500)}`
    );

    error.code =
      response.status === 429 ? "RATE_LIMITED" : "STT_ERROR";

    throw error;
  }

  const data = await response.json();

  const transcript =
    data.results?.[0]?.alternatives?.[0]?.transcript;

  if (!transcript) {
    console.error('[Chiptt] Google STT Recognize no transcript', {
      resultsCount: data.results?.length || 0,
      alternativesCount: data.results?.[0]?.alternatives?.length || 0,
    });
    const error = new Error("No speech detected.");
    error.code = "NO_SPEECH";
    throw error;
  }

  console.error('[Chiptt] Google STT Recognize success', {
    transcriptLength: transcript.length,
    transcriptPreview: transcript.slice(0, 100),
    billedDuration: data.metadata?.totalBilledDuration,
    requestId: data.metadata?.requestId,
  });

  return { transcript, metadata: data.metadata };
}

async function callGoogleStt(audioContent, encoding, sampleRateHertz, languageCode) {
  const accessToken = await getAccessToken();

  const body = {
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
  };

  const response = await fetch(
    "https://speech.googleapis.com/v1/speech:recognize",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
        "x-goog-user-project": "fladycard-22a3e",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(CHIPTT_STT_CALL_TIMEOUT_MS),
    }
  );

  if (!response.ok) {
    const bodyText = await response.text().catch(() => "");

    console.error('[Chiptt] Google STT HTTP error', {
      status: response.status,
      body: bodyText.slice(0, 500),
    });

    const error = new Error(
      `STT HTTP ${response.status}: ${bodyText.slice(0, 500)}`
    );

    error.code =
      response.status === 429 ? "RATE_LIMITED" : "STT_ERROR";

    throw error;
  }

  const data = await response.json();

  const transcript =
    data.results?.[0]?.alternatives?.[0]?.transcript;

  if (!transcript) {
    console.error('[Chiptt] Google STT no transcript', {
      resultsCount: data.results?.length || 0,
      alternativesCount: data.results?.[0]?.alternatives?.length || 0,
    });
    const error = new Error("No speech detected.");
    error.code = "NO_SPEECH";
    throw error;
  }

  console.error('[Chiptt] Google STT success', {
    transcriptLength: transcript.length,
    transcriptPreview: transcript.slice(0, 100),
  });

  return transcript;
}

module.exports = {
  checkAndIncrementQuota,
  callGoogleStt,
  callGoogleSttRecognize,
  getAccessToken,
  CHIPTT_STT_GLOBAL_LIMIT,
  CHIPTT_STT_USER_LIMIT,
  CHIPTT_STT_PREMIUM_USER_LIMIT,
};
