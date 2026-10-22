const { deriveMeteredAudioSeconds } = require("../src/routes/sttRoutes");

function base64OfBytes(byteLength) {
  return Buffer.alloc(byteLength, 1).toString("base64");
}

describe("deriveMeteredAudioSeconds (U-08)", () => {
  test("charges at least one second for any payload", () => {
    expect(deriveMeteredAudioSeconds(base64OfBytes(10))).toBe(1);
    expect(deriveMeteredAudioSeconds(base64OfBytes(0))).toBe(1);
  });

  test("derives seconds from the payload size (~4 KB/s heuristic)", () => {
    expect(deriveMeteredAudioSeconds(base64OfBytes(4000))).toBe(1);
    expect(deriveMeteredAudioSeconds(base64OfBytes(240000))).toBe(60);
  });

  test("flags payloads above the 60-second single-recording ceiling", () => {
    expect(deriveMeteredAudioSeconds(base64OfBytes(244000))).toBeGreaterThan(60);
  });

  test("cannot be understated: the payload alone decides the metered seconds", () => {
    // A 60-second recording is ~240 KB; no client field participates in the
    // derivation, so an under-reported audioDuration cannot shrink it.
    const sixtySecondPayload = base64OfBytes(240000);
    expect(deriveMeteredAudioSeconds(sixtySecondPayload)).toBe(60);
  });
});
