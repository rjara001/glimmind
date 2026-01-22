const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔥 Iniciando emuladores de Firebase...');

try {
  // Verificar si firebase.json existe
  if (!fs.existsSync('firebase.json')) {
    console.error('❌ No se encuentra firebase.json');
    process.exit(1);
  }

  // Iniciar emuladores
  execSync('firebase emulators:start --only auth,firestore', {
    stdio: 'inherit',
    cwd: __dirname
  });

} catch (error) {
  console.error('❌ Error al iniciar emuladores:', error.message);
  process.exit(1);
}