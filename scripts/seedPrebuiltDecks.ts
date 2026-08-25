import { initializeApp, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { PREBUILT_DECKS } from '../src/constants/prebuiltDecks';

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'demo-glimmind';

let app: App;

function initApp(): App {
  if (!app) {
    try {
      app = initializeApp({ projectId: PROJECT_ID });
    } catch {
      app = initializeApp({ projectId: PROJECT_ID }, 'seed-decks');
    }
  }
  return app;
}

async function seedDecks(): Promise<void> {
  const firebaseApp = initApp();
  const db = getFirestore(firebaseApp);
  const collection = db.collection('prebuiltDecks');

  let inserted = 0;
  let skipped = 0;

  for (const deck of PREBUILT_DECKS) {
    const existing = await collection.where('name', '==', deck.name).limit(1).get();

    if (!existing.empty) {
      console.log(`  Skipping "${deck.name}" (already exists)`);
      skipped++;
      continue;
    }

    const { id: _id, ...data } = deck;
    await collection.doc(deck.id).set(data);
    console.log(`  Inserted "${deck.name}" (${deck.associations.length} cards)`);
    inserted++;
  }

  console.log(`\nDone: ${inserted} inserted, ${skipped} skipped`);
}

seedDecks().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
