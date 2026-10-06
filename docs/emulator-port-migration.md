# Firebase Emulator Port Migration

**Date:** 2026-10-02  
**Author:** opencode agent  
**Status:** Completed

---

## Overview

This document details the migration of Firebase emulator ports across 4 projects to eliminate port conflicts. Each project now uses a dedicated 100-port range.

---

## Port Assignment Strategy

| Project | Port Range | Description |
|---------|-----------|-------------|
| **glimmind** | 9000-9099 | Word association game |
| **burnball** | 9100-9199 | Instant temporary text sharing |
| **tabito-revamped** | 9200-9299 | Travel planning app |
| **feedbacker-multitenant** | 9300-9399 | Multi-tenant feedback widget |

---

## Before vs After Comparison

### glimmind (9000-9099)

| Service | Before | After | Change |
|---------|--------|-------|--------|
| UI | 4000 | 9000 | ✅ New range |
| Functions | 5001 | 9001 | ✅ New range |
| Firestore | 8080 | 9080 | ✅ New range |
| Auth | 9099 | 9099 | ✅ Kept (already in range) |

**Files Modified:**
- `firebase.json` - Updated all 4 emulator ports
- `package.json` - Updated `emulators:kill` script

### burnball (9100-9199)

| Service | Before | After | Change |
|---------|--------|-------|--------|
| UI | 4000 | 9100 | ✅ New range |
| Firestore | 8080 | 9180 | ✅ New range |
| Storage | 9199 | 9199 | ✅ Kept (already in range) |

**Files Modified:**
- `firebase.json` - Updated 3 emulator ports
- `package.json` - Added `emulators` and `emulators:kill` scripts

### tabito-revamped (9200-9299)

| Service | Before | After | Change |
|---------|--------|-------|--------|
| UI | 4000 | 9200 | ✅ New range |
| Functions | 5001 | 9201 | ✅ New range |
| Firestore | 8080 | 9280 | ✅ New range |
| Auth | 9099 | 9299 | ✅ New range |
| Hub | 4401 | 9241 | ✅ New range |
| Logging | 4501 | 9251 | ✅ New range |

**Files Modified:**
- `firebase.json` - Updated all 6 emulator ports

### feedbacker-multitenant (9300-9399)

| Service | Before | After | Change |
|---------|--------|-------|--------|
| UI | 4300 | 9300 | ✅ New range |
| Functions | 5202 | 9302 | ✅ New range |
| Firestore | 8282 | 9382 | ✅ New range |
| Auth | 9393 | 9393 | ✅ Kept (already in range) |
| Storage | 9494 | 9394 | ✅ New range |
| Hub | 4600 | 9360 | ✅ New range |
| Logging | 4700 | 9370 | ✅ New range |

**Files Modified:**
- `firebase.json` - Updated 6 emulator ports (Auth unchanged)
- `package.json` - Updated `seed:emulator` script, added `emulators:kill` script

---

## Conflict Resolution Summary

### Conflicts Eliminated
- **Port 4000 (UI)**: Was used by glimmind, burnball, tabito → Now 9000, 9100, 9200
- **Port 5001 (Functions)**: Was used by glimmind, tabito → Now 9001, 9201
- **Port 8080 (Firestore)**: Was used by glimmind, burnball, tabito → Now 9080, 9180, 9280
- **Port 9099 (Auth)**: Was used by glimmind, tabito → Now 9099, 9299
- **Port 4300/4400/4500/4600/4700**: Was used by feedbacker/tabito → Now all in 9300s/9200s

### Projects with Zero Conflicts Now
✅ All 4 projects can run simultaneously without port conflicts

---

## Updated Commands

### glimmind
```bash
npm run emulators          # Starts auth, functions, firestore on 9099, 9001, 9080
npm run emulators:kill     # Kills ports 9000, 9001, 9080, 9099
```

### burnball
```bash
npm run emulators          # Starts firestore, storage on 9180, 9199 (UI on 9100)
npm run emulators:kill     # Kills ports 9100, 9180, 9199
```

### tabito-revamped
```bash
npm run em:start           # Starts functions, firestore on 9201, 9280
# Note: Uses firebase emulators:start directly for all services
```

### feedbacker-multitenant
```bash
npm run emulators          # Starts auth, functions, firestore, storage on 9393, 9302, 9382, 9394
npm run emulators:kill     # Kills ports 9300, 9302, 9382, 9393, 9394, 9360, 9370
npm run seed:emulator      # Seeds data using FIRESTORE_EMULATOR_HOST=127.0.0.1:9382
```

---

## Environment Variables for Client Code

If any client code connects directly to emulators, update these environment variables:

### glimmind
```bash
FIRESTORE_EMULATOR_HOST=localhost:9080
FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
```

### burnball
```bash
FIRESTORE_EMULATOR_HOST=localhost:9180
```

### tabito-revamped
```bash
FIRESTORE_EMULATOR_HOST=127.0.0.1:9280
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9299
```

### feedbacker-multitenant
```bash
FIRESTORE_EMULATOR_HOST=127.0.0.1:9382
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9393
```

---

## Verification

### Port Uniqueness Check
```bash
# All ports should be unique across projects
# Run from each project root:
firebase emulators:start --only auth,functions,firestore,storage,ui,hub,logging
```

### Expected UI URLs After Migration
| Project | Emulator UI |
|---------|-------------|
| glimmind | http://localhost:9000 |
| burnball | http://localhost:9100 |
| tabito-revamped | http://localhost:9200 |
| feedbacker-multitenant | http://localhost:9300 |

---

## Rollback Plan

If issues arise, revert changes in these files:
- `glimmind/firebase.json`
- `glimmind/package.json`
- `burnball/firebase.json`
- `burnball/package.json`
- `tabito-revamped/firebase.json`
- `feedbacker-multitenant/firebase.json`
- `feedbacker-multitenant/package.json`

Original ports are documented in this file's "Before" columns.

---

## Related Files

- [Dashboard API Trigger Analysis](../dashboard-api-trigger-analysis.md) - May need updates if API endpoints reference emulator ports
- `.github/workflows/` - Check CI/CD for hardcoded emulator ports
- `docker-compose.yml` - If any, check for port mappings