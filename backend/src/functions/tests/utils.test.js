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

    test("validates array definition", () => {
      const input = {
        name: "Test List",
        concept: "Test Concept",
        associations: [
          { term: "hello", definition: ["hola", "mundo"] },
        ],
        userId: "user123",
      };
      const result = validation.CreateListSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    test("validates empty array definition", () => {
      const input = {
        name: "Test",
        concept: "Concept",
        associations: [
          { term: "test", definition: [] },
        ],
        settings: { mode: "training", flipOrder: "normal", threshold: 0.95 },
        userId: "user123",
      };
      const result = validation.CreateListSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    test("validates string flipOrder", () => {
      const input = {
        name: "Test",
        concept: "Concept",
        associations: [{ term: "test", definition: "def" }],
        settings: { mode: "training", flipOrder: "normal", threshold: 0.95 },
        userId: "user123",
      };
      const result = validation.CreateListSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    test("validates full curl payload", () => {
      const input = {
        name: 'Test',
        concept: 'Valor 1 / Valor 2',
        associations: [
          { id: '0bc4855b-b9ee-48cf-b346-c39557093b3d', term: 'test', definition: [], currentCycle: 1, status: 'pending', isLearned: false, isArchived: false },
        ],
        settings: { mode: 'training', flipOrder: 'normal', threshold: 0.95, ignoreArticles: true, showHints: true, autoRevealAfterSeconds: 15, autoAdvanceAfterAttempts: 3 },
        userId: '9NpNf4GT5R7fng3INZhBxzHFsvTI',
      };
      const result = validation.CreateListSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    test("rejects boolean flipOrder", () => {
      const input = {
        name: "Test",
        concept: "Concept",
        associations: [{ term: "test", definition: "def" }],
        settings: { mode: "training", flipOrder: true, threshold: 0.95 },
        userId: "user123",
      };
      const result = validation.CreateListSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    test("rejects invalid flipOrder value", () => {
      const input = {
        name: "Test",
        concept: "Concept",
        associations: [{ term: "test", definition: "def" }],
        settings: { mode: "training", flipOrder: "invalid", threshold: 0.95 },
        userId: "user123",
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

  describe("AppendActivitySchema", () => {
    test("validates correct input", () => {
      const input = {
        userId: "user123",
        events: [
          { id: "evt1", at: 1789658784564, userId: "user123", listId: "list1", cardId: "card1", cardTerm: "Test", type: "card_created" },
        ],
      };
      const result = validation.AppendActivitySchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    test("validates with string at", () => {
      const input = {
        userId: "user123",
        events: [
          { at: "1789658784564", type: "card_created", listId: "list1", cardId: "card1", cardTerm: "Test" },
        ],
      };
      const result = validation.AppendActivitySchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    test("rejects missing at", () => {
      const input = {
        userId: "user123",
        events: [
          { type: "card_created", listId: "list1", cardId: "card1", cardTerm: "Test" },
        ],
      };
      const result = validation.AppendActivitySchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    test("rejects empty events", () => {
      const input = {
        userId: "user123",
        events: [],
      };
      const result = validation.AppendActivitySchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe("SaveSessionSchema", () => {
    test("validates correct input matching GameSessionSummary", () => {
      const input = {
        userId: "user123",
        session: {
          id: "sess1",
          listId: "list1",
          listName: "My List",
          startedAt: 1789658784564,
          endedAt: 1789659000000,
          cardsPlayed: 10,
          correct: 8,
          incorrect: 2,
          byLevel: { nuevas: 1, vistas: 2, reconocidas: 3, conocidas: 2, aprendidas: 2 },
        },
      };
      const result = validation.SaveSessionSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    test("rejects old field names (startTime, cardsReviewed)", () => {
      const input = {
        userId: "user123",
        session: {
          listId: "list1",
          startTime: 1789658784564,
          endTime: 1789659000000,
          cardsReviewed: 10,
          correctCount: 8,
          incorrectCount: 2,
        },
      };
      const result = validation.SaveSessionSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    test("rejects missing id", () => {
      const input = {
        userId: "user123",
        session: {
          listId: "list1",
          listName: "My List",
          startedAt: 1789658784564,
          endedAt: 1789659000000,
          cardsPlayed: 10,
          correct: 8,
          incorrect: 2,
        },
      };
      const result = validation.SaveSessionSchema.safeParse(input);
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

  test("allows valid request", async () => {
    mockReq.body = { userId: "user123" };
    const middleware = validation.validate(validation.GetQuotaSchema);
    const result = await middleware(mockReq, mockRes, mockNext);
    expect(result).toBe(true);
    expect(mockReq.validatedBody).toEqual({ userId: "user123" });
    expect(mockNext).not.toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
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