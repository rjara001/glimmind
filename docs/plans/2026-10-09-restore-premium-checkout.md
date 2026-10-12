# Plan: Restore Premium Checkout ("Probar Premium")

**Fecha:** 2026-10-09
**Autor:** Agent
**Estado:** En ejecución

---

## 1. Diagnóstico

El botón "Probar Premium" de la landing page no hace nada. No es un bug de dos líneas:
el cableado frontend de Stripe fue eliminado a propósito y nunca se restauró.

### 1.1 El botón es un stub

`src/components/views/LandingPage.tsx:10`

```tsx
const onUpgrade = () => navigate('/login');   // idéntico a onStart
```

Cadena completa de un click:

```
button onClick (LandingPage.tsx:235)
  └─> onUpgrade (LandingPage.tsx:10)
        └─> navigate('/login')
              └─> App.tsx:296 <Auth />
```

Sin llamada a servicio, sin `callFunction`, sin Stripe.

### 1.2 El servicio existe pero no tiene callers

`src/services/stripe.ts` (42 líneas) está completo y tiene **cero importadores**.
Verificado: `grep -rn "from ['\"].*stripe" src/ tests/` → 0 resultados.

Commit `b8d08d8` ("refactor: remove Premium section from SettingsView") lo dejó así,
con esta nota explícita en el mensaje:

> SettingsView was the only caller of stripeService in src/, so the service now has
> no callers. It is left intact along with the backend Cloud Functions
> (createCheckoutSession, createBillingPortalSession, stripeWebhook), which stay
> deployed and functional, so the UI can be restored later without backend work.

Esa premisa es incorrecta: el backend **no** está funcional. Ver 1.3.

### 1.3 Tres bugs en el backend ya desplegado

Estado verificado con `firebase functions:list --json`: `createCheckoutSession`,
`stripeWebhook`, `createBillingPortalSession` y `getSubscriptionStatus` están
todos `ACTIVE`. Los secrets existen en Secret Manager (`STRIPE_SECRET_KEY`,
`STRIPE_WEBHOOK_SECRET`).

**Bug 1 — el webhook nunca otorga Premium (crítico).**

`backend/src/functions/src/services/stripeService.js:44` escribe la metadata en
`subscription_data`:

```js
subscription_data: {
  metadata: { firebaseUid: uid }
},
```

pero `stripeService.js:60` la lee de la sesión:

```js
const uid = session.metadata?.firebaseUid;   // siempre undefined
if (!uid) return;                            // → return temprano
```

Stripe no propaga `subscription_data.metadata` a `session.metadata`. Son campos
independientes. El handler de `checkout.session.completed` siempre hace return.

Además el switch solo maneja `customer.subscription.updated` y
`customer.subscription.deleted`. **No maneja `customer.subscription.created`**,
que es el evento que Stripe emite al crear la suscripción.

Resultado: **se cobra el pago y el usuario permanece en free.**

**Bug 2 — `updateSubscriptionStatus` no actualiza las cuotas.**

`stripeService.js:88-95` escribe `tier` pero deja `cardQuota` y `aiQuotaDaily`
en sus valores free. `getQuota` (`userService.js:22`) devuelve entonces
`{ tier: 'premium', cardQuota: 1000, aiQuotaDaily: 100 }`.

**Bug 3 — `PRICE_ID` hardcodeado.**

`stripeRoutes.js:18`. No hay override por env, así que no se puede cambiar
test↔live sin redeploy.

### 1.4 Bug adicional

`stripeService.js:99-101` — `createBillingPortalSession` hace
`const meta = snap.data()` sin guard. Si el doc `users/{uid}/meta/main` no
existe, `snap.data()` es `undefined` y `meta.stripeCustomerId` truena con
`TypeError` en vez del `throw 'No Stripe customer'` previsto.

### 1.5 Restricción de diseño: la landing no puede comprar

