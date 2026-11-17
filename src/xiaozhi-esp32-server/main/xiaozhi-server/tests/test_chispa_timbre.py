import io
import math
import struct
import unittest
import wave
from unittest import mock

from core.chispa import timbre
from core.chispa.timbre import aplicar_timbre, cadena_filtros


def tono_wav(seg=0.4, hz=440):
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(16000)
        n = int(16000 * seg)
        w.writeframes(b"".join(struct.pack("<h", int(12000 * math.sin(2 * math.pi * hz * i / 16000))) for i in range(n)))
    return buf.getvalue()


class TestTimbre(unittest.TestCase):
    def test_filtros_completos(self):
        f = cadena_filtros({"tono": 1.03, "brillo_db": 2, "compresion": True})
        self.assertIn("asetrate=49440", f)
        self.assertIn("atempo=0.970874", f)
        self.assertIn("equalizer=f=3000", f)
        self.assertIn("acompressor", f)

    def test_sin_tono_ni_brillo(self):
        f = cadena_filtros({"tono": 1.0, "brillo_db": 0, "compresion": False})
        self.assertEqual(f, "aresample=48000")

    def test_desactivado_devuelve_original(self):
        d = b"abc"
        self.assertIs(aplicar_timbre(d, {"activo": False}), d)

    def test_sin_ffmpeg_devuelve_original(self):
        d = b"abc"
        with mock.patch.object(timbre.shutil, "which", return_value=None):
            self.assertIs(aplicar_timbre(d, {}), d)

    def test_procesa_audio_real(self):
        import shutil as sh
        if not sh.which("ffmpeg"):
            self.skipTest("sin ffmpeg")
        d = tono_wav()
        r = aplicar_timbre(d, {"tono": 1.05, "brillo_db": 2, "compresion": True}, formato="wav")
        self.assertGreater(len(r), 1000)
        self.assertNotEqual(r, d)

    def test_error_de_ffmpeg_devuelve_original(self):
        d = b"esto no es audio"
        self.assertIs(aplicar_timbre(d, {}, formato="mp3"), d)


if __name__ == "__main__":
    unittest.main()
