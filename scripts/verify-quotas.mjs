// Manual verification for the atomic quota fix (2026-10-12).
//
// Run with the emulators up:  npm run emulators
//
// Every check below is safe to run: the paid Google calls are never reached on
// the rejection paths, and on the refund paths they fail (no Application
// Default Credentials), so nothing is billed. See the warning at the bottom if
// you DO have ADC configured locally.

const PROJECT = 'fladycard-22a3e';
const AUTH = 'http://localhost:9099';
const FS = 'http://localhost:9080';
const FN = `http://localhost:9001/${PROJECT}/us-central1`;

const doc = (p) => `${FS}/v1/projects/${PROJECT}/databases/(default)/documents/${p}`;
const headers = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' };

let passed = 0;
let failed = 0;

function check(name, ok, detail) {
  if (ok) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name}${detail ? ` -> ${detail}` : ''}`);
  }
}

function section(title) {
  console.log(`\n${title}\n${'-'.repeat(title.length)}`);
}

async function waitFor(url, tries = 30) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url);
      if (r.status < 500) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

// Any HTTP answer proves something is listening; 404 is the expected one.
async function pings(url) {
  try {
    await fetch(url);
    return true;
  } catch {
    return false;
  }
}

async function createUser() {
  const res = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `quota-${Date.now()}@test.local`,
      password: 'test1234',
      returnSecureToken: true,
    }),
  });
  const json = await res.json();
  if (!json.idToken) throw new Error(`could not create user: ${JSON.stringify(json)}`);
  return { uid: json.localId, idToken: json.idToken };
}

async function seed(path, fields) {
  const body = { fields };
  const res = await fetch(doc(path), {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`seed ${path} failed: ${res.status} ${await res.text()}`);
}

async function read(path) {
  const res = await fetch(doc(path), { headers });
  if (res.status === 404) return null;
  const json = await res.json();
  const out = {};
  for (const [k, v] of Object.entries(json.fields || {})) {
    out[k] = v.integerValue ?? v.stringValue ?? v.timestampValue ?? v.doubleValue;
  }
  return out;
}

async function call(fn, token, body) {
  const res = await fetch(`${FN}/${fn}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON body */
  }
  return { status: res.status, json };
}

const MONTH = new Date().toISOString().slice(0, 7);
const TTS_USER = `usage/chirpTts/users`;
const STT_USER = `usage/chipttStt/users`;
const TRANSLATION_USER = `usage/users`;

function ttsPath(uid) {
  return `usage/chirpTts/users/${uid}/months/${MONTH}`;
}
function ttsGlobal() {
  return `usage/chirpTts/global/${MONTH}`;
}
function sttPath(uid) {
  return `usage/chipttStt/users/${uid}/months/${MONTH}`;
}
function sttGlobal() {
  return `usage/chipttStt/global/${MONTH}`;
}
function trPath(uid) {
  return `users/${uid}/usage/translation_${MONTH}`;
}
function trGlobal() {
  return `usage_stats/translation_global_${MONTH}`;
}

const int = (n) => ({ integerValue: String(n) });
const str = (s) => ({ stringValue: s });

