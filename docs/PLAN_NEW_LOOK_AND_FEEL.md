# Plan de Implementación: Nuevo Look and Feel

**Proyecto:** Glimmind  
**Fecha:** 2026-10-08

---

## 1. Estado Actual

- El proyecto usa **Tailwind CSS vía CDN** en `src/index.html`
- Landing page en `src/components/views/LandingPage.tsx` usa clases de Tailwind
- No existen archivos CSS globales; todo el estilo es inline/Tailwind
- **Dashboard, GameView, ListEditor, SettingsModal, y otros componentes usan Tailwind**
- La app usa **React Router** (`react-router-dom`) — ver `src/App.tsx` líneas 2, 282-435
- `App.tsx` (incluida su pantalla de carga) es **contexto, no problema** — está FUERA de alcance

---

## 2. Objetivo

Añadir el nuevo diseño **solo al landing page inicial** mediante un archivo CSS propio, **sin quitar el CDN de Tailwind** para no romper el resto de la app.

---

## 3. Fuera de Alcance (NO tocar)

- **Dashboard.tsx**
- **GameView.tsx**
- **ListEditor.tsx**
- **SettingsModal.tsx** (y SettingsView.tsx)
- **App.tsx** (incluida su pantalla de carga)
- **Cualquier componente que use clases Tailwind**
- **El CDN de Tailwind se mantiene** en `src/index.html`

---

## 4. Pasos de Implementación

| Paso | Tarea | Archivos Afectados |
|------|-------|-------------------|
| 0 | **Leer `LandingPage.tsx` completo** y documentar: props, handlers, lógica de auth, estado, redirecciones de botones. **Verificar rutas existentes en `src/App.tsx` y documentar explícitamente**: ¿existe `/login`? ¿`/dashboard`? ¿`/signup`? Ajustar handlers según lo que exista. **Verificar si la app tiene sistema de i18n**. | `src/components/views/LandingPage.tsx`, `src/App.tsx` |
| 1 | Crear rama `feat/new-look-and-feel` | Git |
| 2 | Crear CSS específico `src/components/views/landing.css` con clases prefijadas `.landing-*` y **CSS custom properties** (ver §5) | `src/components/views/landing.css` (nuevo) |
| 3 | Actualizar `src/index.html`: **mantener Tailwind CDN**, mantener fuente Inter | `src/index.html` |
| 4 | Reescribir `LandingPage.tsx` usando la estructura HTML y clases CSS nuevas (importando `./landing.css`) | `src/components/views/LandingPage.tsx` |
| 5 | Implementar handlers de botones (ver §6) | `src/components/views/LandingPage.tsx` |
| 6 | Verificar: `npx tsc --noEmit`, `npm run build`, `npm test` | — |

---

## 5. CSS: Nomenclatura, Custom Properties y Cómo Importar

### Reglas de nombrado
Todas las clases llevan prefijo `.landing-` para evitar colisiones con Tailwind:

| Clase original (HTML) | Clase nueva (CSS) |
|----------------------|-------------------|
| `.hero` | `.landing-hero` |
| `.hero-inner` | `.landing-hero-inner` |
| `.tag` | `.landing-tag` |
| `.buttons` / `.btn` | `.landing-buttons` / `.landing-btn` / `.landing-btn-primary` / `.landing-btn-secondary` |
| `.screenshot-wrap` | `.landing-screenshot-wrap` |
| `.screenshot` | `.landing-screenshot` |
| `.section` | `.landing-section` |
| `.section-head` | `.landing-section-head` |
| `.section-num` | `.landing-section-num` |
| `.section-lead` | `.landing-section-lead` |
| `.flow` | `.landing-flow` |
| `.flow-step` | `.landing-flow-step` |
| `.validation` | `.landing-validation` |
| `.why` | `.landing-why` |
| `.why-grid` / `.why-card` | `.landing-why-grid` / `.landing-why-card` |
| `.pricing` | `.landing-pricing` |
| `.plans` / `.plan` | `.landing-plans` / `.landing-plan` |
| `.closing` | `.landing-closing` |
| `.footer` / `.footer-top` | `.landing-footer` / `.landing-footer-top` |

### CSS Custom Properties (en `:root` o `.landing-root`)
```css
:root {
  --landing-primary: #4f46e5;
  --landing-primary-dark: #7c3aed;
  --landing-accent: #db2777;
  --landing-accent-yellow: #fde047;
  --landing-bg: #fafafa;
  --landing-text: #0f172a;
  --landing-text-muted: #64748b;
  --landing-border: #e2e8f0;
  --landing-radius: 12px;
  --landing-radius-lg: 20px;
}
```
Usar `var(--landing-*)` en **todas** las reglas. Ventaja: cambiar un color en un solo lugar.

### Cómo importar en React + Vite
- Crear `src/components/views/landing.css`
- En `LandingPage.tsx`: `import './landing.css';`
- Vite lo empaqueta automáticamente
- **NO usar `<style>` en JSX**

---

## 6. Estructura del Nuevo Landing Page y Handlers de Botones

El nuevo diseño incluye las siguientes secciones (basado en el HTML proporcionado):

1. **Hero:** Gradiente morado/rosa, tag "Sistema de 4 ciclos", H1 con "Glimmind te hace recordar", subtítulo, botones primario/secundario
   - **"Empezar gratis"** → `onStart()`
   - **"Ver demo"** → scroll suave a la sección de screenshot (`.landing-screenshot-wrap`)

