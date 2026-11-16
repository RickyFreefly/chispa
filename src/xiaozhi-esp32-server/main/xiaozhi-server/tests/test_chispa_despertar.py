import json, os, sys, unittest
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from core.chispa import despertar as d


class Falso:
    """Doble de KaldiRecognizer: devuelve parciales/resultados guionados."""
    def __init__(self, modelo, sr, gramatica):
        self.gramatica, self.guion, self.resets = gramatica, [], 0
    def AcceptWaveform(self, pcm):
        return self.guion and self.guion[0][0] == "final"
    def Result(self):
        return json.dumps({"text": self.guion.pop(0)[1]})
    def PartialResult(self):
        return json.dumps({"partial": self.guion.pop(0)[1] if self.guion else ""})
    def Reset(self):
        self.resets += 1


def det(*guion):
    x = d.DetectorDespertar(None, recognizer_cls=Falso)
    x._rec.guion = list(guion)
    return x


class T(unittest.TestCase):
    def test_gramatica_solo_frases_de_despertar(self):
        g = json.loads(d.GRAMATICA)
        self.assertIn("hola chispa", g); self.assertIn("[unk]", g)
        self.assertTrue(all("chispa" in f or "chispas" in f or "chispita" in f or f == "[unk]" for f in g))

    def test_despierta_con_el_parcial(self):
        x = det(("parcial", "hola chispa"))
        self.assertTrue(x.alimentar(b"\0" * 3200, ahora=100))

    def test_despierta_con_el_resultado_final(self):
        self.assertTrue(det(("final", "oye chispa")).alimentar(b"\0", ahora=100))

    def test_ignora_ruido_y_otras_frases(self):
        for t in ("", "[unk]", "hola", "chispas de colores"):
            self.assertFalse(det(("parcial", t)).alimentar(b"\0", ahora=100), t)

    def test_sordera_evita_oir_su_propia_voz(self):
        x = det(("parcial", "hola chispa"))
        x.ensordecer(6, ahora=100)
        self.assertFalse(x.alimentar(b"\0", ahora=103))
        x._rec.guion = [("parcial", "hola chispa")]
        self.assertTrue(x.alimentar(b"\0", ahora=107))

    def test_se_reinicia_tras_despertar(self):
        x = det(("parcial", "hola chispa"))
        n = x._rec.resets
        x.alimentar(b"\0", ahora=100)
        self.assertEqual(x._rec.resets, n + 1)


if __name__ == "__main__":
    unittest.main()
