# Servidor 100 % local (Mac) — voz, cerebro y habla sin nube

Arquitectura: robot ESP32 --WiFi--> servidor en tu Mac:
  Vosk (voz a texto, español) -> Ollama (modelo de lenguaje) -> Kokoro (texto a voz)

Todo corre en tu Mac; el robot y el Mac deben estar en la misma red WiFi (2.4 GHz para el robot).

## 1. Modelo de lenguaje (Ollama)
  brew install ollama        # o descarga la app desde ollama.com
  ollama serve &             # si no corre como app
  ollama pull qwen2.5:3b     # ~2 GB; en Macs con 16 GB prueba qwen2.5:7b

## 2. Voz a texto (Vosk, español)
  cd src/xiaozhi-esp32-server/main/xiaozhi-server
  mkdir -p models/vosk && cd models/vosk
  # Descargar de https://alphacephei.com/vosk/models : vosk-model-small-es-0.42
  # y descomprimir aquí, de modo que exista models/vosk/vosk-model-small-es-0.42

## 3. Texto a voz (Kokoro, docker)
  docker run -p 8880:8880 ghcr.io/remsky/kokoro-fastapi-cpu:latest
  # (ya tienes Colima instalado; inicia con: colima start)
  # Probar: curl -X POST http://127.0.0.1:8880/v1/audio/speech -H 'Content-Type: application/json' \
  #   -d '{"input":"Hola, soy tu robot","voice":"ef_dora","response_format":"mp3"}' -o prueba.mp3

## 4. Servidor del robot
  cd src/xiaozhi-esp32-server/main/xiaozhi-server
  python3 -m venv .venv && source .venv/bin/activate
  pip install -r requirements.txt
  # Edita data/.config.yaml: reemplaza 192.168.X.X por la IP de tu Mac
  python app.py

## 5. Firmware
  Compilar el firmware (src/xiaozhi-esp32) apuntando su URL de OTA/servidor a
  http://<IP-de-tu-Mac>:8003/xiaozhi/ota/ (ver docs del repositorio). Requiere ESP-IDF.
  Cambia el nombre y la palabra de activación por los de tu producto (no uses "Troko").

## Verificaciones pendientes
- Calidad de Vosk small en español con ruido de sala (si es pobre, probar modelo grande o Whisper).
- Nombres exactos de voces en español de Kokoro.
- Latencia total de una respuesta (objetivo: menos de 3 s).
