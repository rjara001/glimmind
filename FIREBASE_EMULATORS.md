# Emuladores de Firebase Local

Este proyecto está configurado para usar emuladores de Firebase localmente durante el desarrollo.

## Configuración Inicial

1. **Copiar variables de entorno:**
   ```bash
   cp .env.example .env
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

## Scripts Disponibles

### `npm run emulators`
Inicia solo los emuladores de Firebase (Auth y Firestore) en:
- Auth: http://localhost:9099
- Firestore: http://localhost:8080
- UI: http://localhost:4000

### `npm run dev`
Inicia solo la aplicación de Vite.

### `npm run dev:emu`
Inicia tanto los emuladores como la aplicación simultáneamente.

### `npm run seed:emu`
Carga datos de ejemplo en los emuladores de Firestore.

## Flujo de Trabajo Recomendado

### Primera vez:
```bash
# 1. Iniciar emuladores en una terminal
npm run emulators

# 2. En otra terminal, cargar datos de ejemplo
npm run seed:emu

# 3. Iniciar la aplicación
npm run dev
```

### Desarrollo diario:
```bash
# Inicia todo junto (emuladores + app)
npm run dev:emu
```

## Acceso a Emuladores

- **Firestore Emulator UI**: http://localhost:4000
  - Puedes ver y editar los datos directamente aquí
- **Auth Emulator**: http://localhost:9099
  - Para pruebas de autenticación

## Datos Persistidos

Los datos de los emuladores se guardan en `./emulator-data/` para persistencia entre sesiones.

## Variables de Entorno

Las variables están configuradas para desarrollo local por defecto. Para producción:

1. Crea un proyecto en Firebase Console
2. Copia las credenciales a tu archivo `.env`
3. Elimina o comenta la configuración de emuladores en `firebase.ts`

## Problemas Comunes

### "Emuladores ya conectados"
Es normal ver este mensaje cuando la app se reconecta a los emuladores.

### "Puerto en uso"
Asegúrate de que los puertos 9099, 8080 y 4000 estén libres.

### Datos no persisten
Ejecuta `npm run seed:emu` después de iniciar los emuladores.