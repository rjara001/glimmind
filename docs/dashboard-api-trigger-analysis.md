# Dashboard API Trigger Analysis

Fecha: 2026-09-17

## Problem

La app es lenta al cargar el dashboard. Se necesita entender qué APIs se disparan al entrar, con qué objetivo, y cuáles son innecesarias.

---

## Flujo completo: App → Dashboard

### Fase 1: Montaje de App (AppContent)

AppWrapper
  -> AppContent
    -> useAppBootstrap(navigate)
      -> Effect 1: onAuthStateChanged -> setUser() (sin API)
      -> Effect 2: cuando user cambia -> dispara 4 funciones async
      -> Effect 3: si isLoaded + user + lastPlayedId -> navigate('game')

### Fase 2: Bootstrap (loadInitialData)

`useAppBootstrap` dispara **una sola** función async: `loadInitialData()` (única llamada en `src/hooks/app/useAppBootstrap.ts:62-64`). No existen `loadProgress`/`loadQuota`/`loadSettings` en el store; el progreso se rehidrata desde localStorage (sin API).

Para usuario autenticado, `loadInitialData` (src/store/gameStore.ts:944) dispara en paralelo:

| # | Funcion (helper) | API | Condicion | Objetivo |
|---|------------------|-----|-----------|----------|
| 1 | fetchCloudListsForBootstrap (gameStore.ts:354) | getLists | Local vacio O TTL vencido (`shouldFetchCloudLists`, gameStore.ts:117) | Poblar la grilla de mazos. **Se dispara primero**; sus errores pasan a `bootstrapStatus.lists` y NO sellan el TTL |
| 2 | fetchQuotaForBootstrap (gameStore.ts:394) | getQuota | Siempre (usuarios reales) | QuotaAlert + habilitar/deshabilitar crear listas |
| 3 | fetchSettingsForBootstrap (gameStore.ts:413) | getSettings | Siempre (usuarios reales) | Preferencias de UI (idioma voz, etc.) |

Los tres se ejecutan con `Promise.allSettled` (sin await secuencial entre ellos); getLists se invoca primero para priorizarla. Cada resultado se registra en `bootstrapStatus` (src/types/bootstrap-status.ts) con fases `idle | loading | loaded | error`, y los errores de cada llamada se propagan al store (`fetchListsByUser` ya no traga errores).

El TTL por usuario se guarda en `glimmind_last_cloud_fetch_<uid>` (`clearLocalCache` ahora tambien borra esas claves, ver F3).

### Visibilidad en UI (spinner por llamada)

`bootstrapStatus` se consume en Dashboard:

| Elemento | Fuente | Mientras loading | Si error |
|----------|--------|------------------|----------|
| Spinner "Cargando mazos…" | `lists` + cache vacia | `role="status"` (reemplaza onboarding) | Alert "No se pudieron actualizar tus mazos" + boton Reintentar |
| SyncChip "Actualizando mazos…" / "Mazos sincronizados" | `lists` | chip con spinner | chip "Mazos sin actualizar" + Reintentar |
| SyncChip ajustes / sincronizacion | `settings` / `sync` | chips con spinner | chips con Reintentar |
| QuotaAlert "Calculando limites…" | `quota` (prop loading) | spinner + Nueva Lista deshabilitado | alerta de error + Reintentar |
| DashboardToolbar chip | `quota` | "Calculando limites…" | — |

Reintentos: `retryBootstrapPart(part)` (gameStore.ts:1045) reejecuta solo la llamada pedida.

### Fase 3: Dashboard renderiza

Una vez que isLoaded = true, el dashboard se renderiza. Los componentes del dashboard NO disparan APIs adicionales:

| Componente | Tipo | ¿Dispara API? |
|------------|------|----------------|
| DashboardProgressHero | Presentacional (recibe stats prop) | No |
| GoalWidget | Presentacional (recibe progress prop) | No |
| QuotaAlert | Presentacional (recibe status prop) | No |
| DashboardContinueBanner | Presentacional (recibe currentList prop) | No |
| RecentListsStrip | Presentacional (recibe lists prop) | No |
| BigListsGrid | Presentacional (recibe lists + milestones prop) | No |
| DashboardSearchBar | Estado local | No |
| DashboardToolbar | Botones | No |
| CreateListForm | Formulario | No |
| useDashboardStats | Memo computation | No |
| useDashboardLists | Memo computation | No |
| useDeckImporter | Estado local | No |
| useQuotaValidation | Memo computation | No |

Excepcion: Si es primera vez (lists.length === 0), se renderiza DeckStoreOnboarding que dispara getPrebuiltDecks para cargar el catalogo de decks preconstruidos.

- DeckStoreOnboarding -> src/components/onboarding/DeckStoreOnboarding.tsx:43-58
- prebuiltDeckService.fetchDecks() -> src/services/prebuiltDeckService.ts:6-16
- API: getPrebuiltDecks

### Fase 4: Si hay lastPlayedId -> auto-navegacion a /game

Si el usuario tiene una ultima lista jugada (localStorage: glimmer_last_played), se auto-navega a /game ANTES de ver el dashboard. Ahi se disparan 2 APIs adicionales:

| # | API | Disparado por | Ubicacion | Objetivo |
|---|-----|---------------|-----------|----------|
| 5 | getList | syncToCloud | src/store/gameStore.ts:838 | Verificar si la lista existe en Firestore |
| 6 | updateList | syncToCloud | src/store/gameStore.ts:871 | Sincronizar asociaciones a la nube |

