#!/usr/bin/env bash
# Prepara el servidor local del robot (Mac). Se puede repetir sin problema.
set -u
RAIZ="$(cd "$(dirname "$0")" && pwd)"
SERVIDOR="$RAIZ/src/xiaozhi-esp32-server/main/xiaozhi-server"

echo "== 1/4 Modelo de lenguaje (Ollama) =="
command -v ollama >/dev/null || { echo "Ollama no encontrado"; exit 1; }
RAM_GB=$(( $(sysctl -n hw.memsize) / 1073741824 ))
if [ "$RAM_GB" -ge 16 ]; then MODELO="qwen2.5:7b"; else MODELO="qwen2.5:3b"; fi
echo "RAM: ${RAM_GB} GB -> modelo: $MODELO"
ollama list >/dev/null 2>&1 || { echo "Inicia Ollama (abre la app o ejecuta: ollama serve &) y repite"; exit 1; }
ollama pull "$MODELO"
sed -i '' "s/model_name: qwen2.5:.*/model_name: $MODELO/" "$SERVIDOR/data/.config.yaml"

echo "== 2/4 Voz a texto (Vosk, español) =="
mkdir -p "$SERVIDOR/models/vosk" && cd "$SERVIDOR/models/vosk"
if [ ! -d vosk-model-small-es-0.42 ]; then
  curl -fL -O https://alphacephei.com/vosk/models/vosk-model-small-es-0.42.zip && unzip -q vosk-model-small-es-0.42.zip && rm vosk-model-small-es-0.42.zip
fi
ls vosk-model-small-es-0.42 >/dev/null && echo "Vosk listo"

echo "== 3/4 Dependencias Python del servidor =="
cd "$SERVIDOR"
python3 -m venv .venv && source .venv/bin/activate
pip install -q -r requirements.txt && echo "Dependencias listas"

echo "== 4/4 Texto a voz (Kokoro, docker) =="
if command -v docker >/dev/null; then
  docker info >/dev/null 2>&1 || colima start
  docker rm -f kokoro >/dev/null 2>&1
  docker run -d --name kokoro -p 8880:8880 ghcr.io/remsky/kokoro-fastapi-cpu:latest
else
  echo "Docker no encontrado: instala Colima/Docker y repite este paso"
fi

echo
echo "Listo. Falta: poner la IP de tu Mac en data/.config.yaml (192.168.X.X)."
echo "Tu IP WiFi: $(ipconfig getifaddr en0 2>/dev/null)"
