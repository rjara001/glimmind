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

### Fase 2: APIs disparadas simultáneamente (Effect 2)

Para usuario autenticado, 4 APIs se disparan en paralelo cuando se detecta el usuario:

| # | Funcion | API | Objetivo |
|---|---------|-----|----------|
| 1 | loadInitialData() | getLists | Cargar todas las listas del usuario desde la nube (o cache local si esta dentro del TTL) |
| 2 | loadProgress() | getProgress | Cargar progreso del usuario (repasos realizados, niveles, streak) |
| 3 | loadQuota() | getQuota | Cargar cuota del usuario (tier, tarjetas usadas, limites) |
| 4 | loadSettings() | getSettings | Cargar configuracion del usuario (modo, idioma voz, etc.) |

Ubicacion en codigo:
- loadInitialData -> src/store/gameStore.ts:703
- loadProgress -> src/store/gameStore.ts:531
- loadQuota -> src/store/gameStore.ts:552
- loadSettings -> src/store/gameStore.ts:561
- Disparadas desde -> src/hooks/app/useAppBootstrap.ts:45-50

Objetivo de cada una:
- getLists -> Poblar la grilla de listas del dashboard
- getProgress -> Mostrar meta diaria, progreso, streak en GoalWidget
- getQuota -> Mostrar alertas de limite en QuotaAlert, habilitar/deshabilitar crear listas
- getSettings -> Configurar preferencias de UI (modo, idioma, etc.)

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

### Escenario A: Usuario con listas existentes (ve dashboard) - ACTUAL
getLists + getProgress + getQuota + getSettings = 4 APIs paralelas

### Escenario A: Usuario con listas existentes (ve dashboard) - DESPUES
getDashboardData = 1 API

### Escenario B: Usuario con listas existentes + auto-navigacion a /game - ACTUAL
getLists + getProgress + getQuota + getSettings + getList + updateList = 6 APIs

### Escenario B: Usuario con listas existentes + auto-navigacion a /game - DESPUES
getDashboardData + getList + updateList = 3 APIs

### Escenario C: Usuario nuevo (primera vez, ve dashboard) - ACTUAL
getLists + getProgress + getQuota + getSettings + getPrebuiltDecks = 5 APIs

### Escenario C: Usuario nuevo (primera vez, ve dashboard) - DESPUES
getDashboardData + getPrebuiltDecks = 2 APIs

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
| src/hooks/app/useAppBootstrap.ts | 45-63 | Disparador principal de carga inicial |
| src/store/gameStore.ts | 703-782 | loadInitialData() con getLists + cache logic |
| src/store/gameStore.ts | 531-550 | loadProgress() |
| src/store/gameStore.ts | 552-559 | loadQuota() |
| src/store/gameStore.ts | 561-575 | loadSettings() |
| src/store/gameStore.ts | 827-920 | syncToCloud() con getList + updateList |
| src/store/gameStore.ts | 433-461 | updateAssociations() que dispara syncToCloud |
| src/components/views/Dashboard.tsx | 27-275 | Componente dashboard (sin APIs propias) |
| src/components/views/GameView.tsx | 38-461 | Componente game (dispara sync via hooks) |
| src/hooks/game/useGameViewEffects.ts | 178-182 | Efecto que dispara onUpdateAssociations al montar |
| src/hooks/game/useGameLogic.ts | 51-53 | Efecto que actualiza game engine con list prop |
| src/hooks/app/useAppHandlers.ts | 78-85 | handleUpdateAssociations |
| src/services/firestoreService.ts | 4-50 | Servicio de listas (lista de APIs) |
| src/services/prebuiltDeckService.ts | 5-16 | Servicio de decks preconstruidos |
| src/components/onboarding/DeckStoreOnboarding.tsx | 41-58 | Efecto que dispara getPrebuiltDecks |

---

## Registro de Cambios (Change Log)

| Fecha | Cambio | Autor |
|-------|--------|-------|
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