Cadena de disparo:
GameView monta
  -> useGameLogic({ list })
    -> useEffect: setGame(prev => prev.updateList(list)) -> gameState.associations cambia
      -> useGameViewEffects
        -> useEffect (useGameViewEffects.ts:178-182): onUpdateAssociations(gameState.associations)
          -> handleUpdateAssociations (useAppHandlers.ts:78-85)
            -> updateAssociations (gameStore.ts:433)
              -> syncToCloud (gameStore.ts:827)
                -> getList (gameStore.ts:838)
                -> updateList (gameStore.ts:871)

Problema: Este flujo se dispara en montaje aunque los datos no hayan cambiado. updateList se ejecuta innecesariamente al llegar a /game.

---

## Resumen de APIs por escenario

### Escenario A: Usuario real, cache local presente y TTL vigente
getQuota + getSettings = 2 APIs (getLists se omite; se renderiza al instante con spinner por parte)

### Escenario A2: Usuario real, cache local presente y TTL vencido
getLists + getQuota + getSettings = 3 APIs en paralelo (getLists primero)

### Escenario A3: Usuario real SIN cache local (el bug "mazos no cargan")
getLists + getQuota + getSettings = 3 APIs en paralelo; getLists se fuerza aunque el TTL este fresco

### Escenario B: Usuario real + auto-navegacion a /game
Mismas 2-3 APIs del dashboard + getList + updateList en /game

### Escenario C: Guest (GUEST_UID)
0 APIs (todo local via localStorage; fases de bootstrapStatus en 'loaded')

### Escenario D: Bulk import (on-demand, never during load)
Excel/Cards import in create mode, YouTube deck import and every other multi-deck creation send ONE `bulkCreateList` request for the whole payload (previously N `createList` calls from a client-side loop, which hit the 20/min rate limit at 2000 cards). Guests: 0 APIs (chunking runs locally in `handleBulkCreateLists`). Edit-mode split stays a single `splitList` call.

### Nota: en desarrollo (React StrictMode) el montaje es doble y los efectos pueden duplicar cada llamada.

---

## Posibles causas de lentitud

1. 4 APIs paralelas sin secuenciacion — getLists, getProgress, getQuota, getSettings se disparan al mismo tiempo. Si uno es lento, el dashboard se retrasa.
2. updateList innecesario — Si el usuario va a /game, syncToCloud dispara getList + updateList aunque los datos no cambiaron.
3. getPrebuiltDecks bloquea onboarding — DeckStoreOnboarding muestra skeleton mientras espera respuesta.
4. getLists puede ser pesado — Si la lista tiene 60+ asociaciones, la respuesta es grande.
5. syncToCloud tiene doble llamado — Si la lista no existe en cloud, hace getList (null) + createList; si existe, hace getList + updateList.

---

## Codigo clave referenciado

| Archivo | Lineas | Descripcion |
|---------|--------|-------------|
| src/hooks/app/useAppBootstrap.ts | 62-64 | Disparador principal de carga inicial (solo loadInitialData) |
| src/store/gameStore.ts | 944-1043 | loadInitialData() — getLists primero, luego getQuota + getSettings en paralelo (allSettled) |
| src/store/gameStore.ts | 1045-1067 | retryBootstrapPart() — reintento individual por parte |
| src/store/gameStore.ts | 338-430 | Helpers setBootstrapPhase / fetchCloudListsForBootstrap / fetchQuotaForBootstrap / fetchSettingsForBootstrap |
| src/store/gameStore.ts | 44-67 | clearLocalCache() — borra listas + marcadores glimmind_last_cloud_fetch_<uid> |
| src/store/gameStore.ts | 117-127 | shouldFetchCloudLists() / markCloudFetch() — TTL por usuario |
| src/types/bootstrap-status.ts | 1-40 | LoadPhase, BootstrapPart, BootstrapStatus |
| src/store/gameStore.ts | 827-920 | syncToCloud() con getList + updateList |
| src/store/gameStore.ts | 433-461 | updateAssociations() que dispara syncToCloud |
| src/components/views/Dashboard.tsx | — | Spinner "Cargando mazos…", alerta de error con Reintentar, chips SyncChip, wiring QuotaAlert |
| src/components/layout/SyncChip.tsx | — | Chip generico loading/error/loaded por llamada |
| src/components/layout/QuotaAlert.tsx | — | Props loading / error / onRetry |
| src/components/views/dashboard/DashboardToolbar.tsx | — | Prop quotaLoading |
| src/services/firestoreService.ts | 6-30 | fetchListsByUser — propaga errores (no devuelve [] en fallo) |
| src/components/views/GameView.tsx | 38-461 | Componente game (dispara sync via hooks) |
| src/hooks/game/useGameViewEffects.ts | 178-182 | Efecto que dispara onUpdateAssociations al montar |
| src/hooks/game/useGameLogic.ts | 51-53 | Efecto que actualiza game engine con list prop |
| src/hooks/app/useAppHandlers.ts | 78-85 | handleUpdateAssociations |
| src/services/prebuiltDeckService.ts | 5-16 | Servicio de decks preconstruidos |
| src/components/onboarding/DeckStoreOnboarding.tsx | 41-58 | Efecto que dispara getPrebuiltDecks |
| src/hooks/app/useAppHandlers.ts | 268-357 | handleBulkCreateLists — one request for a whole import; guests chunk locally |
| src/hooks/dashboard/useListEditorActions.ts | 461-560 | importSelectedCards — create mode via onBulkCreate, edit mode via onSave/splitList |
| backend/src/functions/src/services/listService/crud.js | 142-193 | bulkCreateLists — chunked decks + cardCount in one transaction |

