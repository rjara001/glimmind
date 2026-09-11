// CRITICAL: Set FIRESTORE_EMULATOR_HOST BEFORE any requires.
// The Admin SDK reads this env var at module load time.
// The Firebase CLI may rewrite "localhost" to "127.0.0.1" when loading .env,
// so we set it explicitly here to ensure we connect to the same host as the seed script.
process.env.FIRESTORE_EMULATOR_HOST = "localhost:8080";

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
