const { getAuth } = require("../utils/firebase");

async function verifyAdmin(token, adminUids) {
  const decoded = await getAuth().verifyIdToken(token);
  if (!adminUids.includes(decoded.uid)) {
    throw new Error("Forbidden");
  }
  return decoded;
}

module.exports = {
  verifyAdmin,
};
