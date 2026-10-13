# createList rejects a body the schema calls valid

## What

`CreateListSchema` marks `concept` and `settings` as `.optional()`, but
`buildListDocumentData` copies both into the document unconditionally. Omitting
either sends `undefined` to Firestore, which refuses it unless
`ignoreUndefinedProperties` is enabled. It is not.

The request therefore dies with HTTP 500 after validation has already passed,
and the 500 message is a Firestore SDK string.

## Impact

- Any API client that omits `concept` or `settings` gets a 500, not a 400. The
  schema promised the field was optional, so this is a contract mismatch rather
  than a caller error.
- The web client is unaffected: `ListServiceImpl.createList` declares both as
  required and always sends them.
- Found while reproducing
  [`../done/2026-10-12-premium-sin-limite-de-tarjetas.md`](../done/2026-10-12-premium-sin-limite-de-tarjetas.md).
  The first four probe requests all failed on this before the quota behaviour
  could be measured.

## Evidence

```
backend/src/functions/src/utils/validation.js:8    concept: z.string().max(500).optional()
backend/src/functions/src/utils/validation.js:11   settings: z.object({...}).optional()

backend/src/functions/src/services/listService/crud.js:13   concept,
backend/src/functions/src/services/listService/crud.js:14   settings,
backend/src/functions/src/services/listService/crud.js:15   ...(both spread into the doc, always)

$ POST createList  {"name":"A","userId":"<uid>","associations":[…]}
  -> HTTP 500
     {"error":"Value for argument \"data\" is not a valid Firestore document.
       Cannot use \"undefined\" as a Firestore value (found in field \"concept\")."}
```

## Fix

Either drop `.optional()` on both fields in `CreateListSchema`, or spread them
conditionally in `buildListDocumentData` the way `sourceType`, `sourceUrl`,
`rawSourceText` and `sourceRow` already are. The second matches what the other
four fields do.