---

## Registro de Cambios (Change Log)

| Fecha | Cambio | Autor |
|-------|--------|-------|
| 2026-10-16 | Validacion de importacion async y chunked (sin cambio de APIs): handleBulkAdd ahora awaits a validateImportCards; similarity.ts usa Levenshtein de 2 filas + poda exacta por banda de longitud + early-abort con capa; el boton Process Import muestra "Validando... [X%]" y la pestana ya no se congela en importaciones masivas. categorizeDeckCards (DeckStoreOnboarding) aplica el mismo helper compartido. | Agent |
| 2026-09-17 | Creacion inicial del documento. Mapeo de APIs: getLists, getProgress, getQuota, getSettings, getPrebuiltDecks, getList, updateList. Identificacion de 6 APIs en escenario mas lento. | Agent |
| 2026-09-17 | Corregido createList 400: (1) definition cambiado de z.string() a z.union([z.string(), z.array(z.string())]) en CreateListSchema, UpdateListSchema, SplitListSchema y AiGroupSchema — el frontend envia definition como string[]; (2) flipOrder cambiado de z.boolean() a z.enum(["normal", "reversed"]) — el frontend envia flipOrder como string. | Agent |
| 2026-09-17 | Corregido appendActivity 400: schema AppendActivitySchema campo timestamp cambiado a at — el frontend y el servicio backend usan at como campo de timestamp. | Agent |
| 2026-09-17 | Corregido saveSession 400: schema SaveSessionSchema campos alineados con GameSessionSummary (startTime→startedAt, endTime→endedAt, cardsReviewed→cardsPlayed, correctCount→correct, incorrectCount→incorrect, añadidos id/listName/byLevel). | Agent |
| 2026-09-17 | Consolidado bootstrap: useAppBootstrap ahora llama solo loadDashboardData() para usuarios autenticados (elimina getLists redundante). Guests usan loadInitialData(). | Agent |
| 2026-09-17 | Lazy loading DeckStoreOnboarding: eliminado useEffect auto-fetch de getPrebuiltDecks. Ahora se dispara al click en Explorar Catálogo. Guard hasFetchedRef contra StrictMode. | Agent |
| 2026-09-17 | Guarda en useGameViewEffects: agregado hasSyncedRef + loadedAssociationsRef para evitar onUpdateAssociations en primer renderizado y solo disparar ante cambios reales. | Agent |
| 2026-09-17 | Guarda en handleUpdateAssociations: agregada comparación JSON de asociaciones para evitar syncToCloud innecesario cuando no hay cambios. | Agent |
| 2026-09-17 | Fix spinner pegado: loadDashboardData ahora setea isLoaded=true antes de la llamada async (el spinner depende de isLoaded). | Agent |
| 2026-09-17 | Fix createList en blur: wrappedOnSave en ListEditor ahora es no-op en create mode. onCreateList solo se dispara desde handleSaveClick (Guardar mazo). | Agent |
| 2026-09-17 | Fix toasts duplicados: "Lista guardada" movido de cleanupAndSave a handleSave en useListEditorActions. Ya no aparece al perder el foco, solo al Guardar mazo (1 toast). | Agent |
| 2026-09-17 | Fix syncToCloud en create mode: handleUpdateAssociations ahora retorna si createModeList está seteado. Previene getList+appendActivity+updateList al perder foco en editor sin guardar. | Agent |
| 2026-09-17 | Quitado onBlurRow de ListEditor: ya no guarda ni normaliza al perder el foco. Solo Guardar mazo guarda. | Agent |
| 2026-09-23 | Agregada función `auditAndReconcile` en gameStore para comparar local vs cloud bajo demanda. Expuesta en `window.__GLIMMIND_AUDIT__(listId?)`. Incluye filtro opcional por listId y comparación de history.completedAt. No afecta APIs de carga de dashboard. | Agent |
| 2026-10-09 | Fix eliminacion de mazo en modo invitado: `handleDeleteList` ahora tiene rama `user.uid === GUEST_UID` que elimina solo en localStorage (`glimmind_lists` via `setLists`) sin invocar la Cloud Function `deleteList`. Antes disparaba `callFunction('deleteList')` sin token, recibia 401 "Unauthorized" y el mazo NO se eliminaba localmente (el `setLists(filter)` estaba dentro del `try` despues del await, unreachable al fallar). Extraido helper `removeListFromLocalStore` para eliminar la duplicacion de la expresion `setLists(filter)`. No afecta la carga de dashboard: `deleteList` no se dispara en bootstrap. | Agent |
| 2026-10-09 | Feature flag `reports: false` en `src/constants/featureFlags.ts` oculta Reportes para todos: ruta `/reports` redirige a `/dashboard`, Navbar (desktop) filtra el item y AppHeader (mobile) no lo renderiza. `ReportsView.tsx`, `utils/ranking.ts` y sus tests se conservan intactos para retomar el trabajo diferido (`docs/plans/2026-10-09-complete-reports-view.md`). Corregido copy de `SettingsView` que prometia "Resumen de juegos y Ranking estarán disponibles" cuando no existian para ningun usuario. No cambia APIs de carga de dashboard. | Agent |
| 2026-10-09 | Guest AI generation: `youtubeDeckService.createVocabularyDeck` y `createDeckFromText` ahora lanzan `GuestFeatureRequiredError` (mensaje pide crear usuario) sin llamar `callFunction` cuando `user.uid === GUEST_UID`. Antes enviaban la peticion sin token, recibian 401 "Unauthorized" crudo y el modal lo renderizaba sin contexto. A diferencia de los fixes CRUD previos, aqui NO hay fallback local posible: la generacion requiere GEMINI_API_KEY y descarga de subtitulos, ambos server-side. `CreateYouTubeDeckModal` y `TextImporter` muestran aviso proactively y bloquean el submit para guests. No agrega APIs a la carga de dashboard. | Agent |
| 2026-10-09 | Guest card mutations (no new dashboard APIs): (A) `handleUpdateList` tiene rama `GUEST_UID` que guarda via `setLists` sin llamar `listService.updateList` — antes `getList` fallaba 401, devolvia null, lanzaba `ListNotFoundError` y el `setLists` nunca corria, perdiendo el cambio del nombre del mazo en guest; (B) `addPendingDelta` ahora es no-op para guests y `loadInitialData` solo rehidrata `glimmind_pending_deltas` para cuentas reales — evita crecimiento indefinido del storage local en guest; (C) `handleUpdateAssociations` detecta borrados comparando `prevMap.size` con la longitud nueva — antes `.some()` era unidireccional y descartaba silenciosamente el borrado de una carta si nada mas cambiaba (afectaba a usuarios autenticados tambien); (D) `usePeriodicSync` comparaba contra `'guest'` en vez de `GUEST_UID` (guarda muerta, hook no importado en ningun sitio) y ahora deriva el tier real desde quota; (E) `handleBlurRow` envuelve el `await pendingSaveRef.current` en try/catch para evitar rechazos no manejados. | Agent |
| 2026-10-09 | Restaurado el checkout Premium (`docs/plans/2026-10-09-restore-premium-checkout.md`). **APIs nuevas disparadas desde `/settings`, no desde la carga de dashboard:** `createCheckoutSession` y `createBillingPortalSession` (vía `stripeService`, antes sin callers desde `b8d08d8`). El tier sigue leyéndose por `getQuota`, que ya estaba en el bootstrap. Correcciones backend: `createCheckoutSession` ahora escribe `firebaseUid` en la metadata **de la sesión** (Stripe no propaga `subscription_data.metadata` a `session.metadata`, así que el handler hacia `return` y nunca otorgaba Premium pese a cobrarse el pago) y atiende `customer.subscription.created`; `updateSubscriptionStatus` sincroniza `cardQuota`/`aiQuotaDaily` con el tier (antes `getQuota` devolvía `tier: 'premium'` con cuotas free); `STRIPE_PRICE_ID` pasó a secret de GCP con fallback al literal anterior; `createCheckoutSession` tiene rate limit propio de 5/min. Frontend: `LandingPage` ("Probar Premium") apunta a `/login?next=/settings`, la ruta `/login` honra `?next=` validado contra open redirect (`src/utils/redirect.ts`), y `SettingsView` muestra el plan actual con su CTA. Al volver de Stripe, `?upgrade=success\|canceled` dispara `getQuota` una sola vez y muestra el toast correspondiente. **Invitados no pueden comprar:** el botón queda habilitado pero explica que inicie sesión, sin invocar ninguna Cloud Function. | Agent |

