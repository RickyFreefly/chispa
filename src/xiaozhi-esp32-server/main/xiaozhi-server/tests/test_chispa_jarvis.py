import os, sys, unittest
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from core.chispa import jarvis
from core.chispa.jarvis import JarvisError, consultar


def ok(texto):
    return lambda url, cuerpo, timeout: {"choices": [{"message": {"content": texto}}]}


class T(unittest.TestCase):
    def test_respuesta_normal(self):
        self.assertEqual(consultar("calcula 2+2", http_post=ok("Son 4.")), "Son 4.")

    def test_compacta_espacios_y_recorta(self):
        r = consultar("x", http_post=ok("una  \n\n respuesta " + "larga " * 200))
        self.assertNotIn("\n", r)
        self.assertLessEqual(len(r), jarvis.MAX_LARGO)

    def test_manda_instruccion_y_peticion(self):
        visto = {}
        def espia(url, cuerpo, timeout):
            visto.update(cuerpo, url=url)
            return {"choices": [{"message": {"content": "ok"}}]}
        consultar("  investiga el dólar  ", http_post=espia)
        self.assertTrue(visto["url"].endswith("/v1/chat/completions"))
        self.assertEqual(visto["messages"][0]["role"], "system")
        self.assertEqual(visto["messages"][1]["content"], "investiga el dólar")

    def test_peticion_vacia(self):
        with self.assertRaises(JarvisError):
            consultar("   ")

    def test_servidor_caido(self):
        def cae(url, cuerpo, timeout):
            raise OSError("conexión rechazada")
        with self.assertRaises(JarvisError) as c:
            consultar("x", http_post=cae)
        self.assertEqual(str(c.exception), jarvis.NO_DISPONIBLE)

    def test_respuesta_vacia(self):
        with self.assertRaises(JarvisError):
            consultar("x", http_post=ok(""))


if __name__ == "__main__":
    unittest.main()
