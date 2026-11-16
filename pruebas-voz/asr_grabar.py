"""Graba tu voz leyendo cada frase de frases.txt (16 kHz mono).

    pip install sounddevice soundfile
    python3 asr_grabar.py
Enter para grabar, Enter otra vez para parar. Repite con 'r'. Lee natural, como hablarías con Chispa.
"""
import os, sys
import sounddevice as sd, soundfile as sf, numpy as np

D = os.path.dirname(__file__)
SAL = os.path.join(D, "grabaciones"); os.makedirs(SAL, exist_ok=True)
frases = [l.strip() for l in open(os.path.join(D, "frases.txt"), encoding="utf-8") if l.strip()]
for i, f in enumerate(frases, 1):
    while True:
        print(f"\n[{i}/{len(frases)}] {f}")
        input("  Enter para grabar... ")
        bloques = []
        with sd.InputStream(samplerate=16000, channels=1, dtype="int16", callback=lambda d, *_: bloques.append(d.copy())):
            input("  Grabando... Enter para parar ")
        audio = np.concatenate(bloques) if bloques else np.zeros((1, 1), "int16")
        sf.write(f"{SAL}/{i:02d}.wav", audio, 16000)
        if input("  Enter = ok, r = repetir: ").strip().lower() != "r":
            break
print("Listo. Ahora: python3 asr_comparar.py")
