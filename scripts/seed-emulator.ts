/**
 * Seed the local Firestore emulator with prebuilt decks.
 *
 * Usage:
 *   npx tsx scripts/seed-emulator.ts
 */

// 1. OBLIGATORIO: Establecer el host del emulador ANTES de cualquier import o inicialización de SDK
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';

import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { PREBUILT_DECKS } from '../src/constants/prebuiltDecks';

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'fladycard-22a3e';

function initApp(): App {
  const currentApps = getApps();
  if (currentApps.length > 0) {
    return currentApps[0];
  }
  return initializeApp({ projectId: PROJECT_ID });
}

async function seedDecks(): Promise<void> {
  const firebaseApp = initApp();
  const db = getFirestore(firebaseApp);
  const collection = db.collection('prebuiltDecks');

  console.log(`Conectado al emulador en: ${process.env.FIRESTORE_EMULATOR_HOST}`);
  console.log(`Project ID: ${PROJECT_ID}\n`);

  let inserted = 0;
  let updated = 0;

  for (let index = 0; index < PREBUILT_DECKS.length; index++) {
    const deck = PREBUILT_DECKS[index];
    const { id: docId, ...data } = deck as any;

    // Garantizar que active y order existan para cumplir la consulta de la Cloud Function
    const payload = {
      active: true,
      order: index + 1,
      ...data,
    };

    const docRef = collection.doc(docId);
    const docSnap = await docRef.get();

    if (docSnap.exists) {
      await docRef.set(payload, { merge: true });
      console.log(`  [Actualizado] "${deck.name}" (${docId})`);
      updated++;
    } else {
      await docRef.set(payload);
      console.log(`  [Insertado] "${deck.name}" (${docId})`);
      inserted++;
    }
  }

  // Listar estado final
  const allDocs = await collection.get();
  console.log(`\nEstado final en prebuiltDecks (${allDocs.size} documentos):`);
  allDocs.docs.forEach(d => {
    const data = d.data();
    console.log(`  - ${d.id}: active=${data.active}, order=${data.order}, name="${data.name}"`);
  });

  console.log(`\nProceso finalizado: ${inserted} insertados, ${updated} actualizados.`);
}

seedDecks().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});