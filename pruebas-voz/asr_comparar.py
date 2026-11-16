"""Compara motores de reconocimiento sobre tus grabaciones: error de palabras (WER) y tiempo.

    pip install vosk faster-whisper
    # Vosk grande: https://alphacephei.com/vosk/models  (vosk-model-es-0.42) -> descomprimir en pruebas-voz/modelos/
    python3 asr_comparar.py
Los motores cuyo modelo no esté disponible se omiten.
"""
import csv, json, os, re, time, unicodedata, wave

D = os.path.dirname(__file__)
GRAB = os.path.join(D, "grabaciones")
frases = [l.strip() for l in open(os.path.join(D, "frases.txt"), encoding="utf-8") if l.strip()]
SERVER = os.path.join(D, "..", "src", "xiaozhi-esp32-server", "main", "xiaozhi-server", "models", "vosk")


def norm(t):
    t = unicodedata.normalize("NFD", t.lower())
    t = "".join(c for c in t if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9ñ ]", " ", t).split()


def wer(ref, hip):
    r, h = norm(ref), norm(hip)
    d = list(range(len(h) + 1))
    for i in range(1, len(r) + 1):
        p, d[0] = d[0], i
        for j in range(1, len(h) + 1):
            p, d[j] = d[j], min(d[j] + 1, d[j - 1] + 1, p + (r[i - 1] != h[j - 1]))
    return d[len(h)] / max(len(r), 1)


def vosk_motor(ruta):
    from vosk import Model, KaldiRecognizer
    m = Model(ruta)
    def f(wav):
        w = wave.open(wav); rec = KaldiRecognizer(m, 16000)
        while True:
            b = w.readframes(4000)
            if not b: break
            rec.AcceptWaveform(b)
        return json.loads(rec.FinalResult()).get("text", "")
    return f


def whisper_motor(tam):
    from faster_whisper import WhisperModel
    m = WhisperModel(tam, device="cpu", compute_type="int8")
    def f(wav):
        seg, _ = m.transcribe(wav, language="es", beam_size=1, vad_filter=False)
        return " ".join(s.text for s in seg)
    return f


def buscar(*patrones):
    for base in (os.path.join(D, "modelos"), SERVER):
        if os.path.isdir(base):
            for n in sorted(os.listdir(base)):
                if all(p in n for p in patrones):
                    return os.path.join(base, n)


motores = []
rs = buscar("small", "es"); rb = buscar("vosk-model-es-")
if rs: motores.append(("vosk-small", lambda: vosk_motor(rs)))
if rb and rb != rs: motores.append(("vosk-grande", lambda: vosk_motor(rb)))
motores += [("whisper-small", lambda: whisper_motor("small")), ("whisper-medium", lambda: whisper_motor("medium"))]

filas, resumen = [], []
for nombre, crear in motores:
    try: f = crear()
    except Exception as e: print(f"{nombre}: omitido ({e})"); continue
    ws, ts = [], []
    for i, ref in enumerate(frases, 1):
        wav = f"{GRAB}/{i:02d}.wav"
        if not os.path.exists(wav): continue
        t0 = time.time(); hip = f(wav); dt = time.time() - t0
        e = wer(ref, hip); ws.append(e); ts.append(dt)
        filas.append([nombre, i, ref, hip, f"{e:.2f}", f"{dt:.2f}"])
    if ws: resumen.append((nombre, sum(ws) / len(ws), sum(ts) / len(ts)))
with open(os.path.join(D, "resultados_asr.csv"), "w", newline="", encoding="utf-8") as fh:
    csv.writer(fh).writerows([["motor", "frase", "esperado", "transcrito", "wer", "segundos"]] + filas)
print(f"\n{'motor':<16}{'WER medio':>10}{'seg/frase':>11}")
for n, w, t in resumen: print(f"{n:<16}{w:>10.1%}{t:>11.2f}")
print("Detalle: resultados_asr.csv")
