
const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");

// Una función simple para probar que el emulador funciona
exports.helloWorld = onRequest((request, response) => {
  logger.info("Hello logs!", {structuredData: true});
  response.send("Glimmind Functions Emulator is running!");
});
