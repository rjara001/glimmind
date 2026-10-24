# The whole UI is styled by a runtime CDN script

**Date:** 2026-10-20
**Status:** Fixed 2026-10-23 (branch `fix/audit-batch-1`; resolves audit **U-09** and folded finding **AS-01**)

## What

The production HTML loaded `https://cdn.tailwindcss.com` in the `<head>` and no Tailwind existed in the build at all. `package.json` contained no `tailwindcss` and no `postcss`; there was no `tailwind.config.*` and no `postcss.config.*`; `vite.config.ts` registered only `plugins: [react()]`. Every Tailwind utility class rendered by the application was therefore resolved by a third-party script that runs in the browser after page load.

## Impact

Every user's layout depended on a third-party host on every cold load.

- **Availability:** an outage, a regional block, a corporate proxy rule or an ad-blocker extension removes all styling for all users. Nothing in CI or the build detected this.
- **Rendering:** styles applied only after the CDN script downloaded and executed, so first paint was unstyled and shifted. This was a Core Web Vitals exposure on top of the availability risk.
- **Policy:** Tailwind documents the CDN build as a development-only tool, unsupported in production.
- **CSP:** `cdn.tailwindcss.com` had to stay allow-listed in `firebase.json` indefinitely.

Related, in the same file: the `esm.sh` importmap resolved `react`, `firebase/*`, `next` and `@google/genai` at runtime, and `next` sat in `dependencies` with zero imports in `src/`.

## Evidence

```
$ grep -n "tailwind\|postcss" package.json
(no results)

$ ls tailwind.config* postcss.config*
zsh: no matches found: tailwind.config*

$ grep -n "plugins" vite.config.ts
      plugins: [react()],

$ grep -o 'src="[^"]*"' dist/index.html
src="https://cdn.tailwindcss.com"
src="/assets/index-DwT9CeQm.js"

$ grep -rn "from 'next\|from \"next" src/
(no results)
```

## Resolution (2026-10-23)

Compiled Tailwind into the Vite build and removed every runtime CDN dependency.

1. **Toolchain:** `tailwindcss@3.4.19`, `postcss@8`, `autoprefixer@10` as devDependencies. `tailwind.config.js` (ESM, `content: ['./src/index.html', './src/**/*.{js,ts,jsx,tsx}']`) at the repo root; PostCSS wired explicitly in `vite.config.ts` via `css.postcss` (Vite root is `src`, so config auto-discovery is avoided).
2. **`src/index.css`:** new entry with `@tailwind base/components/utilities` plus the custom `body` font and `.animate-shimmer` styles moved out of the inline `<style>` in `index.html`; imported from `src/index.tsx`.
3. **`src/index.html`:** CDN `<script>`, inline `<style>` and the whole `esm.sh` importmap deleted; the Google Fonts `<link>` remains.
4. **AS-01:** `next` removed from `dependencies` (zero imports in `src/` and `backend/`); `@google/genai` was never a dependency, its importmap entry was dead.
5. **CSP (`firebase.json`):** `https://cdn.tailwindcss.com` removed from `script-src` and `style-src`; `https://esm.sh` removed from `script-src` and `connect-src`.
6. **E2E regression guard (`e2e/fixtures.ts`):** `cdn.tailwindcss.com` removed from `ALLOWED_HOSTS`, so the network guard aborts the request if anything ever tries to load it again and specs fail.
7. **Dynamic-class audit:** zero utilities interpolate a variable inside the class token (`bg-${x}-500` pattern); all dynamic classes are full string literals inside maps, which the JIT compiler sees. Verified with grep before switching.

### Verification

```
$ grep -c 'cdn.tailwindcss.com\|esm.sh' dist/index.html
0

$ wc -c dist/assets/index-*.css
87785   (was 24041: landing-only CSS; utilities are now compiled in)

$ npx tsc --noEmit
(empty, exit 0)

$ npx vitest run
Test Files  89 passed (89)
     Tests  999 passed (999)

$ npm run test:backend
Test Files  7 passed (7)
     Tests  98 passed (98)

$ npx playwright test e2e/01-smoke.spec.ts
✓ [chromium] guest session reaches the dashboard (1.5s)
✓ [mobile-chromium] guest session reaches the dashboard (1.7s)
2 passed — with cdn.tailwindcss.com blocked by networkGuard
```
