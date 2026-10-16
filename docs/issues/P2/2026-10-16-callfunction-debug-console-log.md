# callFunction ships a debug console.log to production

**Date:** 2026-10-16
**Priority:** P2 — hygiene
**Status:** Not fixed

## What

`src/services/callFunction.ts:53` logs every Cloud Function invocation to the
console:

```ts
console.log('[callFunction]', functionName, 'url=', url, 'tokenPresent=', !!token);
```

It was added while debugging the keepalive/logClientError incidents and never
removed.

## Impact

Every production session writes one console line per function call, including
`tokenPresent=` (a boolean, not the token itself, so there is no secret leak).
It pollutes the browser console for end users and adds noise to any
console-based debugging. Minor, but it ships in every deploy.

## Evidence

```
$ grep -n "console.log" src/services/callFunction.ts
53:  console.log('[callFunction]', functionName, 'url=', url, 'tokenPresent=', !!token);
```

## Fix

Delete line 53. If observability is wanted, route it through `logEvent` with
severity INFO instead of a raw console.log.
