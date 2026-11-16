# Pruebas de voz de Chispa

Corre todo en tu Mac (la VM no tiene internet para bajar modelos ni acceso a Kokoro).

1. **Voces (TTS):** `python3 tts_comparar.py` → abre `salida/tts/index.html` y escucha. Compara Kokoro (ef_dora, em_alex) con Edge colombiano (Salomé, Gonzalo).
2. **Reconocimiento (ASR):** `python3 asr_grabar.py` (lees 20 frases) y luego `python3 asr_comparar.py` → tabla de error y tiempo por motor.
   Para Vosk grande, descarga `vosk-model-es-0.42` de alphacephei.com/vosk/models y descomprímelo en `modelos/`.

Decide con estos criterios: ASR con WER bajo y menos de ~1 s por frase; voz que suene natural y tarde menos de ~1 s en la primera frase.
