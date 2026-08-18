const { onRequest } = require("firebase-functions/v2/https");
const { getDb } = require("./src/utils/firebase");
const { requireAuth } = require("./src/utils/helpers");
const { QuotaExceededError } = require("./src/utils/helpers");
const { COLLECTION_NAME, MAX_CARDS_PER_LIST, PREMIUM_CARD_QUOTA } = require("./src/utils/constants");

const listService = require("./src/services/listService");
const progressService = require("./src/services/progressService");
const settingsService = require("./src/services/settingsService");
const activityService = require("./src/services/activityService");
const userService = require("./src/services/userService");
const adminService = require("./src/services/adminService");

const listRoutes = require("./src/routes/listRoutes");
const progressRoutes = require("./src/routes/progressRoutes");
const settingsRoutes = require("./src/routes/settingsRoutes");
const activityRoutes = require("./src/routes/activityRoutes");
const userRoutes = require("./src/routes/userRoutes");
const aiRoutes = require("./src/routes/aiRoutes");
const ttsRoutes = require("./src/routes/ttsRoutes");
const sttRoutes = require("./src/routes/sttRoutes");

function loadRoutes(routes) {
  Object.keys(routes).forEach((key) => {
    exports[key] = routes[key];
  });
}

loadRoutes(listRoutes);
loadRoutes(progressRoutes);
loadRoutes(settingsRoutes);
loadRoutes(activityRoutes);
loadRoutes(userRoutes);
loadRoutes(aiRoutes);
loadRoutes(ttsRoutes);
loadRoutes(sttRoutes);
