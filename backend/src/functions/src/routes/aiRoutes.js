const { onRequest } = require("firebase-functions/v2/https");
const { getDb, getAuth } = require("../utils/firebase");
const { metaRefFor, todayKey } = require("../utils/helpers");
const aiService = require("../services/aiService");

exports.aiGroup = onRequest({ cors: true, secrets: ["GEMINI_API_KEY"], timeoutSeconds: 900, memory: "512MiB" }, async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized", authHeaderPresent: !!authHeader, authPrefix: authHeader ? authHeader.split(" ")[0] : null });
  }

  const { concept, associations } = req.body;
  const receivedCount = Array.isArray(associations) ? associations.length : 0;
  if (receivedCount < 3) {
    return res.status(400).json({ error: "Se necesitan al menos 3 elementos para usar la IA." });
  }
  const dataToProcess = (Array.isArray(associations) ? associations : []).slice(0, 2000);
  const processedCount = dataToProcess.length;

  let uid;
  try {
    const token = await getAuth().verifyIdToken(authHeader.slice(7));
    uid = token.uid;
  } catch (error) {
    console.error(`[aiGroup] token verification failed: ${error.message}`);
    return res.status(401).json({ error: "Unauthorized", reason: error.message });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "El servicio de IA no está configurado." });
  }

  try {
    const metaRef = metaRefFor(getDb(), uid);
    const today = todayKey();
    const globalRef = getDb().collection("usage").doc("global");

    const metaSnap = await metaRef.get();
    const meta = metaSnap.data();
    const aiQuotaDaily = meta.aiQuotaDaily || 3;
    const aiUsedToday = meta.aiDateKey === today ? (meta.aiUsedToday || 0) : 0;
    if (aiUsedToday >= aiQuotaDaily) {
      return res.status(429).json({
        error: `Llegaste a tu límite diario de IA (${aiQuotaDaily} usos). Vuelve mañana.`,
      });
    }

    const globalSnap = await globalRef.get();
    const globalData = globalSnap.exists ? globalSnap.data() : { dateKey: today, aiCalls: 0 };
    const globalCalls = globalData.dateKey === today ? (globalData.aiCalls || 0) : 0;
    if (globalCalls >= 200) {
      return res.status(429).json({ error: "El servicio de IA alcanzó su límite diario. Intenta mañana." });
    }

    const lines = dataToProcess
      .map((a, index) => `${index}|${a.term}|${a.definition}`)
      .join("\n");

    const prompt = `Actúa como un experto en mnemotecnia. Analiza estas asociaciones de "${concept || ""}" y agrúpalas en categorías lógicas para facilitar su memorización.

DATOS DE ENTRADA:
${lines}

REQUISITOS:
- Devuelve un array JSON.
- Estructura: [{"groupName": "nombre", "indices": [0, 1, ...]}]`;

    const aiResult = await aiService.callGeminiWithRetryAndFallback(apiKey, prompt, processedCount);

    if (aiResult.error) {
      const status = aiResult.status === 429 ? 503 : 502;
      return res.status(status).json({ error: aiResult.error });
    }

    const groups = aiResult.result;

    await metaRef.update({
      aiUsedToday: aiUsedToday + 1,
      aiDateKey: today,
      updatedAt: require("../utils/firebase").FieldValue.serverTimestamp(),
    });
    await globalRef.set({ dateKey: today, aiCalls: globalCalls + 1 }, { merge: true });

    res.json(groups);
  } catch (error) {
    console.error("[AI] Gemini call failed:", error.message);
    if (error.code === "RATE_LIMITED") {
      return res.status(503).json({
        error: "El servicio de IA está temporalmente saturado. Intenta en unos minutos.",
      });
    }
    return res.status(502).json({ error: "Error al procesar la lista con IA." });
  }
});
