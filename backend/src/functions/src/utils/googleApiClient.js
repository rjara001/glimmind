const { execSync } = require("child_process");
const { GOOGLE_METADATA_TOKEN_URL, GCP_PROJECT_ID } = require("./constants");

async function getAccessToken() {
  try {
    const response = await fetch(
      GOOGLE_METADATA_TOKEN_URL,
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
    const token = execSync(
      "gcloud auth application-default print-access-token",
      { encoding: "utf8" }
    ).trim();

    if (token) return token;
  } catch (e) {
    console.error("[GoogleApiClient] ADC token error:", e);
  }

  throw new Error(
    "No se pudo obtener access token para Google Cloud."
  );
}

async function sendAuthenticatedRequest(url, body, timeoutMs = 60000, responseValidator) {
  const accessToken = await getAccessToken();

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Authorization": `Bearer ${accessToken}`,
      "x-goog-user-project": GCP_PROJECT_ID,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    const bodyText = await response.text().catch(() => "");

    const error = new Error(
      `HTTP ${response.status}: ${bodyText.slice(0, 500)}`
    );

    error.code =
      response.status === 429 ? "RATE_LIMITED" : "API_ERROR";

    throw error;
  }

  const data = await response.json();

  if (responseValidator) {
    const validationError = responseValidator(data);
    if (validationError) {
      throw validationError;
    }
  }

  return data;
}

module.exports = { getAccessToken, sendAuthenticatedRequest };
