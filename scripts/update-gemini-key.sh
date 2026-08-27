#!/usr/bin/env bash
set -euo pipefail

# Updates the Gemini API key in the local functions .env AND in Firebase
# Secret Manager (re-binding deployed functions to the new value with --force).
#
# Usage:
#   bash scripts/update-gemini-key.sh            # update local + Firebase
#   bash scripts/update-gemini-key.sh --local-only  # update only the local .env
#
# The key is read hidden from stdin and is NEVER printed to stdout/logs.

RUN_FIREBASE=true
if [[ "${1:-}" == "--local-only" ]]; then
  RUN_FIREBASE=false
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../backend/src/functions/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: $ENV_FILE not found. Are you at the repo root?" >&2
  exit 1
fi

printf "Nueva Gemini API Key: "
read -r -s KEY
echo

if [[ -z "$KEY" ]]; then
  echo "ERROR: la key no puede estar vacía." >&2
  exit 1
fi

export GEMINI_NEW="$KEY"

if grep -q '^GEMINI_API_KEY=.\+' "$ENV_FILE"; then
  perl -i -pe 's/^GEMINI_API_KEY=.*/GEMINI_API_KEY=$ENV{GEMINI_NEW}/' "$ENV_FILE"
else
  echo "GEMINI_API_KEY=$KEY" >> "$ENV_FILE"
fi

if grep -q '^GEMINI_API_KEY=.\+' "$ENV_FILE"; then
  echo "[OK] .env local actualizado"
else
  echo "ERROR: no se pudo escribir la key en $ENV_FILE" >&2
  exit 1
fi

if [[ "$RUN_FIREBASE" == true ]]; then
  printf '%s' "$KEY" | firebase functions:secrets:set GEMINI_API_KEY --data-file - --force || {
    echo "ERROR: falló al actualizar el secreto en Firebase." >&2
    exit 1
  }
  echo "[OK] Secreto de Firebase actualizado (nueva versión creada)"
  echo ""
  echo "IMPORTANTE: las functions desplegadas siguen usando la versión anterior."
  echo "Cuando quieras aplicarlo en producción ejecuta:"
  echo "  firebase deploy --only functions"
fi

echo "LISTO. Reinicia los emuladores (Ctrl+C y 'npm run emulators') para aplicar en local."