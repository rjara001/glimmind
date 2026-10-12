# Voice recordings are stored base64 inside Firestore documents

## What

Recorded answers are written as `audioBase64` field of a `voiceRecordings`
document, rather than as a file in Cloud Storage. Base64 inflates the payload
by roughly a third, and Firestore caps a document at 1 MiB, so each recording
consumes a large share of the quota for a single field. No per-user quota
exists on recordings, and `deleteRecording` deletes by document id without
comparing `userId` against the document being removed.

## Impact

- Hard ceiling of 1 MiB per recording document, so the usable audio is about
  780 KB of base64 before the write starts failing.
- Read cost is charged on the audio every time the list's recordings are loaded
  — up to 50 documents at a time (`PAGE_SIZE = 50`), meaning up to ~50 MiB read
  for one view.
- No seconds-based or count-based quota, unlike STT and TTS which both meter.
- `deleteRecording(userId, recordingId)` trusts `recordingId` alone; it is
  authorised only by Firestore security rules.
- Account deletion does not remove these documents — see §7.1 of
  [`../SERVICE_CATALOG.md`](../SERVICE_CATALOG.md), the Privacy Policy already
  promises the recordings are erased.

## Evidence

```
src/services/voiceRecordingService.ts:16    const COLLECTION = 'voiceRecordings';
src/services/voiceRecordingService.ts:17    const PAGE_SIZE = 50;
src/services/voiceRecordingService.ts:32    audioBase64: data.audioBase64 as string,
src/services/voiceRecordingService.ts:62    const ref = await addDoc(collection(db, COLLECTION), payload);
src/services/voiceRecordingService.ts:67-71 deleteRecording(userId, recordingId)
                                           -> deleteDoc(doc(db, COLLECTION, recordingId))   // userId unused

live callers: src/hooks/voice/useVoiceRecordings.ts:60,149,187
```

## Fix

Upload the blob to Storage and keep only the download URL in the document,
meter recordings with the same seconds quota STT already uses, and make
`deleteRecording` re-read the document and verify `userId` before deleting.