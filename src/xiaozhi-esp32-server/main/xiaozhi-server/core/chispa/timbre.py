"""Efecto de carácter para la voz de Chispa.

Aplica, con ffmpeg, un tono levemente más alto, un toque de brillo y una
compresión suave, para que cualquier voz de Kokoro suene a «la voz de Chispa».
Si ffmpeg no está instalado o falla, devuelve el audio tal cual.
"""
import shutil
import subprocess

TAG = __name__


def _log():
    try:
        from config.logger import setup_logging
        return setup_logging().bind(tag=TAG)
    except Exception:
        class _N:
            def warning(self, *a, **k): pass
        return _N()

PREDETERMINADO = {
    "activo": True,
    "tono": 1.03,        # 1.0 = sin cambio; 1.03 = 3 % más agudo (dura lo mismo)
    "brillo_db": 2.0,    # realce suave alrededor de 3 kHz
    "compresion": True,  # pareja el volumen entre frases
}
_TASA = 48000
_avisado = False


def cadena_filtros(cfg):
    """Arma el filtro de ffmpeg según la configuración."""
    partes = [f"aresample={_TASA}"]
    tono = float(cfg.get("tono", 1.0) or 1.0)
    if tono and abs(tono - 1.0) > 0.001:
        partes += [f"asetrate={int(_TASA * tono)}", f"aresample={_TASA}", f"atempo={1.0 / tono:.6f}"]
    brillo = float(cfg.get("brillo_db", 0) or 0)
    if brillo:
        partes.append(f"equalizer=f=3000:t=q:w=1:g={brillo:g}")
    if cfg.get("compresion"):
        partes.append("acompressor=threshold=-18dB:ratio=3:attack=5:release=120:makeup=2")
    return ",".join(partes)


def aplicar_timbre(datos, cfg=None, formato="mp3"):
    """Procesa los bytes de audio; ante cualquier problema devuelve el original."""
    global _avisado
    cfg = {**PREDETERMINADO, **(cfg or {})}
    if not cfg.get("activo") or not datos:
        return datos
    if not shutil.which("ffmpeg"):
        if not _avisado:
            _avisado = True
            _log().warning(
                "ffmpeg no está instalado; la voz sale sin el efecto de Chispa (brew install ffmpeg)")
        return datos
    try:
        r = subprocess.run(
            ["ffmpeg", "-v", "error", "-i", "pipe:0", "-af", cadena_filtros(cfg),
             "-f", formato, "pipe:1"],
            input=datos, capture_output=True, timeout=30)
        if r.returncode == 0 and r.stdout:
            return r.stdout
        _log().warning(f"Efecto de voz falló: {r.stderr.decode()[:200]}")
    except Exception as e:
        _log().warning(f"Efecto de voz falló: {e}")
    return datos
