const { getDb } = require("../utils/firebase");
const { FieldValue } = require("../utils/firebase");
const { CHIPTT_STT_GLOBAL_LIMIT, CHIPTT_STT_USER_LIMIT, CHIPTT_STT_CALL_TIMEOUT_MS } = require("../utils/constants");

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
    const error = new Error(
      "El servicio de transcripción alcanzó su límite mensual global. Intenta el próximo mes."
    );
    error.code = "GLOBAL_QUOTA_EXCEEDED";
    throw error;
  }

  if (userData.audioSecondsUsed >= CHIPTT_STT_USER_LIMIT) {
    const error = new Error(
      `Llegaste a tu límite mensual de transcripción (${CHIPTT_STT_USER_LIMIT} segundos). Vuelve el próximo mes.`
    );
    error.code = "USER_QUOTA_EXCEEDED";
    throw error;
  }

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
    const error = new Error("Respuesta vacía de STT.");
    error.code = "STT_ERROR";
    throw error;
  }

  return transcript;
}

module.exports = {
  checkAndIncrementQuota,
  callGoogleStt,
  getAccessToken,
  CHIPTT_STT_GLOBAL_LIMIT,
  CHIPTT_STT_USER_LIMIT,
};
