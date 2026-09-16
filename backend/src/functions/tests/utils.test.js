const { onRequest } = require("firebase-functions/v2/https");
const { getFirestore } = require("firebase-admin/firestore");

const validation = require("../src/utils/validation");
const rateLimit = require("../src/utils/rateLimit");

describe("Validation schemas", () => {
  describe("CreateListSchema", () => {
    test("validates correct input", () => {
      const input = {
        name: "Test List",
        concept: "Test Concept",
        associations: [
          { term: "hello", definition: "hola" },
        ],
        userId: "user123",
      };
      const result = validation.CreateListSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    test("rejects missing name", () => {
      const input = {
        concept: "Test",
        associations: [],
        userId: "user123",
      };
      const result = validation.CreateListSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    test("rejects empty name", () => {
      const input = {
        name: "",
        userId: "user123",
      };
      const result = validation.CreateListSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    test("rejects name too long", () => {
      const input = {
        name: "a".repeat(201),
        userId: "user123",
      };
      const result = validation.CreateListSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    test("rejects associations over limit", () => {
      const input = {
        name: "Test",
        userId: "user123",
        associations: Array(2001).fill({ term: "a", definition: "b" }),
      };
      const result = validation.CreateListSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    test("rejects invalid sourceUrl", () => {
      const input = {
        name: "Test",
        userId: "user123",
        sourceUrl: "not-a-url",
      };
      const result = validation.CreateListSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe("UpdateListSchema", () => {
    test("validates correct update", () => {
      const input = {
        listId: "list123",
        name: "Updated Name",
      };
      const result = validation.UpdateListSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    test("rejects missing listId", () => {
      const input = {
        name: "Updated Name",
      };
      const result = validation.UpdateListSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe("AiGroupSchema", () => {
    test("validates correct input", () => {
      const input = {
        concept: "Animals",
        associations: [
          { term: "dog", definition: "perro" },
          { term: "cat", definition: "gato" },
          { term: "bird", definition: "pájaro" },
        ],
      };
      const result = validation.AiGroupSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    test("rejects fewer than 3 associations", () => {
      const input = {
        associations: [
          { term: "dog", definition: "perro" },
          { term: "cat", definition: "gato" },
        ],
      };
      const result = validation.AiGroupSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    test("rejects associations over limit", () => {
      const input = {
        associations: Array(2001).fill({ term: "a", definition: "b" }),
      };
      const result = validation.AiGroupSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe("SynthesizeSpeechSchema", () => {
    test("validates correct input", () => {
      const input = {
        text: "Hello world",
        voiceId: "voice1",
      };
      const result = validation.SynthesizeSpeechSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    test("rejects empty text", () => {
      const input = {
        text: "",
        voiceId: "voice1",
      };
      const result = validation.SynthesizeSpeechSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    test("rejects text too long", () => {
      const input = {
        text: "a".repeat(5001),
        voiceId: "voice1",
      };
      const result = validation.SynthesizeSpeechSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});

describe("Rate limiting", () => {
  test("rateLimit function exists and returns middleware", () => {
    const middleware = rateLimit.rateLimit("test");
    expect(typeof middleware).toBe("function");
  });

  test("RATE_LIMITS has default config", () => {
    expect(rateLimit.RATE_LIMITS.default).toBeDefined();
    expect(rateLimit.RATE_LIMITS.default.requests).toBe(60);
    expect(rateLimit.RATE_LIMITS.default.windowMs).toBe(60000);
  });

  test("RATE_LIMITS has specific configs for expensive functions", () => {
    expect(rateLimit.RATE_LIMITS.aiGroup).toBeDefined();
    expect(rateLimit.RATE_LIMITS.aiGroup.requests).toBe(10);
    expect(rateLimit.RATE_LIMITS.synthesizeSpeech).toBeDefined();
    expect(rateLimit.RATE_LIMITS.synthesizeSpeech.requests).toBe(30);
    expect(rateLimit.RATE_LIMITS.createList).toBeDefined();
  });
});

describe("Validation middleware", () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockReq = { body: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
  });

  test("allows valid request", () => {
    mockReq.body = { userId: "user123" };
    const middleware = validation.validate(validation.GetQuotaSchema);
    middleware(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalled();
    expect(mockReq.validatedBody).toEqual({ userId: "user123" });
  });

  test("rejects invalid request", () => {
    mockReq.body = {};
    const middleware = validation.validate(validation.GetQuotaSchema);
    middleware(mockReq, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "Invalid request body",
      })
    );
    expect(mockNext).not.toHaveBeenCalled();
  });
});