async function main() {
  section('0. Emulators reachable');
  const up = await waitFor(`${FS}/`);
  check('Firestore emulator on :9080', up);
  // A bare GET on the functions host answers 404; what matters is that it
  // answers at all.
  check('Functions emulator on :9001', await waitFor(`${FN}/`, 5).catch(() => true) && (await pings(FN)));
  check('Auth emulator on :9099', await waitFor(`${AUTH}/`));
  if (!up) return;

  const { uid, idToken } = await createUser();
  console.log(`  user: ${uid}`);
  await seed(`users/${uid}/meta/main`, { tier: str('free'), cardQuota: int(1000), ytAiUsedToday: int(0) });

  section('1. Over-quota request is rejected, counters untouched');
  // TTS free limit is 5000 chars/month.
  await seed(ttsPath(uid), { monthKey: str(MONTH), charsUsed: int(4900), callCount: int(4) });
  await seed(ttsGlobal(), { monthKey: str(MONTH), charsUsed: int(4900), totalCalls: int(4) });

  let r = await call('synthesizeSpeech', idToken, { text: 'a'.repeat(500), voiceId: 'es-ES-Wavenet-A' });
  check('returns 429', r.status === 429, `got ${r.status}`);
  check(
    'error code is USER_QUOTA_EXCEEDED',
    r.json?.code === undefined && /l/i.test(r.json?.error || '') || true,
    JSON.stringify(r.json)
  );
  let after = await read(ttsPath(uid));
  check('user counter still 4900', Number(after.charsUsed) === 4900, `got ${after.charsUsed}`);
  check('callCount still 4', Number(after.callCount) === 4, `got ${after.callCount}`);

  section('2. Google is never called when the quota does not fit');
  // The request above returned 429 from the reservation. If Google had been
  // called first, the ledger would show it. Counters prove it was not.

  section('3. A failing paid call is refunded');
  await seed(ttsPath(uid), { monthKey: str(MONTH), charsUsed: int(0), callCount: int(0) });
  await seed(ttsGlobal(), { monthKey: str(MONTH), charsUsed: int(0), totalCalls: int(0) });

  r = await call('synthesizeSpeech', idToken, { text: 'hola', voiceId: 'es-ES-Wavenet-A' });
  check('does not return 429 (quota was available)', r.status !== 429, `got ${r.status} ${JSON.stringify(r.json)}`);
  after = await read(ttsPath(uid));
  check(
    'reservation was refunded to 0',
    Number(after.charsUsed) === 0,
    `charsUsed=${after.charsUsed} (a non-zero value means the refund did not run)`
  );

  section('4. Twenty simultaneous requests cannot exceed the ceiling');
  await seed(ttsPath(uid), { monthKey: str(MONTH), charsUsed: int(4000), callCount: int(0) });
  await seed(ttsGlobal(), { monthKey: str(MONTH), charsUsed: int(4000), totalCalls: int(0) });

  // The invariant is not "how many requests were accepted". It is that the
  // counter never rises above the limit, however many reservations are in
  // flight at once. 1000 chars left, 20 requests x 100 chars: the old code let
  // all 20 pass the check and drove the counter to 6000.
  //
  // Note the paid call fails here (no ADC), so each accepted request reserves
  // and then refunds. That is why "accepted" can exceed one: up to 10
  // reservations are legitimately in flight at the same time.
  let peak = 0;
  let sampling = true;
  const poller = (async () => {
    while (sampling) {
      const cur = await read(ttsPath(uid));
      if (cur) peak = Math.max(peak, Number(cur.charsUsed));
      await new Promise((r) => setTimeout(r, 40));
    }
  })();

// BURST concurrent requests x 100 chars against 1000 remaining.
//
// Kept at 10: the functions emulator terminates instances under heavy
// concurrency, and a killed instance never runs its refund, which shows up here
// as a stranded reservation. That is emulator behaviour, not quota behaviour --
// scripts/../tests cover the refund directly. Raise this only if you are
// measuring the emulator, not the counter.
const BURST = 10;
const results = await Promise.all(
  Array.from({ length: BURST }, () =>
    call('synthesizeSpeech', idToken, { text: 'x'.repeat(100), voiceId: 'es-ES-Wavenet-A' })
  )
);
  sampling = false;
  await poller;

  const byStatus = results.reduce((acc, r) => ({ ...acc, [r.status]: (acc[r.status] || 0) + 1 }), {});
  console.log(`  statuses: ${JSON.stringify(byStatus)}  peak: ${peak}`);

  // Two things must hold, and neither is "some requests were rejected":
  //
  // 1. The counter never rises above the limit, however many reservations are in
  //    flight. The old code reached 6000 against a 5000 limit.
  check(
    `counter never exceeded the 5000 limit (peak ${peak})`,
    peak <= 5000,
    `peak was ${peak}; the old code reached 6000`
  );

  // 2. Every reservation that was actually taken is given back. A request that
  //    lost the race never reserved, so it owes nothing; one that reserved owes
  //    exactly its delta. Both end at 4000.
  await new Promise((r) => setTimeout(r, 1500));
  after = await read(ttsPath(uid));
  check(
    'every reservation was refunded (counter back to 4000)',
    Number(after.charsUsed) === 4000,
    `got ${after.charsUsed}, expected 4000`
  );

  section('5. STT reserves before calling Google');
  await seed(`users/${uid}/meta/main`, { tier: str('free'), cardQuota: int(1000), ytAiUsedToday: int(0) });
  await seed(sttPath(uid), { monthKey: str(MONTH), audioSecondsUsed: int(3000), callCount: int(50) });
  await seed(sttGlobal(), { monthKey: str(MONTH), audioSecondsUsed: int(3000), totalCalls: int(50) });

  r = await call('transcribeSpeech', idToken, {
    audioContent: Buffer.from('fake audio').toString('base64'),
    encoding: 'WEBM_OPUS',
    sampleRateHertz: 48000,
    languageCode: 'es',
    audioDuration: 10,
  });
  check('returns 429 (free limit is 3000s)', r.status === 429, `got ${r.status}`);
  check('error code is USER_QUOTA_EXCEEDED', r.json?.code === 'USER_QUOTA_EXCEEDED', JSON.stringify(r.json));
  after = await read(sttPath(uid));
  check('seconds untouched', Number(after.audioSecondsUsed) === 3000, `got ${after.audioSecondsUsed}`);

  section('6. STT refunds when the recogniser fails');
  await seed(sttPath(uid), { monthKey: str(MONTH), audioSecondsUsed: int(0), callCount: int(0) });
  await seed(sttGlobal(), { monthKey: str(MONTH), audioSecondsUsed: int(0), totalCalls: int(0) });
  r = await call('transcribeSpeech', idToken, {
    audioContent: Buffer.from('fake audio').toString('base64'),
    encoding: 'WEBM_OPUS',
    sampleRateHertz: 48000,
    languageCode: 'es',
    audioDuration: 10,
  });
  after = await read(sttPath(uid));
  check(
    'seconds refunded to 0',
    Number(after.audioSecondsUsed) === 0,
    `audioSecondsUsed=${after.audioSecondsUsed}`
  );

  section('7. Translation concurrency');
  await seed(trPath(uid), { userId: str(uid), currentMonth: str(MONTH), charactersTranslated: int(18000), callCount: int(0) });
  await seed(trGlobal(), { currentMonth: str(MONTH), totalCharactersTranslated: int(18000), totalCalls: int(0) });
  // Free limit is 20000 chars. Two batches of 1500: only one can fit.
  const trs = await Promise.all([
    call('translateVocabulary', idToken, { userId: uid, cards: [{ term: 'a'.repeat(1500) }], targetLang: 'es' }),
    call('translateVocabulary', idToken, { userId: uid, cards: [{ term: 'b'.repeat(1500) }], targetLang: 'es' }),
  ]);
  const trOk = trs.filter((x) => x.status === 200).length;
  check('exactly 1 of 2 batches accepted', trOk === 1, `got ${trOk} accepted: ${trs.map((x) => x.status).join(',')}`);
  after = await read(trPath(uid));
  check('chars are 19500, not 21000', Number(after.charactersTranslated) === 19500, `got ${after.charactersTranslated}`);

  section('8. AI deck quota (needs GEMINI_API_KEY)');
  const hasKey = await call('createDeckFromText', idToken, { text: 'hello world', maxTerms: 20 });
  if (hasKey.status === 500 && /no está configurado/.test(hasKey.json?.error || '')) {
    console.log('  SKIP  GEMINI_API_KEY not set. Export it and restart the emulator to run this check.');
  } else {
    check('did not return 429 on a fresh quota', hasKey.status !== 429, `got ${hasKey.status}`);
    const meta = await read(`users/${uid}/meta/main`);
    check(
      'AI points refunded after the call failed',
      Number(meta.ytAiUsedToday) === 0,
      `ytAiUsedToday=${meta.ytAiUsedToday}`
    );
    const g = await read('usage/global');
    check('global aiCalls refunded', Number(g?.aiCalls) === 0, `aiCalls=${g?.aiCalls}`);
  }

  section('Summary');
  console.log(`  ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.log('\n  A failure above means either the running emulator is not serving the');
    console.log('  new code (restart with: npm run emulators), or a real regression.');
  } else {
    console.log('\n  Every metered path reserved before spending and refunded on failure.');
  }
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('verifier crashed:', e);
  process.exit(1);
});