2. **Screenshot:** Preview del juego (cabecera, pregunta, input + botón validar)

3. **Sección 01:** Flujo de 4 ciclos (NUEVA → VISTA → RECONOCIDA → FRECUENTE) con grid de 4 tarjetas

4. **Sección 02:** Validación difusa - tabla demo con ejemplo "dividens" vs "dividends" (93% = acierto)

5. **Why Glimmind:** 6 tarjetas de características (icono + título + descripción)

6. **Pricing:** Dos planes (Free €0 vs Premium €4,99) con lista de features
   - **"Probar Premium"** → `onUpgrade()`

7. **Cierre:** CTA final con botón "Crear mi primer mazo →"
   - **"Crear mi primer mazo"** → `onStart()` (igual que "Empezar gratis")

8. **Footer:** 4 columnas (Marca, Producto, Recursos, Legal) + barra inferior con copyright y status

### Handlers a implementar en `LandingPage.tsx`
**NO hardcodear rutas sin verificar en Paso 0.** Patrón genérico:

```tsx
// LandingPage recibe callbacks del padre (App.tsx):
interface LandingPageProps {
  onStart: () => void;
  onUpgrade: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStart, onUpgrade }) => {
  const onDemo = () => document.querySelector('.landing-screenshot-wrap')?.scrollIntoView({ behavior: 'smooth' });
  // ...
};

// En App.tsx, al renderizar LandingPage:
<LandingPage 
  onStart={handleStart} 
  onUpgrade={handleUpgrade} 
/>
```

**En Paso 0, documentar explícitamente qué rutas existen** en `src/App.tsx` (líneas 282-435) y definir `handleStart` / `handleUpgrade` según esas rutas.

---

## 7. Cambios de Contenido (Textos) e i18n

### Textos (español según HTML proporcionado)
1. Hero: "Mientras Duolingo te da puntos, Glimmind te hace recordar."
2. Sub: "Sistema de 4 ciclos · Validación difusa · Voz. Aprende el vocabulario que realmente necesitas."
3. Botones: "Empezar gratis" / "Ver demo"
4. Sección 01: "Cómo se mueve una palabra" + descripción de cada ciclo
5. Sección 02: "Validación difusa" + "Si el 80% de los caracteres coincide, cuenta como acierto."
6. Why: "Para quienes quieren recordar, no coleccionar puntos."
7. 6 features traducidas con sus descripciones
8. Pricing: "Simple y honesto. Empieza gratis. Actualiza cuando lo necesites. Sin sorpresas."
9. Planes: Free (1.000 tarjetas) vs Premium (5.000 tarjetas + voces HD, stats, export, soporte)
10. Cierre: "¿Listo para recordar de verdad? Crea tu primer mazo gratis. Toma menos de un minuto."
11. Footer: "Flashcards con repetición espaciada para aprender idiomas. Construido con React, Firebase y ciencia."

### i18n
- **En Paso 0, verificar si la app tiene sistema de i18n** (buscar `i18n`, `react-i18next`, `useTranslation`, archivos de locale)
- **Si SÍ**: usar claves de traducción (`t('landing.hero.title')`)
- **Si NO**: hardcodear textos en español directamente en el JSX

---

## 8. Paso 0.5: Verificación Previa (SOLO EN LOCAL)

1. Crear `landing-mock.html` en la **raíz del proyecto** (`/landing-mock.html`)
2. Copiar el HTML + CSS completo ahí **con CSS inline** (`<style>...</style>`)
3. **NO usar `<link rel="stylesheet" href="/src/...">`**
4. Abrirlo en el navegador: `http://localhost:3001/landing-mock.html`
5. Verificar:
   - Responsive en móvil (375px), tablet (768px), desktop (1440px)
   - Que los colores se ven bien
   - Que las animaciones funcionan
6. Si funciona, migrar a React
7. **BORRAR `landing-mock.html` antes de commitear**
8. Añadir `landing-mock.html` a `.gitignore` para evitar commitearlo por error

**NO usar `<iframe>` en `LandingPage.tsx`**. Eso sería un parche temporal y no queremos que quede en producción.

---

## 9. Riesgos y Consideraciones

1. **Tailwind CDN se mantiene** — el resto de la app sigue funcionando
2. **Clases prefijadas `.landing-*`** — evita colisiones con Tailwind o estilos globales
3. **CSS custom properties** — un solo lugar para cambiar colores/espaciados
4. **Responsive breakpoints** en 900px, 800px, 500px — verificar en móvil/desktop
5. **Fuente Inter** se carga desde Google Fonts en `index.html` — mantener
6. **Leer `LandingPage.tsx` antes de reescribir** — documentar props, handlers, auth, redirects
7. **Verificar rutas en `App.tsx`** antes de hardcodear navegación en handlers
8. **Verificar i18n en Paso 0** — definir estrategia de textos

---

## 10. Verificación Final

Ejecutar en orden:

1. `npx tsc --noEmit` → 0 errores TypeScript
2. `npm run build` → build exitoso
3. `npm test` → todos los tests pasan
4. Verificar visualmente en `localhost:3001` que el landing page coincide con el diseño del HTML proporcionado
5. **Verificar que Tailwind sigue funcionando en el resto de la app:**
   - Abrir `http://localhost:3001/dashboard` → verificar estilos
   - Abrir `http://localhost:3001/game` → verificar estilos
   - Si algo se ve sin estilos → Tailwind no carga
6. Verificar que `landing-mock.html` **no existe** en el commit final