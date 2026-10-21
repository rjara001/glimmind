# Playwright reuses any stale process squatting the e2e port

## What

`playwright.config.ts` sets `reuseExistingServer: !process.env.CI` on port 3002. Locally, if **any** process already listens on that port, Playwright skips `npm run build && npm run preview` entirely and runs the suite against whatever that process serves. The config comment promises the suite "gates what actually ships", but locally it can silently test an unrelated stale server.

## Impact

On 2026-10-21 a `vite` process started `Sun Oct 18 20:08:32 2026` (PID 52385) held port 3002. The whole day's local e2e runs reused it instead of building; when working-tree churn (`git stash` during commit verification) made that server recompile, 7 of 13 tests failed with `page.goto: Test timeout ... http://localhost:3002/` (3.8m run). After killing the squatter, the same suite passed 13/13 in 25.4s against a fresh production build. Risk: false failures at any time, and a false sense that production was tested.

## Evidence

- `playwright.config.ts` — `webServer.command` builds `vite preview --port 3002 --strictPort`, but `reuseExistingServer: !process.env.CI` skips it when the URL answers
- `ps -p 52385 -o lstart,command` → `Sun Oct 18 20:08:32 2026  node .../node_modules/.bin/vite` listening on `:3002`
- 2026-10-21 failing run: 7 failed / 6 passed, error `Test timeout of 60000ms exceeded ... navigating to "http://localhost:3002/"`
- Re-run after killing PID 52385: `13 passed (25.4s)` with a fresh `npm run build`

## Fix

Either set `reuseExistingServer: false` (always build and serve the real bundle locally), or add a startup guard that fails when port 3002 is occupied by a process that is not `vite preview`. Document the guard in the e2e docs.
