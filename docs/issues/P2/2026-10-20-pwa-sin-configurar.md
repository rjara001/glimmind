# PWA plugin installed but never registered; Capacitor never synced

**Date:** 2026-10-20
**Status:** Not fixed

## What

`vite-plugin-pwa@1.2.0` sits in `devDependencies` and is never imported. `vite.config.ts` declares `plugins: [react()]` only. There is no `manifest.webmanifest`, no `<link rel="manifest">`, no service worker, no favicon and no application icons in `public/` or `dist/`. `dist/index.html` contains no manifest or `apple-touch-icon` link.

Separately, `android/app/src/main/assets` does not exist, which means `npx cap sync` has never been run against the current build, so the native shells do not contain the app bundle.

## Impact

- The product cannot be installed to a home screen. An install prompt is one of the few acquisition channels that costs nothing, and it is currently unavailable on both web and mobile.
- Without icons there is no `apple-touch-icon` or favicon: browsers fall back to a default tab icon and a generic share preview, which suppresses click-through when the URL is shared in chats and social feeds.
- No service worker means no offline shell, even though the product already keeps all game state in `localStorage` and would behave well offline.
- The Android project cannot be run or shipped until `cap sync` produces `assets/`.

This issue is the prerequisite for the PWA item in the organic channel plan (`docs/audits/2026-10-20-market-positioning.md` §6).

## Evidence

```
$ grep -n "vite-plugin-pwa" package.json
    "vite-plugin-pwa": "^1.2.0",

$ grep -n "plugins" vite.config.ts
      plugins: [react()],

$ grep -rn "VitePWA\|vite-plugin-pwa" vite.config.ts src/
(no results)

$ ls public
models  privacy-policy.html  terms-of-service.html

$ grep -o 'rel="manifest"\|apple-touch-icon\|favicon' dist/index.html
(no results)

$ ls android/app/src/main/assets
ls: android/app/src/main/assets: No such file or directory
```

## Fix

1. Register `VitePWA` in `vite.config.ts` with `registerType: 'autoUpdate'`, a manifest (name, short_name, theme colours, `display: standalone`, purpose-specific icons at 192/512 px and maskable) and `manifest` linked from `src/index.html`.
2. Generate real icons into `public/` (there are none today) and add `favicon.ico` plus `apple-touch-icon.png`.
3. Run `npm run sync` so `android/app/src/main/assets` and the iOS equivalent contain the current `dist/`.
4. Confirm with `grep -c 'rel="manifest"' dist/index.html` → `1`, and `ls android/app/src/main/assets` → non-empty.
