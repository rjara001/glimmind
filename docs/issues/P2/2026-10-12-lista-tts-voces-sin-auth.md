# listTtsVoices is a public endpoint with wildcard CORS

## What

`listTtsVoices` requires no authentication. It applies only the shared
`default` rate limit and answers any caller, including unauthenticated ones from
any origin. It returns the Chirp voice catalogue.

## Impact

- The endpoint is discoverable and callable without a Firebase ID token.
- Rate limit is 60 requests/minute per IP, which does not stop enumeration and
  does not bind the caller to a quota.
- The response is voice metadata (ids and labels), not credentials, so this is
  an information-exposure and quota-consumption issue rather than a leak of
  secrets. It does not spend money: it reads a cached voice list and performs
  the Google lookup at most once per cache window.
- It is inconsistent with `synthesizeSpeech`, which does require a uid and does
  check the quota.

## Evidence

```
backend/src/functions/src/routes/ttsRoutes.js:76-103
  exports.listTtsVoices = onRequest(
    { cors: true, timeoutSeconds: 30, memory: "256MiB" },
    applyRateLimit("default", async (req, res) => {
      ...
      const voices = await chirpVoicesService.getCachedOrFreshChirpVoices();
      res.json({ voices });        // no uid, no requireAuth, no tier check

backend/src/functions/src/routes/ttsRoutes.js:80,88
  res.set('Access-Control-Allow-Origin', '*');

backend/src/functions/src/routes/ttsRoutes.js:37-62  synthesizeSpeech, for contrast:
  const uid = ... ; verifyUserHasRemainingTtsQuota(getDb(), uid, charCount);

backend/src/functions/src/utils/rateLimit.js:3   default: { requests: 60, windowMs: 60000 }
```

## Fix

Require authentication and restrict CORS to the app origin, matching
`synthesizeSpeech`. No product decision needed.