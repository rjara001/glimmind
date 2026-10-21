# The whole UI is styled by a runtime CDN script

**Date:** 2026-10-20
**Status:** Not fixed

## What

The production HTML loads `https://cdn.tailwindcss.com` in the `<head>` and no Tailwind exists in the build at all. `package.json` contains no `tailwindcss` and no `postcss`; there is no `tailwind.config.*` and no `postcss.config.*`; `vite.config.ts` registers only `plugins: [react()]`. Every Tailwind utility class rendered by the application is therefore resolved by a third-party script that runs in the browser after page load.

## Impact

Every user's layout depends on a third-party host on every cold load.

- **Availability:** an outage, a regional block, a corporate proxy rule or an ad-blocker extension removes all styling for all users. Nothing in CI or the build detects this.
- **Rendering:** styles apply only after the CDN script downloads and executes, so first paint is unstyled and shifts. This is a Core Web Vitals exposure on top of the availability risk.
- **Policy:** Tailwind documents the CDN build as a development-only tool, unsupported in production.
- **CSP:** `cdn.tailwindcss.com` must stay allow-listed in `firebase.json` indefinitely.

Related, in the same file: the `esm.sh` importmap resolves `react`, `firebase/*`, `next` and `@google/genai` at runtime, and `next` sits in `dependencies` with zero imports in `src/`.

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

$ grep -o 'href="[^"]*"' dist/index.html
href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap"
href="/assets/index-kzs72_o6.css"

$ grep -rn "from 'next\|from \"next" src/
(no results)
```

## Fix

1. Add `tailwindcss` with `@tailwindcss/vite` (or a PostCSS setup) and compile utilities into the bundle CSS.
2. Delete the CDN `<script>` tag from `src/index.html`.
3. Verify with `grep -c 'cdn.tailwindcss.com' dist/index.html` → `0`, and confirm every screen still renders.
4. Remove `next` from `dependencies` and drop the unused `esm.sh` importmap entries once confirmed inert; self-host Inter instead of the Google Fonts CDN if the render-blocking request becomes a measured problem.
