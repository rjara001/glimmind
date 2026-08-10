const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");

let db;

function init() {
  initializeApp();
  db = getFirestore();
}

function getDb() {
  if (!db) {
    init();
  }
  return db;
}

module.exports = {
  init,
  getDb,
  getFirestore,
  FieldValue,
  getAuth,
};