`App.tsx:291` solo renderiza `LandingPage` cuando no hay usuario. El checkout
exige un ID token válido (`createCheckoutSession` → `requireAuth` →
`helpers.js:80` `verifyIdToken`). Por lo tanto el CTA de compra real **no puede
vivir en la landing**.

Flujo elegido: `LandingPage` → `/login?next=/settings` → `App.tsx` redirige a
`/settings` tras autenticar → la sección Premium en `SettingsView` inicia el
checkout. Un solo punto de compra.

### 1.6 El retorno de Stripe no se maneja

El código original usaba `/settings?upgrade=success`. `grep -rn "upgrade=" src/`
→ 0 resultados. Nadie lee ese param: el usuario vuelve de Stripe sin
refrescar quota ni ver confirmación.

---

## 2. Fase 1 — Backend

Bloqueante. Sin esto el flujo cobraría sin entregar.

### 2.1 `backend/src/functions/src/services/stripeService.js`

| Cambio | Motivo |
|---|---|
| Pasar `metadata: { firebaseUid: uid }` también en la sesión de checkout | Bug 1 |
| Agregar `case 'customer.subscription.created'` al switch | Bug 1 |
| En `updateSubscriptionStatus`, escribir `cardQuota` y `aiQuotaDaily` según el tier | Bug 2 |
| Guard `snap.exists` en `createBillingPortalSession` | Bug 1.4 |

### 2.2 `backend/src/functions/src/routes/stripeRoutes.js`

| Cambio | Motivo |
|---|---|
| `PRICE_ID` → `process.env.STRIPE_PRICE_ID` con fallback al literal actual | Bug 3 |
| Añadir `STRIPE_PRICE_ID` a `secrets` del `onRequest` | Bug 3 |
| Borrar `db`/`auth` muertos (líneas 32-33) y el segundo `verifyIdToken` | Limpieza; `requireAuth` ya verifica |

### 2.3 `backend/src/functions/src/utils/rateLimit.js`

`createCheckoutSession` no está en `RATE_LIMITS` y cae en `default` (60/min).
Añadir una entrada de 5/min. Un click por sesión de upgrade es lo esperado.

### 2.4 Deploy

```
firebase deploy --only functions:createCheckoutSession,functions:stripeWebhook,functions:createBillingPortalSession
```

Requiere que `STRIPE_PRICE_ID` exista como secret (ver Fase 4).

---

## 3. Fase 2 — Frontend

### 3.1 `src/components/views/LandingPage.tsx`

`onUpgrade` → `navigate('/login?next=%2Fsettings')`.

### 3.2 `src/App.tsx`

La ruta `/login` hoy hace `<Navigate to="/dashboard" replace />` fijo
(`App.tsx:296`). Leer `?next=` y redirigir ahí.

**Validación obligatoria:** el valor debe empezar por `/` y no por `//`.
Sin esto es un open redirect (AGENTS.md §22). Un `next=https://evil.com` o
`next=//evil.com` debe caer a `/dashboard`.

### 3.3 `src/components/views/SettingsView.tsx`

Restaurar la sección Premium. El código original está en
`git show b8d08d8^:src/components/views/SettingsView.tsx` (líneas 1-82), pero
se reimplementa en vez de copiarse a ciegas:

- `useToast`, `stripeService`, `quota` del store.
- `isPremium = quota?.tier === 'premium'`, más `isLoading`.
- Guard de invitado con `GUEST_UID` (no el `'dev-user-local'` del original).
- free → `createCheckoutSession(origin + '/settings?upgrade=success', origin + '/settings?upgrade=canceled')`
- premium → `createBillingPortalSession(origin + '/settings')`
- `window.location.href = url` en ambos casos.
- **Nuevo**: efecto que lee `?upgrade=success` / `?upgrade=canceled` al montar,
  dispara `loadQuota()`, muestra el toast y limpia el query param.

Tipos en `src/types/premium.ts` (AGENTS.md §8), no dentro del componente.

