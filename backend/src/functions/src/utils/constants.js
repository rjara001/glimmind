const { getMaxCards, QUOTA_CONFIG } = require("./quotaConfig");

const COLLECTION_NAME = "lists";

const DEFAULT_CARD_QUOTA = getMaxCards('free');
const PREMIUM_CARD_QUOTA = getMaxCards('premium');
const MAX_CARDS_PER_LIST = QUOTA_CONFIG.maxCardsPerList;

const DECK_TIERS = {
  express: { maxTerms: 20, costPercent: 15 },
  standard: { maxTerms: 40, costPercent: 30 },
  extended: { maxTerms: 80, costPercent: 60 },
  massive: { maxTerms: 150, costPercent: 100 },
};

const MAX_EVENTS_PER_BATCH = 400;
const MAX_ACTIVITY_PAGE = 200;
const MAX_SESSIONS_PAGE = 200;

const RETRIES_PER_MODEL = 2;
const RETRY_BASE_DELAY_MS = 3000;
const PER_CALL_TIMEOUT_MS = 300000;

const CHIRP_TTS_GLOBAL_LIMIT = 500000;
const CHIRP_TTS_USER_LIMIT = 5000;
const CHIRP_TTS_PREMIUM_USER_LIMIT = 100000;
const CHIRP_TTS_CALL_TIMEOUT_MS = 30000;

const CHIPTT_STT_GLOBAL_LIMIT = 30000;
const CHIPTT_STT_MAX_SINGLE_DURATION = 60;
const CHIPTT_STT_USER_LIMIT = 3000;
const CHIPTT_STT_PREMIUM_USER_LIMIT = 72000;
const CHIPTT_STT_CALL_TIMEOUT_MS = 30000;

const TRANSLATION_GLOBAL_MONTHLY_CHARS = 400000;
const TRANSLATION_USER_MONTHLY_CHARS = 20000;
const TRANSLATION_PREMIUM_USER_MONTHLY_CHARS = 100000;

const GCP_PROJECT_ID = "fladycard-22a3e";
const GCP_REGION = "us-central1";


const GOOGLE_TTS_URL = "https://texttospeech.googleapis.com/v1/text:synthesize";
const GOOGLE_STT_URL = "https://speech.googleapis.com/v1/speech:recognize";
const GOOGLE_STT_RECOGNIZE_URL = `https://eu-speech.googleapis.com/v2/projects/${GCP_PROJECT_ID}/locations/eu/recognizers/_:recognize`;
const GOOGLE_VOICES_URL = "https://texttospeech.googleapis.com/v1/voices";
const GOOGLE_METADATA_TOKEN_URL = "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token";
const GOOGLE_TRANSLATE_URL = `https://translation.googleapis.com/v3/projects/${GCP_PROJECT_ID}/locations/global:translateText`;
const DEEPL_FREE_URL = "https://api-free.deepl.com/v2/translate";

module.exports = {
  COLLECTION_NAME,
  DEFAULT_CARD_QUOTA,
  PREMIUM_CARD_QUOTA,
  MAX_CARDS_PER_LIST,
  DECK_TIERS,
  MAX_EVENTS_PER_BATCH,
  MAX_ACTIVITY_PAGE,
  MAX_SESSIONS_PAGE,
  RETRIES_PER_MODEL,
  RETRY_BASE_DELAY_MS,
  PER_CALL_TIMEOUT_MS,
  CHIRP_TTS_GLOBAL_LIMIT,
  CHIRP_TTS_USER_LIMIT,
  CHIRP_TTS_PREMIUM_USER_LIMIT,
  CHIRP_TTS_CALL_TIMEOUT_MS,
  CHIPTT_STT_GLOBAL_LIMIT,
  CHIPTT_STT_MAX_SINGLE_DURATION,
  CHIPTT_STT_USER_LIMIT,
  CHIPTT_STT_PREMIUM_USER_LIMIT,
  CHIPTT_STT_CALL_TIMEOUT_MS,
  TRANSLATION_GLOBAL_MONTHLY_CHARS,
  TRANSLATION_USER_MONTHLY_CHARS,
  TRANSLATION_PREMIUM_USER_MONTHLY_CHARS,
  GCP_PROJECT_ID,
  GCP_REGION,
  GOOGLE_TTS_URL,
  GOOGLE_STT_URL,
  GOOGLE_STT_RECOGNIZE_URL,
  GOOGLE_VOICES_URL,
  GOOGLE_METADATA_TOKEN_URL,
  GOOGLE_TRANSLATE_URL,
  DEEPL_FREE_URL,
};
