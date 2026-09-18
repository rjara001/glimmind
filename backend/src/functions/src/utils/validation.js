const { z } = require("zod");

const CreateListSchema = z.object({
  name: z.string().min(1).max(200),
  concept: z.string().max(500).optional(),
  associations: z.array(z.object({
    id: z.string().optional(),
    term: z.string().min(1).max(500),
    definition: z.union([z.string().min(1).max(2000), z.array(z.string())]),
  })).max(2000).optional(),
  settings: z.object({
    mode: z.enum(["normal", "reverse", "mixed", "training", "real"]).optional(),
    flipOrder: z.enum(["normal", "reversed"]).optional(),
    threshold: z.number().min(0).max(1).optional(),
  }).optional(),
  userId: z.string().min(1),
  sourceType: z.enum(["manual", "ai", "youtube", "import", "text"]).optional(),
  sourceUrl: z.string().url().optional().or(z.literal("")),
  rawSourceText: z.string().max(50000).optional(),
  sourceRow: z.number().int().min(0).optional(),
});

const UpdateListSchema = z.object({
  listId: z.string().min(1),
  name: z.string().min(1).max(200).optional(),
  concept: z.string().max(500).optional(),
  associations: z.array(z.object({
    id: z.string().optional(),
    term: z.string().min(1).max(500),
    definition: z.union([z.string().min(1).max(2000), z.array(z.string())]),
  })).max(2000).optional(),
  settings: z.object({
    mode: z.enum(["normal", "reverse", "mixed", "training", "real"]).optional(),
    flipOrder: z.enum(["normal", "reversed"]).optional(),
    threshold: z.number().min(0).max(1).optional(),
  }).optional(),
  sourceType: z.enum(["manual", "ai", "youtube", "import", "text"]).optional(),
  sourceUrl: z.string().url().optional().or(z.literal("")),
  rawSourceText: z.string().max(50000).optional(),
  sourceRow: z.number().int().min(0).optional(),
});

const GetListSchema = z.object({
  listId: z.string().min(1),
});

const DeleteListSchema = z.object({
  listId: z.string().min(1),
});

const SplitListSchema = z.object({
  listId: z.string().min(1),
  groups: z.array(z.object({
    name: z.string().min(1).max(200),
    associations: z.array(z.object({
      id: z.string().optional(),
      term: z.string().min(1).max(500),
      definition: z.union([z.string().min(1).max(2000), z.array(z.string())]),
    })).min(1).max(2000),
  })).min(1).max(50),
});

const GetListsSchema = z.object({
  userId: z.string().min(1),
});

const GetQuotaSchema = z.object({
  userId: z.string().min(1),
});

const UpdateSettingsSchema = z.object({
  userId: z.string().min(1),
  settings: z.object({
    theme: z.enum(["light", "dark", "system"]).optional(),
    language: z.string().min(2).max(5).optional(),
    ttsVoice: z.string().optional(),
    ttsRate: z.number().min(0.5).max(2).optional(),
    ttsPitch: z.number().min(0).max(2).optional(),
    sttLanguage: z.string().min(2).max(5).optional(),
    autoAdvance: z.boolean().optional(),
    showTranslations: z.boolean().optional(),
    enableHaptics: z.boolean().optional(),
    enableSounds: z.boolean().optional(),
    reviewInterval: z.number().int().min(1).max(365).optional(),
    dailyGoal: z.number().int().min(1).max(1000).optional(),
  }),
});

const UpdateProgressSchema = z.object({
  userId: z.string().min(1),
  progress: z.object({
    goalTarget: z.number().int().min(0),
    goalProgress: z.number().int().min(0),
    goalStartedAt: z.string().optional(),
    streak: z.number().int().min(0),
    lastActiveDate: z.string().optional(),
    playedToday: z.array(z.string()).optional(),
    log: z.record(z.object({
      repasos: z.number().int().min(0),
      byState: z.object({
        nuevas: z.number().int().min(0),
        vistas: z.number().int().min(0),
        reconocidas: z.number().int().min(0),
        conocidas: z.number().int().min(0),
        aprendidas: z.number().int().min(0),
      }).optional(),
    })).optional(),
    milestones: z.record(z.array(z.number().int())).optional(),
  }),
});

const AppendActivitySchema = z.object({
  userId: z.string().min(1),
  events: z.array(z.object({
    type: z.string().min(1).max(50),
    listId: z.string().optional(),
    cardId: z.string().optional(),
    at: z.number().int().min(0),
    data: z.record(z.unknown()).optional(),
  })).min(1).max(500),
});

const SaveSessionSchema = z.object({
  userId: z.string().min(1),
  session: z.object({
    id: z.string().min(1),
    listId: z.string().min(1),
    listName: z.string(),
    startedAt: z.number().int().min(0),
    endedAt: z.number().int().min(0),
    cardsPlayed: z.number().int().min(0),
    correct: z.number().int().min(0),
    incorrect: z.number().int().min(0),
    byLevel: z.record(z.string(), z.number().int().min(0)).optional(),
  }),
});

const GetActivitySchema = z.object({
  userId: z.string().min(1),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(200).optional(),
  type: z.string().optional(),
  listId: z.string().optional(),
});

const GetSessionsSchema = z.object({
  userId: z.string().min(1),
});

const GetDashboardDataSchema = z.object({
  userId: z.string().min(1),
});

const SynthesizeSpeechSchema = z.object({
  text: z.string().min(1).max(5000),
  voice: z.string().optional(),
  languageCode: z.string().min(2).max(10).optional(),
  speakingRate: z.number().min(0.25).max(4).optional(),
  pitch: z.number().min(-20).max(20).optional(),
  volumeGainDb: z.number().min(-96).max(16).optional(),
});

const AiGroupSchema = z.object({
  concept: z.string().max(500).optional(),
  associations: z.array(z.object({
    id: z.string().optional(),
    term: z.string().min(1).max(500),
    definition: z.union([z.string().min(1).max(2000), z.array(z.string())]),
  })).min(3).max(2000),
});

function validate(schema) {
  return async (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.flatten();
      return res.status(400).json({
        error: "Invalid request body",
        details: errors.fieldErrors,
      });
    }
    req.validatedBody = result.data;
    return true;
  };
}

module.exports = {
  validate,
  CreateListSchema,
  UpdateListSchema,
  GetListSchema,
  DeleteListSchema,
  SplitListSchema,
  GetListsSchema,
  GetQuotaSchema,
  UpdateSettingsSchema,
  UpdateProgressSchema,
  AppendActivitySchema,
  SaveSessionSchema,
  GetActivitySchema,
  GetSessionsSchema,
  GetDashboardDataSchema,
  SynthesizeSpeechSchema,
  AiGroupSchema,
};