const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Inicializar Firebase Admin SDK para emuladores
admin.initializeApp({
  projectId: 'glimmind-local',
});

const db = admin.firestore();

async function setupEmulatorData() {
  console.log('📝 Configurando datos de ejemplo en emuladores...');

  try {
    // Datos de ejemplo
    const sampleLists = [
      {
        id: 'sample-list-1',
        userId: 'guest-user-123',
        name: 'Frases básicas en inglés',
        concept: 'Vocabulario básico para conversación',
        associations: [
          {
            id: 'assoc-1',
            term: 'Hello',
            definition: 'Hola',
            status: 'DESCONOCIDA',
            history: false
          },
          {
            id: 'assoc-2',
            term: 'Goodbye',
            definition: 'Adiós',
            status: 'DESCUBIERTA',
            history: true
          },
          {
            id: 'assoc-3',
            term: 'Thank you',
            definition: 'Gracias',
            status: 'RECONOCIDA',
            history: true
          },
          {
            id: 'assoc-4',
            term: 'Please',
            definition: 'Por favor',
            status: 'CONOCIDA',
            history: true
          }
        ],
        settings: {
          mode: 'training',
          flipOrder: 'normal',
          threshold: 0.95
        },
        createdAt: Date.now() - 86400000 // Ayer
      },
      {
        id: 'sample-list-2',
        userId: 'guest-user-123',
        name: 'Verbos comunes',
        concept: 'Verbos más utilizados en inglés',
        associations: [
          {
            id: 'assoc-5',
            term: 'to be',
            definition: 'ser/estar',
            status: 'APRENDIDA',
            history: true
          },
          {
            id: 'assoc-6',
            term: 'to have',
            definition: 'tener/haber',
            status: 'CONOCIDA',
            history: true
          },
          {
            id: 'assoc-7',
            term: 'to go',
            definition: 'ir',
            status: 'RECONOCIDA',
            history: true
          }
        ],
        settings: {
          mode: 'training',
          flipOrder: 'reversed',
          threshold: 0.90
        },
        createdAt: Date.now() - 172800000 // Anteayer
      }
    ];

    // Guardar datos en Firestore
    const batch = db.batch();
    
    sampleLists.forEach(list => {
      const docRef = db.collection('lists').doc(list.id);
      batch.set(docRef, list);
    });

    await batch.commit();
    console.log('✅ Datos de ejemplo cargados correctamente');
    console.log(`📋 Se crearon ${sampleLists.length} listas de ejemplo`);

    // Exportar datos para persistencia
    const dataDir = path.join(__dirname, '../emulator-data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    console.log('💾 Datos guardados para persistencia en ./emulator-data');
    
  } catch (error) {
    console.error('❌ Error al configurar datos:', error);
    process.exit(1);
  }
}

// Ejecutar solo si se corre directamente
if (require.main === module) {
  setupEmulatorData().then(() => {
    process.exit(0);
  });
}

module.exports = { setupEmulatorData };