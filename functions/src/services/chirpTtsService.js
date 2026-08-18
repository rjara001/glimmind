const { getDb } = require("../utils/firebase");
const { FieldValue } = require("../utils/firebase");
const { todayKey } = require("../utils/helpers");
const { CHIRP_TTS_GLOBAL_LIMIT, CHIRP_TTS_USER_LIMIT, CHIRP_TTS_PREMIUM_USER_LIMIT, CHIRP_TTS_CALL_TIMEOUT_MS } = require("../utils/constants");

function monthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

async function getQuotaDoc(db, path) {
  const ref = db.doc(path);
  const snap = await ref.get();
  const currentMonth = monthKey();

  if (snap.exists) {
    const data = snap.data();
    if (data.monthKey !== currentMonth) {
      return { ref, data: { monthKey: currentMonth, charsUsed: 0 } };
    }
    return { ref, data };
  }

  return { ref, data: { monthKey: currentMonth, charsUsed: 0 } };
}

async function checkAndIncrementQuota(db, uid, charCount) {
  const currentMonth = monthKey();

  const globalRef = db
    .collection("usage")
    .doc("chirpTts")
    .collection("global")
    .doc(currentMonth);

  const userRef = db
    .collection("usage")
    .doc("chirpTts")
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
    : { monthKey: currentMonth, charsUsed: 0 };

  const userData = userSnap.exists
    ? userSnap.data()
    : { monthKey: currentMonth, charsUsed: 0 };

  if (globalData.charsUsed >= CHIRP_TTS_GLOBAL_LIMIT) {
    const error = new Error(
      "El servicio de voz alcanzó su límite mensual global. Intenta el próximo mes."
    );
    error.code = "GLOBAL_QUOTA_EXCEEDED";
    throw error;
  }

  const metaRef = db.collection("users").doc(uid).collection("meta").doc("main");
  const metaSnap = await metaRef.get();
  const userTier = metaSnap.exists ? (metaSnap.data().tier || 'free') : 'free';
  const userLimit = userTier === 'premium' ? CHIRP_TTS_PREMIUM_USER_LIMIT : CHIRP_TTS_USER_LIMIT;

  if (userData.charsUsed >= userLimit) {
    const error = new Error(
      `Llegaste a tu límite mensual de voz (${userLimit} caracteres). Vuelve el próximo mes.`
    );
    error.code = "USER_QUOTA_EXCEEDED";
    throw error;
  }

  const batch = db.batch();

  batch.set(
    globalRef,
    {
      monthKey: currentMonth,
      charsUsed: globalData.charsUsed + charCount,
    },
    { merge: true }
  );

  batch.set(
    userRef,
    {
      monthKey: currentMonth,
      charsUsed: userData.charsUsed + charCount,
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
    console.error("[Chirp] ADC token error:", e);
  }

  throw new Error(
    "No se pudo obtener access token para Google Cloud TTS."
  );
}
async function callGoogleTts(text, voiceId, rate, pitch) {
  const accessToken = await getAccessToken();

  const parts = String(voiceId).split("-");
  const languageCode =
    parts.length >= 2 ? `${parts[0]}-${parts[1]}` : parts[0] || "es";

  // Chirp3-HD no soporta pitch.
  const audioConfig = {
    audioEncoding: "MP3",
    speakingRate: typeof rate === "number" ? rate : 1,
  };

  const response = await fetch(
    "https://texttospeech.googleapis.com/v1/text:synthesize",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
        "x-goog-user-project": "fladycard-22a3e",
      },
      body: JSON.stringify({
        input: {
          text: String(text),
        },
        voice: {
          languageCode,
          name: String(voiceId),
        },
        audioConfig,
      }),
      signal: AbortSignal.timeout(CHIRP_TTS_CALL_TIMEOUT_MS),
    }
  );

  if (!response.ok) {
    const bodyText = await response.text().catch(() => "");

    const error = new Error(
      `TTS HTTP ${response.status}: ${bodyText.slice(0, 500)}`
    );

    error.code =
      response.status === 429 ? "RATE_LIMITED" : "TTS_ERROR";

    throw error;
  }

  const data = await response.json();

  if (!data.audioContent) {
    const error = new Error("Respuesta vacía de TTS.");
    error.code = "TTS_ERROR";
    throw error;
  }

  return data.audioContent;
}

module.exports = {
  checkAndIncrementQuota,
  callGoogleTts,
  getAccessToken,
  CHIRP_TTS_GLOBAL_LIMIT,
  CHIRP_TTS_USER_LIMIT,
  CHIRP_TTS_PREMIUM_USER_LIMIT,
};