| 2026-10-11 | Stripe fijado **exclusivamente en modo sandbox (test)**. Nuevo modulo `backend/src/functions/src/utils/stripeConfig.js` como unica fuente de verdad: valida que `STRIPE_SECRET_KEY` empiece por `sk_test_` y lanza excepcion ante `sk_live_`/`rk_live_`, valida que `STRIPE_WEBHOOK_SECRET` empiece por `whsec_` (y rechaza el placeholder mientras `stripe listen` no se haya corrido), valida el prefijo `price_` de `STRIPE_PRICE_ID` y cachea una unica instancia de `Stripe` con `apiVersion` fijo. `stripeService.js` delega el cliente a ese modulo. `stripeRoutes.js` elimina la **segunda** instancia `new Stripe(process.env.STRIPE_SECRET_KEY)` que construlia aparte para el webhook, y la confguracion incorrecta (secret ausente, clave live, `whsec_` placeholder) ahora responde **500** en vez de 400, porque la peticion es valida y las credenciales no. **Eliminado `FALLBACK_PRICE_ID = price_1UOKzMCCE67J3dcOBzkWLf18`**: un price ID hardcodeado no puede verificarse como modo test y era el unico camino restante hacia la API de produccion — sin el, `createCheckoutSession` falla de forma explicita si falta el secret. Sustituido el `STRIPE_SECRET_KEY=sk_live_...` que vivia en `backend/src/functions/.env` por la clave `sk_test_` del sandbox. Nuevos `.env.example` (raiz y functions) y `VITE_STRIPE_PUBLISHABLE_KEY` declarada en `src/vite-env.d.ts`; el flujo actual usa Checkout alojado por redirect, por lo que no se instalo `@stripe/stripe-js`. Sin cambios en el **set de APIs** disparadas: los mismos cuatro endpoints. | Agent |
| 2026-10-11 | **Aislamiento real del sandbox.** El guard de `stripeConfig.js` no bastaba: el Functions emulator resuelve los secretos declarados en `onRequest({ secrets: [...] })` desde **GCP Secret Manager**, no desde `.env` (`functionsEmulator.js:1048` filtra por `!secretEnvs[s.key]`). Secret Manager del proyecto `fladycard-22a3e` tenia `STRIPE_SECRET_KEY=sk_live_51NQxi...` y `STRIPE_PRICE_ID=price_1UOKzMCCE67J3dcOBzkWLf18` (`livemode: true`, 499 EUR/mes), ambos de la **cuenta live**: el emulador local autenticaba contra produccion y cobraba de verdad. Se elimino la declaracion `secrets: [...]` de los tres `onRequest` de Stripe, de modo que `backend/src/functions/.env` queda como unica fuente y el emulator nunca consulta Secret Manager (si no hay secretos declarados no hay nada que ir a buscar a GCP). Unica excepcion que documenta el costo: una funcion desplegada ya no recibe estos valores de Secret Manager; si el billing pasa a live hay que redeclararlos y reincorporar `.secret.local` en el mismo cambio. Verificado: el worker del emulator recibe `sk_test_`/`whsec_e2ea6919`/`price_1UPLfrC1GrRMJ6MV0i1TXmvw` desde `.env` y el log NO muestra `Trying to access secret`. **Sin cambios en el set de APIs.** | Agent |
| 2026-10-11 | **Fix del puerto de Firestore en el Functions emulator.** `backend/src/functions/src/utils/firebase.js` forceaba `FIRESTORE_EMULATOR_HOST = localhost:8080`, valor obsoleto que sobrevivio a la migracion de puertos del 2026-10-02 (glimmind: Firestore 8080 -> 9080, ver `docs/emulator-port-migration.md`). Como `firebase.json` ya inyecta el valor correcto en `emulators.functions.env`, el hardcode lo sobreescribia y **todas las funciones escribian en el Firestore emulator de otro proyecto** (tabito-revamped, que escucha en 8080), sin error visible porque ese puerto si existia. Sintoma: `stripeWebhook` respondia 200 y actualizaba `tier: premium`, pero `users/{uid}/meta/main` en el Firestore de glimmind nunca existia y la UI seguia mostrando plan gratuito. Ahora `firebase.js` solo define el host si nadie mas lo hizo, con el puerto 9080 de `firebase.json`; `scripts/seed-emulator.ts` tambien corregido (8080 -> 9080). Verificado con evento real: `tier: premium`, `cardQuota: 5000`, `aiQuotaDaily: 1000`. Documentado ademas que `stripe listen` debe apuntar a **9001** (no 5001) y llevar `--events`. | Agent |
| 2026-10-11 | **Premium pasa de suscripción mensual a pago único de 4,99 €** (`docs/plans/2026-10-11-lifetime-payment.md`). `createCheckoutSession` ahora usa `mode: 'payment'`; se eliminaron `subscription_data` y `allow_promotion_codes` (parámetros exclusivos de suscripción) y se agregó `payment_intent_data.metadata.firebaseUid`. El webhook atiende `checkout.session.completed` (solo si `payment_status === 'paid'`), `payment_intent.succeeded` como ruta redundante, y `charge.refunded` que **revoca** el premium y vuelve a free; se eliminaron los tres casos `customer.subscription.*` que nunca dispararán. **Guard anti doble compra:** `createCheckoutSession` devuelve 400 con código `ALREADY_PREMIUM` antes de tocar Stripe si `meta.tier === 'premium'`. Se borraron `createBillingPortalSession` y `getSubscriptionStatus` (ambos código muerto, 0 call sites) junto con sus rewrites en `firebase.json`; el Billing Portal no aplica a un pago único. Ya no se escriben `stripeSubscriptionId/Status`, `stripePriceId` ni `stripeCurrentPeriodEnd`; ahora `premiumActivatedAt` y `stripePaymentIntentId`. **Planes configurables:** los límites viven en `backend/src/functions/src/config/plans.json` (canónico) con espejo en `src/config/plans.json`, y `utils/quotaConfig.js` los lee; `tests/config/plansDrift.test.ts` falla si divergen. **Frontend:** se quitó el botón "Gestionar suscripción" (premium ve solo texto) y se arregló una carrera: `SettingsView` consultaba `getQuota` una sola vez al volver de Stripe, antes de que llegara el webhook, y por eso mostraba "Plan gratuito" con el pago hecho; ahora hace polling cada 1,5s hasta que el tier cambia, con tope de 15s y toast de éxito solo al confirmar. **APIs disparadas sin cambios:** las mismas dos, `createCheckoutSession` y `stripeWebhook`. | Agent |
| 2026-10-11 | **Fix de clientes Stripe huerfanos al cambiar de cuenta.** `No such customer: cus_...` (500) en `createCheckoutSession`: al pasar de claves live a sandbox, cada `stripeCustomerId` ya guardado en Firestore apuntaba a la otra cuenta y `getOrCreateStripeCustomer` lo devolvia sin comprobar. Ahora recupera el cliente primero y solo descarta ante `resource_missing`; los demas errores (auth, red) se propagan para que una API key mala no rote ids en silencio. `resolveUidForCharge` omite un cliente irresoluble en vez de fallar todo el lote. **Sin cambios en el set de APIs.** | Agent |
| 2026-10-13 | **Fix "mazos no cargan al actualizar el dashboard" + visibilidad por llamada.** (F1) `loadInitialData` ya no ejecuta la rama guest/local cuando `user` todavia es `null` (antes escribia `[]` sobre `glimmind_lists` del usuario real y sellaba el TTL, dejando el dashboard vacio con onboarding); (F1b) cache local vacio (`[]`) fuerza `getLists` aunque el TTL este fresco; (F2) `fetchListsByUser` propaga errores (antes devolvia `[]` y sellaba el TTL en un fallo de red); (F3) `clearLocalCache` borra tambien `glimmind_last_cloud_fetch_<uid>`; (orden) getLists se invoca primero y getQuota + getSettings corren en paralelo con `Promise.allSettled` (antes getQuota/getSettings solo se pedian dentro de la rama de nube y tras esperar getLists); (UI) nuevo `bootstrapStatus` con spinner por parte: "Cargando mazos…" y alerta con Reintentar si getLists falla sin cache, chips `SyncChip` (mazos/ajustes/sincronizacion), QuotaAlert con loading/error/Reintentar y chip en DashboardToolbar; (reintento) `retryBootstrapPart(part)` reejecuta una sola llamada. **Set de APIs:** para usuarios reales, 2 siempre (getQuota, getSettings) y 3 si hay que refrescar mazos (getLists); 0 para guests; el progreso sigue viniendo de localStorage (sin getProgress). Correccion: las entradas previas del 2026-09-17 que mencionan `loadDashboardData()`/`getProgress` describian un plan que nunca se implemento en ese momento; el flujo real siempre fue `loadInitialData` unico. Tests: `tests/store/bootstrapLoad.test.ts`, `tests/services/fetchListsByUser.test.ts`, `tests/components/Dashboard.bootstrap.test.tsx`. | Agent |
| 2026-10-11 | **Stripe pasa a modo LIVE.** Se creo el endpoint live `we_1UPTmjCCE67J3dcOOOaxqsGb` contra `https://us-central1-fladycard-22a3e.cloudfunctions.net/stripeWebhook` (eventos `checkout.session.completed`, `payment_intent.succeeded`, `charge.refunded`) y se rotaron `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID` y `STRIPE_WEBHOOK_SECRET` a valores reales. `stripeConfig.js` ya no rechaza `sk_live_`/`rk_live_`; en su lugar detecta dos confusiones: **clave live + precio de test** (los precios son por cuenta y fallan con "No such price") y **clave live dentro del Functions emulator** (el emulator resuelve los secretos desde Secret Manager, asi que una tarjeta real escrita en localhost cobraria de verdad). `STRIPE_ALLOW_LIVE_IN_EMULATOR=true` permite ensayar el flujo live localmente a proposito. En la cuenta live se creo el precio one-time `price_1UPTTHCCE67J3dcORO2Z1VYw` (499 EUR) y se desactivo el recurrente `price_1UOKzMCCE67J3dcOBzkWLf18`, que ya no era compatible con `mode: 'payment'`. Documentado en `docs/plans/2026-10-11-stripe-sandbox-to-live.md`. **Sin cambios en el set de APIs.** | Agent |
| 2026-10-13 | **Rate limit on the two AI deck routes** (`docs/issues/done/2026-10-12-rutas-ia-sin-rate-limit.md`). `createYouTubeDeck` and `createDeckFromText` are now wrapped with `applyRateLimit("aiGroup", handler)`, the tier that already existed at 10 requests/minute and had no references. The helper moved from eight local copies into `backend/src/functions/src/utils/rateLimit.js` so new routes import it. **No change to the set of APIs** and no change to the dashboard/game load flow: these two are called on demand from `CreateYouTubeDeckModal`, never during bootstrap, and they now answer HTTP 429 with `X-RateLimit-*` headers past the tier instead of starting a Gemini call. Verified with `scripts/repro-p0-ai-rate-limit.sh`. Counters remain per function instance, filed as `docs/issues/P2/2026-10-13-rate-limit-por-instancia.md`. | Agent |
| 2026-10-14 | **Premium voice gating** (`docs/plans/2026-10-14-premium-voice-gating.md`, resuelve `docs/issues/P1/2026-10-11-huecos-de-gating-premium.md`). En el juego, `GameView` ahora pasa `audioRecordingEnabled && isPremium` a `useGameVoice` (antes el toggle de Settings activaba la subida a Storage para cuentas free) y resuelve los proveedores de voz con `resolveEffectiveVoiceProviders` (`chirp`/`chiptt` -> `browser` cuando el tier no es premium, invitados incluidos). `SettingsModal.normalizeVoiceSettings` exige tier y coerciona providers guardados; `VoiceSection` oculta las opciones `chirp`/`chiptt` a free; `SettingsView` deshabilita el toggle de grabacion con toast `PREMIUM_TOAST_RECORDING_REQUIRED`. Backend: `userTtsLimit`/`userSttLimit` devuelven 0 para free (Rule 0), el contador user devuelve codigo `TIER_REQUIRED` y `synthesizeSpeech` + los tres `transcribe*` responden HTTP 403 en lugar de reservar cuota. **Sin cambios en el set de APIs de carga de dashboard/juego** (getQuota, getSettings, getLists sin variacion); `synthesizeSpeech`/`transcribeSpeech` siguen siendo on-demand y ahora pueden responder 403 a free. Tests: `tests/services/meteredQuota.test.ts`, `src/services/voice/effectiveProviders.test.ts`, `tests/components/SettingsView.test.tsx`, `tests/components/modals/settings/`. | Agent |
| 2026-10-14 | **Fix `updateListFields` 400 Invalid request body en cada carga** (`docs/issues/done/2026-10-13-updatelistfields-400-invalid-body.md`). Los deltas pendientes fallaban la validacion zod del servidor (`baseUpdatedAt`/`updatedAt` enteros, `currentCycle >= 1`, `deltas <= 500`), por lo que nunca se confirmaban y se reenviaban en cada carga. Ahora `gameStore.flushSync` sanitiza el payload antes de enviar (`sanitizeDeltas` + `toEpochMs` en `src/utils/syncDelta.ts`): timestamps string/float coercidos a enteros, `currentCycle` recortado a >= 1, deltas sin `id` descartados y limpiados del buffer, y lotes partidos en maximo 500 (el cap del schema). `callFunction` ahora conserva los `fieldErrors` del 400 y `listService.updateListFields` los loguea junto al listId, asi el campo que falla deja de ser invisible. **Sin cambios en el set de APIs de carga**: sigue siendo el mismo `updateListFields`, invocado on-demand desde el sync; el cambio evita las invocaciones fallidas repetidas por carga. Tests: `tests/utils/syncDelta.test.ts`, `tests/store/flushSync.test.ts`, `tests/services/listService.updateListFields.test.ts`. | Agent |
| 2026-10-15 | **Fix P0: `updateListFields` corrompia `associations` de array a map** (`docs/issues/done/2026-10-15-updateListFields-corrompe-associations.md`). La CF escribia deltas como updates punteados `associations.<uuid>.<campo>`; con claves no numericas Firestore reemplazaba el array entero por un map y destruia `term`/`definition` (7 mazos y 652 cartas afectados en produccion, ultimo write 2026-09-25). Ahora `updateListFields` (`backend/.../crud.js`) lee el doc dentro de la transaccion, normaliza `associations` a array (los maps legacy se reconstruyen como `{ id: clave, ...valor }`), aplica los deltas en memoria via la utilidad pura `backend/.../utils/associationDeltas.js` y escribe el array completo. **Cliente:** `flattenList` (`src/store/gameStore.ts`) ya no marca como `changed` el fallback `[]` de un mazo corrupto (antes disparaba `syncToCloud` desde `fetchCloudListsForBootstrap`/`syncFromCloud` y podia empujar el vacio a la nube); `cleanupAndSave` (`src/hooks/dashboard/useListEditorActions.ts`) rechaza un guardado que dejaria el mazo en 0 tarjetas salvo borrado explicito (`allowEmpty` en `handleRemoveRow`/`handleDeleteSelected`). **Sin cambios en el set de APIs de carga de dashboard/juego** (getLists, getQuota, getSettings intactos); `updateListFields` sigue siendo on-demand desde el sync pero ahora responde siempre preservando el array. Reproduccion y regresion: `scripts/repro-p0-updateListFields-corruption.mjs` (emuladores; antes `RESULT: BUG` exit 1, ahora `RESULT: OK` exit 0). Tests: `backend/src/functions/tests/associationDeltas.test.js` (nuevo runner `vitest.backend.config.ts`), `tests/store/gameStore.flattening.test.ts`. | Agent |
| 2026-10-15 | **Fix `splitList` perdia el grupo 1, `cardCount` contaba 0 en mazos corruptos, y `updateList` silenciaba errores** (`docs/issues/done/2026-10-15-splitlist-borra-mazo-original.md`, `docs/issues/done/2026-10-15-cardcount-cero-con-associations-malformado.md`, `docs/issues/done/2026-10-15-updatelist-silencia-error-en-nube.md`). (a) `divideOriginalListIntoGroupsAndReplaceIt` ya **no borra** el mazo original: `groups[0]` lo reemplaza in place y los demas grupos se crean como mazos nuevos (antes el `tx.delete` perdia las 100 primeras cartas de cada import multi-mazo). (b) El cliente (`useListEditorActions.importSelectedCards`) ya no pre-guarda ni sondea el id: manda los grupos completos con `editList.id`; `handleCreateMultipleLists` (`useAppHandlers.ts`) refresca el cache local desde la nube tras el split (un merge prefer-local resucitaria las cartas que salieron del original). (c) `getOrCreateMeta` (`helpers.js`) suma tambien decks con `associations` en forma de map via `normalizeAssociationsToList`. (d) `firestoreService.updateList` vuelve a propagar errores (antes el catch silenciado mostraba "Lista guardada" tras un write fallido; guests nunca llegan aca y los dos callers ya manejaban el fallo). **Set de APIs:** sin altas ni bajas; `splitList` responde ahora con `[originalId, ...nuevosIds]`, y el refresh post-split agrega una llamada on-demand a `getLists` (solo al dividir mazos). Verificado en emulador: split 250 -> 100/100/50 conserva las 250 cartas y `cardCount=250`. Tests: `tests/services/cardCeiling.test.ts`, `backend/src/functions/tests/cardCountRebuild.test.js`. | Agent |
| 2026-10-15 | **Single bulk import replaces the client-side `createList` loop** (`docs/issues/P1/2026-10-15-import-premium-3000-corta-en-2000.md`). New Cloud Function `bulkCreateList` (`backend/src/functions/src/routes/listRoutes.js`, `crud.js#bulkCreateLists`, rewrite `/api/bulkCreateList` in `firebase.json`, rate limit 10/min): the whole import payload (max 5000 cards, chunked server-side by `cardsPerDeck` 100-1000) is written in ONE transaction — every deck plus the `cardCount` increment — with the quota re-checked inside the transaction (atomic: all decks or none). Client: `useListEditorActions.importSelectedCards` (create mode), the YouTube deck loop in `App.tsx` and guests all route through `handleBulkCreateLists`; `createList` stays untouched at 20/min. Also fixes `QuotaExceededError` not being imported in `listRoutes.js` (quota rejections returned 500 instead of 400) and the old multi-deck create path dropping `editList.associations`. **API set:** +1 on-demand function (`bulkCreateList`), never triggered during dashboard/game load; the N `createList` calls of a multi-deck import disappear (the 2000-card premium ceiling was 20 decks x 100 cards hitting HTTP 429). Tests: `tests/hooks/bulkImport.test.tsx`, `backend/src/functions/tests/bulkCreateLists.test.js`. | Agent |
---