### 3.4 CSP — sin cambios

El flujo es `window.location.href` a `checkout.stripe.com`, una navegación
top-level. No está sujeta a `connect-src` ni `frame-src`. `firebase.json` no se
toca. Solo haría falta añadir `https://checkout.stripe.com` si algún día se usa
`@stripe/stripe-js` embebido.

---

## 4. Fase 3 — Tests

### 4.1 `tests/components/SettingsView.test.tsx`

Cinco tests (líneas 44-78) afirman activamente que la sección Premium **no**
existe. Rewrite completo:

- La sección renderiza (heading, copy, botón).
- Usuario free → llama `createCheckoutSession`.
- Usuario premium → llama `createBillingPortalSession`.
- Invitado → no llama a ningún servicio, muestra toast.
- `?upgrade=success` → refresca quota y muestra toast.
- El resto de las secciones de settings sigue renderizando.

### 4.2 `tests/services/stripe.test.ts` (nuevo)

Mockear `callFunction`. Assert de la URL, del body enviado y del shape de
retorno `{ url }`.

### 4.3 `tests/services/stripeWebhook.test.ts` (nuevo, backend)

Cubre los 3 bugs de Fase 1:

- `checkout.session.completed` sin metadata de sesión no debe crashear.
- `customer.subscription.created` actualiza el tier.
- `cardQuota` y `aiQuotaDaily` se escriben con los valores del tier premium.

---

## 5. Fase 4 — Verificación manual en Stripe

Fuera del alcance del repo. Requiere acceso al dashboard de Stripe.

1. **¿El price `price_1UOKzMCCE67J3dcOBzkWLf18` es test o live?** Si es live y el
   secret es live, los usuarios pagan de verdad. Probar primero con la tarjeta
   de test `4242 4242 4242 4242`.
2. **¿El webhook está registrado?** Debe apuntar a
   `https://us-central1-fladycard-22a3e.cloudfunctions.net/stripeWebhook`, tener
   `STRIPE_WEBHOOK_SECRET` como signing secret, y estar subscribed a
   `checkout.session.completed`, `customer.subscription.created`,
   `customer.subscription.updated` y `customer.subscription.deleted`.
   **Sin `customer.subscription.created` hay que arreglarlo también en el
   dashboard**, no solo en el código.
3. **Crear el secret:**
   ```
   firebase functions:secrets:set STRIPE_PRICE_ID
   ```

---

## 6. Fase 5 — Documentación y versión

- `docs/dashboard-api-trigger-analysis.md` §153 — fila en **Registro de
  Cambios** noting `createCheckoutSession` y `createBillingPortalSession`
  disparados desde `/settings`.
- Bump **minor** (`1.34.33` → `1.35.0`) en `src/constants/version.ts` y
  `package.json` (AGENTS.md §30). Es una feature nueva, no un patch.

---

## 7. Archivos tocados

| Archivo | Cambio |
|---|---|
| `backend/src/functions/src/services/stripeService.js` | 4 fixes |
| `backend/src/functions/src/routes/stripeRoutes.js` | PRICE_ID env + limpieza |
| `backend/src/functions/src/utils/rateLimit.js` | entrada createCheckoutSession |
| `src/components/views/LandingPage.tsx` | `onUpgrade` apunta a `/login?next=` |
| `src/App.tsx` | ruta `/login` honra `?next=` validado |
| `src/components/views/SettingsView.tsx` | sección Premium + manejo del retorno |
| `src/types/premium.ts` | **nuevo** |
| `tests/components/SettingsView.test.tsx` | 5 tests reescritos |
| `tests/services/stripe.test.ts` | **nuevo** |
| `tests/services/stripeWebhook.test.ts` | **nuevo** |
| `docs/dashboard-api-trigger-analysis.md` | changelog |
| `src/constants/version.ts` + `package.json` | 1.34.33 → 1.35.0 |