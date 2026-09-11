console.log('FIRESTORE_EMULATOR_HOST =', process.env.FIRESTORE_EMULATOR_HOST);
console.log('NODE_ENV =', process.env.NODE_ENV);
console.log('GCLOUD_PROJECT_ID =', process.env.GCLOUD_PROJECT_ID);
console.log('PORT =', process.env.PORT);
console.log('FUNCTIONS_EMULATOR =', process.env.FUNCTIONS_EMULATOR);
console.log('All env keys:', Object.keys(process.env).filter(k => k.includes('FIRE') || k.includes('EMULATOR') || k.includes('FUNCTIONS')));