## Plan de Optimizacion — Opcion 1: Endpoint Agregado

### Concepto

Reemplazar las 4 llamadas individuales (getLists, getProgress, getQuota, getSettings) por una sola llamada a un nuevo endpoint getDashboardData que devuelva todo junto.

Escenarios actualizados:

| Escenario | Antes | Despues |
|-----------|-------|---------|
| Dashboard (usuario existente) | 4 APIs | 1 API |
| Dashboard + /game auto | 6 APIs | 3 APIs |
| Dashboard (usuario nuevo) | 5 APIs | 2 APIs |

### Backend: Nueva Cloud Function getDashboardData

Ubicacion: backend/src/functions/src/routes/dashboardRoutes.js (nuevo archivo)

Requisitos:
- Recibe userId en el body
- Retorna { lists, progress, quota, settings } en paralelo (Promise.allSettled)
- Respuesta parcial: si una fuente falla, devolver las otras con indicador de error
- Respeta rate limiting existente (applyRateLimit("default"))

Esquema de implementacion:
  exports.getDashboardData = onRequest({ cors: true }, applyRateLimit("default"), async (req, res) => {
    const body = runValidation(req, res, GetDashboardDataSchema);
    if (!body) return;
    const { userId } = body;
    const uid = await requireAuth(req, res, userId);
    if (!uid) return;
    const [lists, progress, quota, settings] = await Promise.allSettled([
      listService.fetchListsByUser(uid),
      progressService.fetchProgress(uid),
      quotaService.fetchQuota(uid),
      settingsService.fetchSettings(uid),
    ]);
    res.json({
      lists: lists.status === 'fulfilled' ? lists.value : [],
      progress: progress.status === 'fulfilled' ? progress.value : null,
      quota: quota.status === 'fulfilled' ? quota.value : null,
      settings: settings.status === 'fulfilled' ? settings.value : null,
      errors: {
        progress: progress.status === 'rejected' ? String(progress.reason) : undefined,
        quota: quota.status === 'rejected' ? String(quota.reason) : undefined,
        settings: settings.status === 'rejected' ? String(settings.reason) : undefined,
      },
    });
  });

