const { initializeTestEnvironment, assertSucceeds, assertFails } = require("@firebase/rules-unit-testing");
const { readFileSync } = require("fs");
const { resolve } = require("path");

const FIRESTORE_RULES = readFileSync(resolve(__dirname, "../../../../firestore.rules"), "utf8");
const STORAGE_RULES = readFileSync(resolve(__dirname, "../../../../storage.rules"), "utf8");

describe("Firestore Security Rules", () => {
  let testEnv;
  let db;

  beforeAll(async () => {
    const projectId = `test-${Date.now()}`;
    testEnv = await initializeTestEnvironment({
      projectId,
      firestore: {
        rules: FIRESTORE_RULES,
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
    db = testEnv.authenticatedContext("user1").firestore();
  });

  describe("users/{userId}/{document=**} - User isolation", () => {
    const user1 = "user1";
    const user2 = "user2";

    test("authenticated user can read own data", async () => {
      const doc = db.collection("users").doc(user1).collection("meta").doc("main");
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection("users").doc(user1).collection("meta").doc("main").set({ tier: "free" });
      });
      await assertSucceeds(doc.get());
    });

    test("authenticated user can write own data", async () => {
      const doc = db.collection("users").doc(user1).collection("meta").doc("main");
      await assertSucceeds(doc.set({ tier: "free", cardCount: 0 }));
    });

    test("user cannot read another user's data", async () => {
      const otherDb = testEnv.authenticatedContext(user2).firestore();
      const doc = otherDb.collection("users").doc(user1).collection("meta").doc("main");
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection("users").doc(user1).collection("meta").doc("main").set({ tier: "free" });
      });
      await assertFails(doc.get());
    });

    test("user cannot write another user's data", async () => {
      const otherDb = testEnv.authenticatedContext(user2).firestore();
      const doc = otherDb.collection("users").doc(user1).collection("meta").doc("main");
      await assertFails(doc.set({ tier: "premium" }));
    });

    test("user cannot delete another user's data", async () => {
      const otherDb = testEnv.authenticatedContext(user2).firestore();
      const doc = otherDb.collection("users").doc(user1).collection("meta").doc("main");
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection("users").doc(user1).collection("meta").doc("main").set({ tier: "free" });
      });
      await assertFails(doc.delete());
    });

    test("unauthenticated user cannot read any user data", async () => {
      const unauthDb = testEnv.unauthenticatedContext().firestore();
      const doc = unauthDb.collection("users").doc(user1).collection("meta").doc("main");
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection("users").doc(user1).collection("meta").doc("main").set({ tier: "free" });
      });
      await assertFails(doc.get());
    });

    test("unauthenticated user cannot write any user data", async () => {
      const unauthDb = testEnv.unauthenticatedContext().firestore();
      const doc = unauthDb.collection("users").doc(user1).collection("meta").doc("main");
      await assertFails(doc.set({ tier: "free" }));
    });
  });

  describe("Anonymous user access", () => {
    test("anonymous user cannot access user data", async () => {
      const anonDb = testEnv.authenticatedContext("anon-user", { firebase: { sign_in_provider: "anonymous" } }).firestore();
      const doc = anonDb.collection("users").doc("some-user").collection("meta").doc("main");
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection("users").doc("some-user").collection("meta").doc("main").set({ tier: "free" });
      });
      await assertFails(doc.get());
    });
  });
});

describe("Storage Security Rules", () => {
  let testEnv;
  let storage;

  beforeAll(async () => {
    const projectId = `test-${Date.now()}`;
    testEnv = await initializeTestEnvironment({
      projectId,
      storage: {
        rules: STORAGE_RULES,
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearStorage();
    storage = testEnv.authenticatedContext("user1").storage();
  });

  describe("audio/{userId}/{allPaths=**} - User isolation", () => {
    const user1 = "user1";
    const user2 = "user2";

    test("authenticated user can read own audio files", async () => {
      const fileRef = storage.bucket.file(`audio/${user1}/test.mp3`);
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.storage().bucket.file(`audio/${user1}/test.mp3`).save(Buffer.from("test"));
      });
      await assertSucceeds(fileRef.getMetadata());
    });

    test("authenticated user can write own audio files", async () => {
      const fileRef = storage.bucket.file(`audio/${user1}/test.mp3`);
      await assertSucceeds(fileRef.save(Buffer.from("test")));
    });

    test("user cannot read another user's audio files", async () => {
      const otherStorage = testEnv.authenticatedContext(user2).storage();
      const fileRef = otherStorage.bucket.file(`audio/${user1}/test.mp3`);
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.storage().bucket.file(`audio/${user1}/test.mp3`).save(Buffer.from("test"));
      });
      await assertFails(fileRef.getMetadata());
    });

    test("user cannot write another user's audio files", async () => {
      const otherStorage = testEnv.authenticatedContext(user2).storage();
      const fileRef = otherStorage.bucket.file(`audio/${user1}/test.mp3`);
      await assertFails(fileRef.save(Buffer.from("test")));
    });

    test("user cannot delete another user's audio files", async () => {
      const otherStorage = testEnv.authenticatedContext(user2).storage();
      const fileRef = otherStorage.bucket.file(`audio/${user1}/test.mp3`);
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.storage().bucket.file(`audio/${user1}/test.mp3`).save(Buffer.from("test"));
      });
      await assertFails(fileRef.delete());
    });

    test("unauthenticated user cannot access audio files", async () => {
      const unauthStorage = testEnv.unauthenticatedContext().storage();
      const fileRef = unauthStorage.bucket.file(`audio/${user1}/test.mp3`);
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.storage().bucket.file(`audio/${user1}/test.mp3`).save(Buffer.from("test"));
      });
      await assertFails(fileRef.getMetadata());
    });
  });

  describe("Root path - deny all", () => {
    test("any access to root path is denied", async () => {
      const fileRef = storage.bucket.file("any-file.txt");
      await assertFails(fileRef.getMetadata());
      await assertFails(fileRef.save(Buffer.from("test")));
    });
  });
});