const { getDb } = require("./firebase");

const RATE_LIMITS = {
  default: { requests: 60, windowMs: 60000 },
  aiGroup: { requests: 10, windowMs: 60000 },
  synthesizeSpeech: { requests: 30, windowMs: 60000 },
  createList: { requests: 20, windowMs: 60000 },
  updateList: { requests: 30, windowMs: 60000 },
  deleteList: { requests: 10, windowMs: 60000 },
  splitList: { requests: 5, windowMs: 60000 },
  appendActivity: { requests: 100, windowMs: 60000 },
  updateProgress: { requests: 120, windowMs: 60000 },
  updateSettings: { requests: 10, windowMs: 60000 },
};

const memoryStore = new Map();

function getClientId(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return `auth:${authHeader.slice(7, 27)}`;
  }
  const ip = req.headers["x-forwarded-for"] || req.headers["x-real-ip"] || req.ip || "unknown";
  return `ip:${ip}`;
}

async function checkRateLimit(identifier, limitConfig) {
  const now = Date.now();
  const windowStart = now - limitConfig.windowMs;
  const key = `${identifier}:${Math.floor(now / limitConfig.windowMs)}`;

  let record = memoryStore.get(key);
  if (!record) {
    record = { count: 0, windowStart: now };
    memoryStore.set(key, record);
  }

  if (now - record.windowStart > limitConfig.windowMs) {
    record.count = 0;
    record.windowStart = now;
  }

  record.count++;

  if (record.count > limitConfig.requests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.windowStart + limitConfig.windowMs,
      limit: limitConfig.requests,
    };
  }

  return {
    allowed: true,
    remaining: limitConfig.requests - record.count,
    resetTime: record.windowStart + limitConfig.windowMs,
    limit: limitConfig.requests,
  };
}

function cleanupMemoryStore() {
  const now = Date.now();
  for (const [key, record] of memoryStore.entries()) {
    if (now - record.windowStart > 120000) {
      memoryStore.delete(key);
    }
  }
}

setInterval(cleanupMemoryStore, 60000);

function rateLimit(functionName) {
  const limitConfig = RATE_LIMITS[functionName] || RATE_LIMITS.default;

  return async (req, res, next) => {
    const clientId = getClientId(req);
    const identifier = `${functionName}:${clientId}`;

    const result = await checkRateLimit(identifier, limitConfig);

    res.set({
      "X-RateLimit-Limit": result.limit,
      "X-RateLimit-Remaining": result.remaining,
      "X-RateLimit-Reset": Math.ceil(result.resetTime / 1000),
    });

    if (!result.allowed) {
      return res.status(429).json({
        error: "Too Many Requests",
        message: `Rate limit exceeded. Try again after ${Math.ceil((result.resetTime - Date.now()) / 1000)} seconds.`,
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
      });
    }

    next();
  };
}

module.exports = { rateLimit, RATE_LIMITS };