Esquema de validacion (validation.js):
  const GetDashboardDataSchema = z.object({ userId: z.string().min(1) });

Registro en backend/src/functions/index.js:
  const dashboardRoutes = require("./src/routes/dashboardRoutes");
  loadRoutes(dashboardRoutes);

Firebase Hosting rewrite (firebase.json):
  { "source": "/api/getDashboardData", "function": "getDashboardData" }

### Frontend: Reemplazo de las 4 llamadas individuales

1. Nuevo servicio (src/services/dashboardService.ts — nuevo):
  dashboardService.fetchDashboardData(userId) -> callFunction<DashboardData>('getDashboardData', { userId })

2. Actualizar gameStore.ts:
  - Crear loadDashboardData() que llama a dashboardService.fetchDashboardData(user.uid)
  - Distribuir resultados: setLists(), setProgress(), setQuota(), setSettings()
  - Mantener patron de cache TTL por campo

3. Actualizar useAppBootstrap.ts:
  - Fase 1: loadInitialData() -> sigue cargando lists con TTL cache local
  - Fase 2: loadDashboardData() -> 1 sola llamada en vez de 4

### Complementarios (no bloqueantes, implementar despues)

C1: Lazy loading de getPrebuiltDecks
- Quitar useEffect de fetchDecks en DeckStoreOnboarding.tsx:41-58
- Disparar solo al click en "Catalogo de Barajas"

