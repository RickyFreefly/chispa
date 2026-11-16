"""Genera las mismas frases con varias voces para compararlas de oído.

Uso (en tu Mac, con Kokoro corriendo en Docker):
    pip install requests edge-tts
    python3 tts_comparar.py
Abre salida/tts/index.html en el navegador y escucha frase por frase.
"""
import asyncio, os, sys, time, html
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src",
                                "xiaozhi-esp32-server", "main", "xiaozhi-server"))
from core.chispa.habla import normalizar_para_voz
import requests

KOKORO = "http://127.0.0.1:8880/v1/audio/speech"
VOCES_KOKORO = [("kokoro-ef_dora", "ef_dora"), ("kokoro-em_alex", "em_alex")]
VOCES_EDGE = [("edge-Salome-CO", "es-CO-SalomeNeural"), ("edge-Gonzalo-CO", "es-CO-GonzaloNeural")]
SALIDA = os.path.join(os.path.dirname(__file__), "salida", "tts")
frases = [l.strip() for l in open(os.path.join(os.path.dirname(__file__), "frases.txt"), encoding="utf-8") if l.strip()]
tiempos = {}


def kokoro(nombre, voz, i, texto):
    t0 = time.time()
    r = requests.post(KOKORO, json={"input": texto, "voice": voz, "lang_code": "e",
                                    "response_format": "mp3", "speed": 0.95, "stream": False}, timeout=60)
    r.raise_for_status()
    open(f"{SALIDA}/{nombre}/{i:02d}.mp3", "wb").write(r.content)
    tiempos.setdefault(nombre, []).append(time.time() - t0)


async def edge(nombre, voz, i, texto):
    import edge_tts
    t0 = time.time()
    await edge_tts.Communicate(texto, voz, rate="-5%").save(f"{SALIDA}/{nombre}/{i:02d}.mp3")
    tiempos.setdefault(nombre, []).append(time.time() - t0)


async def main():
    for n, _ in VOCES_KOKORO + VOCES_EDGE:
        os.makedirs(f"{SALIDA}/{n}", exist_ok=True)
    for i, f in enumerate(frases, 1):
        txt = normalizar_para_voz(f)
        for n, v in VOCES_KOKORO:
            try: kokoro(n, v, i, txt)
            except Exception as e: print("Kokoro falló:", n, e); break
        for n, v in VOCES_EDGE:
            try: await edge(n, v, i, txt)
            except Exception as e: print("Edge falló:", n, e)
    nombres = [n for n, _ in VOCES_KOKORO + VOCES_EDGE if os.path.exists(f"{SALIDA}/{n}/01.mp3")]
    filas = "".join(
        f"<tr><td>{i}. {html.escape(f)}</td>" + "".join(
            f"<td><audio controls preload='none' src='{n}/{i:02d}.mp3'></audio></td>" for n in nombres) + "</tr>"
        for i, f in enumerate(frases, 1))
    cab = "".join(f"<th>{n}</th>" for n in nombres)
    open(f"{SALIDA}/index.html", "w", encoding="utf-8").write(
        f"<meta charset=utf-8><body style='font:14px sans-serif'><table border=1 cellpadding=6><tr><th>Frase</th>{cab}</tr>{filas}</table>")
    print("\nTiempo medio por frase (s):")
    for n, ts in tiempos.items():
        print(f"  {n}: {sum(ts)/len(ts):.2f}")
    print("Abre", f"{SALIDA}/index.html")

asyncio.run(main())
