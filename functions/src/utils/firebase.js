const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getAuth: adminGetAuth } = require("firebase-admin/auth");

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
