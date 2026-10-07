const { onRequest } = require("firebase-functions/v2/https");
const { getOptionalAuthUid } = require("../utils/helpers");
const { z } = require("zod");

const LogClientErrorSchema = z.object({
  severity: z.enum(['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']).optional(),
  payload: z.object({
    message: z.string(),
    stack: z.string().nullable().optional(),
    ua: z.string().optional(),
    url: z.string().optional(),
    timestamp: z.number().optional(),
    eventType: z.string().optional(),
    extra: z.record(z.unknown()).optional()
  }),
  labels: z.record(z.string()).optional()
});

exports.logClientError = onRequest({ cors: true }, async (req, res) => {
  // Extract UID if token exists, but don't block if anonymous/expired
  const uid = await getOptionalAuthUid(req) || 'anonymous';

  const result = LogClientErrorSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: "Invalid request", details: result.error.flatten() });
  }

  const { severity = 'ERROR', payload, labels } = result.data;
  
  // Cloud Functions v2: JSON console.error auto-parsed by Cloud Logging
  console.error(JSON.stringify({
    severity,
    message: `[Client Event] ${payload.message}`,
    serviceContext: { service: 'glimmind-web' },
    clientPayload: { ...payload, uid, timestamp: payload.timestamp || Date.now() },
    labels: { ...labels, uid }
  }));

  res.json({ success: true });
});