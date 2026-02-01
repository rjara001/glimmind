./kill-ports.sh

firebase emulators:start --only functions,firestore,auth
firebase emulators:start


# Despliegue

firebase deploy --only firestore,functions

# Genera la carpeta /dist
npm run build 

# Sube el sitio a producción
firebase deploy --only hosting