const { onRequest } = require("firebase-functions/v2/https");
const { getDb, getAuth } = require("../utils/firebase");
const { metaRefFor, todayKey } = require("../utils/helpers");
const aiService = require("../services/aiService");
const { AiGroupSchema } = require("../utils/validation");
const { rateLimit } = require("../utils/rateLimit");

function applyRateLimit(fnName, handler) {
  const limiter = rateLimit(fnName);
  return async (req, res) => {
    await new Promise((resolve, reject) => {
      limiter(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    return handler(req, res);
  };
}

async function runValidation(req, res, schema) {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const errors = result.error.flatten();
    res.status(400).json({
      error: "Invalid request body",
      details: errors.fieldErrors,
    });
    return null;
  }
  req.validatedBody = result.data;
  return req.validatedBody;
}

exports.aiGroup = onRequest(
  { cors: true, secrets: ["GEMINI_API_KEY"], timeoutSeconds: 900, memory: "512MiB" },
  applyRateLimit("aiGroup", async (req, res) => {
    const body = await runValidation(req, res, AiGroupSchema);
    if (!body) return;

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized", authHeaderPresent: !!authHeader, authPrefix: authHeader ? authHeader.split(" ")[0] : null });
    }

    const { concept, associations } = body;
    const dataToProcess = associations.slice(0, 2000);
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
  })
);