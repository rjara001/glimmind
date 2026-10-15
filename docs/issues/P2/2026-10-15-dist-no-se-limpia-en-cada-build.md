# dist accumulates every historical bundle (never emptied)

## What

`vite.config.ts` sets `root: 'src'` while `build.outDir` points at
`<repo>/dist`, which is outside that root. Vite's default for an outDir outside
the root is `emptyOutDir: false`, so each build adds new hashed files without
removing the previous ones. No `emptyOutDir` override exists in the config.

## Impact

`dist/` currently holds 1.7 GB and 257 `index-*.js` bundles (Aug–Oct 2026).
`firebase deploy --only hosting` uploads the whole directory on every deploy,
so Hosting carries every historical bundle forever; each deploy is slower and
larger than it needs to be. Only the file referenced by `index.html` is used,
so there is no user-facing behaviour change.

## Evidence

```
vite.config.ts:10                      root: 'src'
vite.config.ts:23-25                   build: { outDir: path.resolve(__dirname, 'dist') }  // outside root, no emptyOutDir
ls dist/assets | grep -c "^index-"     257
du -sh dist                            1.7G
```

## Fix

Add `emptyOutDir: true` to the `build` block in `vite.config.ts`. `dist/` is
the project's own output directory, so emptying it is safe; verify once with
`npm run build` that `dist/index.html` and the ML assets copied by
`scripts/copy-ml-assets.mjs` (the `prebuild` hook) are present after the wipe.
