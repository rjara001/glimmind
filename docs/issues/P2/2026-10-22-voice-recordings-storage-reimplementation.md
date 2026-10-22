# Reimplementation plan: per-answer voice recordings (former Firestore path)

**Date:** 2026-10-22
**Priority (folder):** P2
**Status:** Stub — the feature was removed on 2026-10-22 (U-06). Reimplement
only if "record my own answer and keep it" returns as a product requirement.

## What was removed

The "Grabar Voz" / "Historial" premium buttons and everything behind them:
`useVoiceRecordings`, `voiceRecordingService` (Firestore `voiceRecordings`
collection, base64 documents, no quota, delete without userId check) and
`VoiceRecordingsModal`. The auto-recording of spoken answers to user-scoped
Cloud Storage (Path 1, `audioRecordingEnabled` + `useGameVoice` +
`audioService.ts`) was NOT touched and remains the live recording surface.

## Reimplementation sketch

1. Upload blobs to user-scoped Cloud Storage; documents keep only the download
   URL (never base64 — Firestore 1 MiB document cap and read-cost blowup).
2. Meter recordings with the seconds quota STT already uses
   (`transcribeWithQuota` pattern) so storage and transcription costs are
   bounded.
3. `deleteRecording` must re-read the document and verify `userId` before
   deleting; account deletion must purge Storage objects + documents.
4. Wire a Premium-gated UI (SessionBar or deck editor) only with the Storage
   path in place; add emulator tests for upload, listing, delete and quota.
