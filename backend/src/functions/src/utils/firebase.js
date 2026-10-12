// CRITICAL: FIRESTORE_EMULATOR_HOST must be set BEFORE any requires, only in
// emulator mode. The Admin SDK reads this env var at module load time.
//
// Do NOT hardcode the port here. firebase.json already declares
// emulators.functions.env.FIRESTORE_EMULATOR_HOST and keeps it in sync with
// emulators.firestore.port; this file used to force localhost:8080, which
// survived the 2026-10-02 port migration (8080 -> 9080) and silently pointed
// every function at a different project's Firestore emulator. Only fill it in
// when nothing else set it, and match firebase.json's firestore port.
if (process.env.FUNCTIONS_EMULATOR === "true" && !process.env.FIRESTORE_EMULATOR_HOST) {
  process.env.FIRESTORE_EMULATOR_HOST = "localhost:9080";
}

const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getAuth: adminGetAuth } = require("firebase-admin/auth");

let db;

function init() {
  console.log('[firebase.js] init() called');
  console.log('[firebase.js] FIRESTORE_EMULATOR_HOST =', process.env.FIRESTORE_EMULATOR_HOST);

  initializeApp();
  db = getFirestore();
}

function getDb() {
  if (!db) {
    init();
  }
  return db;
}

function getAuth() {
  if (!db) {
    init();
  }
  return adminGetAuth();
}

module.exports = {
  init,
  getDb,
  getAuth,
  getFirestore,
  FieldValue,
};