C2: Guarda en useGameViewEffects:178-182
- Agregar lastSyncedAssociationsRef para evitar onUpdateAssociations en montaje sin cambios

### Orden de implementacion

1. Crear backend/src/functions/src/routes/dashboardRoutes.js
2. Agregar GetDashboardDataSchema en validation.js
3. Registrar en backend/src/functions/index.js
4. Agregar rewrite en firebase.json
5. Crear src/services/dashboardService.ts
6. Actualizar src/store/gameStore.ts — agregar loadDashboardData()
7. Actualizar src/hooks/app/useAppBootstrap.ts — Fase 2 -> loadDashboardData
8. Desplegar backend
9. Desplegar frontend
10. Verificar: npx tsc --noEmit + tests
11. Implementar C1: Lazy loading getPrebuiltDecks
12. Implementar C2: Guarda en useGameViewEffects
13. Medir rendimiento post-optimizacion

---

## Proximos pasos

- [x] Documentar analisis de APIs
- [x] Definir plan de optimizacion (Opcion 1)
- [ ] Aprobar plan
- [ ] Backend: dashboardRoutes.js + validacion + register
- [ ] Frontend: dashboardService.ts + loadDashboardData en store
- [ ] Actualizar useAppBootstrap.ts y firebase.json
- [ ] Desplegar backend + frontend
- [ ] Verificar (tsc + tests)
- [ ] Implementar C1: Lazy loading getPrebuiltDecks
- [ ] Implementar C2: Guarda en useGameViewEffects
- [ ] Medir rendimiento post-optimizacion
