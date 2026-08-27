# Plan: Servicio de Traducción Automática con Cuotas

## Objetivo
Implementar traducción automática EN -> ES para términos/frases extraídas de YouTube, con control estricto de cuotas global y por usuario usando Google Cloud Translation.

## Alcance
- Backend: Cloud Function `translateVocabulary` + servicio de cuotas en Firestore.
- Frontend: `translationService.ts`, tipos, integración en `VocabularyPreview`.
- Cuotas: pre-flight check atómico, actualización batch en transacción.
- UX: botón separado "Traducir" en preview; si se acaba la cuota, el usuario puede continuar sin traducción.

## Decisiones
- Trigger: acción separada desde `VocabularyPreview`, no automático en `createYouTubeDeck`.
- Paths Firestore: `usage_stats/translation_global_YYYY_MM` y `users/{userId}/usage/translation_YYYY_MM` (según requerimiento).
- Librería: `@google-cloud/translate` en backend (Cloud Functions), no en frontend.
- Límites: `MAX_GLOBAL_MONTHLY_CHARS = 400000`, `MAX_USER_MONTHLY_CHARS = 20000`.
- Respuesta incluye: `translations`, `consumedChars`, `userRemainingChars`, `quotaExceeded`.
- Colección constante agregada a `backend/src/functions/src/utils/constants.js`.

## Pasos
1. Crear este plan.
2. `cd backend/src/functions && npm install @google-cloud/translate`.
3. Crear `backend/src/functions/src/services/translationQuota.js` con:
   - `resolveCurrentMonthKey()`
   - `buildTranslationQuotaDocumentRefs(db, uid, monthKey)`
   - `fetchTranslationQuotaDocuments(db, uid, monthKey)`
   - `assertGlobalTranslationQuotaHasCapacity(globalData, incomingChars)`
   - `assertUserTranslationQuotaHasCapacity(db, uid, userData, incomingChars)`
   - `persistTranslationQuotaUsage(db, globalRef, userRef, globalData, userData, incomingChars, monthKey)`
4. Crear `backend/src/functions/src/routes/translateVocabulary.js` con:
   - `translateBatch(userId, texts, targetLang = 'es')`
   - Validación previa de cuotas.
   - Llamada a Google Cloud Translation.
   - Actualización atómica de contadores.
   - Manejo de errores y respuesta con métricas.
5. Crear `src/services/translationService.ts` con wrapper de `callFunction('translateVocabulary', ...)`.
6. Crear/actualizar tipos en `src/types/translation.ts`.
7. Integrar en `VocabularyPreview.tsx`: botón "Traducir", estado de carga, manejo de `quotaExceeded`.
8. Registrar ruta en `backend/src/functions/index.js`.
9. `npm run lint` / `tsc --noEmit` y pruebas E2E.

## Validación
- `tsc --noEmit` limpio.
- Probar flujo con cuota libre y con cuota agotada.
- Verificar actualización de documentos en Firestore emulator.
