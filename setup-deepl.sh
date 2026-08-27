#!/bin/bash
# setup-deepl.sh — Configurar DeepL API Key para glimmind
set -e

ENV_FILE="backend/src/functions/.env"

echo "=== DeepL API Key Setup ==="
echo ""
read -s -p "Pega tu DeepL API Key: " DEEPL_KEY
echo ""

if [ -z "$DEEPL_KEY" ]; then
  echo "Error: no se proporcionó una API key."
  exit 1
fi

# .env local
if [ -f "$ENV_FILE" ]; then
  if grep -q "^DEEPL_API_KEY=" "$ENV_FILE"; then
    sed -i '' "s/^DEEPL_API_KEY=.*/DEEPL_API_KEY=$DEEPL_KEY/" "$ENV_FILE"
    echo "✅ .env actualizado"
  else
    echo "DEEPL_API_KEY=$DEEPL_KEY" >> "$ENV_FILE"
    echo "✅ DEEPL_API_KEY agregado a .env"
  fi
else
  echo "DEEPL_API_KEY=$DEEPL_KEY" > "$ENV_FILE"
  echo "✅ .env creado con DEEPL_API_KEY"
fi

# Firebase secret
echo ""
echo "Configurando secreto de Firebase..."
echo "$DEEPL_KEY" | firebase functions:secrets:set DEEPL_API_KEY

echo ""
echo "=== Listo ==="
echo "  - Emulador: 'firebase emulators:start'"
echo "  - Producción: secreto configurado"
