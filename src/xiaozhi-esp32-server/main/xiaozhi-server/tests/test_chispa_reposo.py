import os, sys, unittest
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from core.chispa import reposo as r


class T(unittest.TestCase):
    def test_dormir(self):
        for t in ("Adiós Chispa", "adios chispa.", "chao chispa", "Hasta luego, chispa", "buenas noches chispa", "adiós chispas"):
            self.assertEqual(r.detectar(t, False)[0], "dormir", t)

    def test_despertar_solo_en_reposo(self):
        for t in ("Hola Chispa", "hola, chispa!", "oye chispa", "hey chispa", "hola chipa"):
            self.assertEqual(r.detectar(t, True)[0], "despertar", t)
            self.assertIsNone(r.detectar(t, False)[0], "despierta lo que ya está despierto: no hace nada")

    def test_despertar_con_pregunta_devuelve_el_resto(self):
        self.assertEqual(r.detectar("Hola Chispa, ¿qué hora es?", True), ("despertar", "que hora es"))

    def test_en_reposo_ignora_todo_lo_demas(self):
        for t in ("qué hora es", "adiós", "chao", "hola", "adiós chispa", "mi amiga chispa"):
            self.assertIsNone(r.detectar(t, True)[0], t)

    def test_despierta_no_se_duerme_con_despedida_suelta(self):
        for t in ("adiós", "chao", "hola chispa", "gracias chispa"):
            self.assertIsNone(r.detectar(t, False)[0], t)


if __name__ == "__main__":
    unittest.main()
