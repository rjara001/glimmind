# `/admin` is unreachable and the `/403` route does not exist

**Date:** 2026-10-20
**Status:** Not fixed

## What

`AuthContext.mapFirebaseUser` never assigns a `role`, so every authenticated user resolves to `'user'`. The `/admin` route declares `allowedRoles: ['owner','admin']`, `ProtectedRoute` rejects the user and navigates to `/403`, and no `/403` route is declared in `App.tsx`, so the catch-all silently redirects the visitor to `/dashboard`.

An owner or admin therefore cannot reach the usage dashboard, and no user ever sees a "forbidden" page.

## Impact

`AdminUsageView.tsx` is dead in production: the component exists, is typed and is routed, but no session can render it. Anyone expecting an admin surface will assume it is missing rather than misconfigured, and the silent bounce to `/dashboard` hides the failure entirely.

## Evidence

```
$ sed -n '33,38p' src/context/AuthContext.tsx
  const mapFirebaseUser = (firebaseUser: FirebaseUser): AppUser => ({
    uid: firebaseUser.uid,
    displayName: firebaseUser.displayName,
    email: firebaseUser.email,
    photoURL: firebaseUser.photoURL,
  });

$ grep -rn "role" src/types/*.ts
(no results)

$ sed -n '45,50p' src/components/ProtectedRoute.tsx
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = (user as AppUser & { role?: UserRole }).role || 'user';
    if (!allowedRoles.includes(userRole)) {
      return <Navigate to="/403" replace />;
    }
  }

$ grep -n "path=" src/App.tsx
...
356:            path="/admin"
366:<Route path="*" element={<Navigate to="/dashboard" replace />} />
```

There is no `path="/403"`.

## Fix

Decide whether an admin surface is wanted.

- **If yes:** persist `role` in Firestore (or a custom claim), read it in `mapFirebaseUser`, type it on `AppUser`, and add a real `/403` view so rejection is visible instead of silent.
- **If no:** delete `AdminUsageView.tsx`, the `/admin` route and the `allowedRoles` branch, and record the removal in `docs/removed-features.md`.

Either way the `/403` gap must be closed, because `ProtectedRoute.tsx:48` can navigate there today.
