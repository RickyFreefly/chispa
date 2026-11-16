import json, os, sys, types, unittest, asyncio
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
lg = types.ModuleType('config.logger')
class _L:
    def bind(self, **k): return self
    def __getattr__(self, n): return lambda *a, **k: None
lg.setup_logging = lambda: _L()
sys.modules.setdefault('config', types.ModuleType('config')); sys.modules['config.logger'] = lg
from plugins_func.functions import chispa_animaciones as A


class FakeWS:
    def __init__(self): self.sent = []
    async def send(self, m): self.sent.append(json.loads(m))


class Conn:
    def __init__(self):
        self.websocket = FakeWS(); self.loop = asyncio.new_event_loop()
        import threading; threading.Thread(target=self.loop.run_forever, daemon=True).start()


class AnimTest(unittest.TestCase):
    def test_sinonimos_y_frases(self):
        for frase, esperado in [('pelota', 'pelota'), ('Balón', 'pelota'), ('juega con la pelota', 'pelota'), ('contar ovejas', 'ovejas'),
                                ('Ovejitas', 'ovejas'), ('descubre', 'descubre'), ('Investiga', 'descubre'), ('baila', None), ('', None)]:
            self.assertEqual(A.resolver(frase), esperado, frase)

    def test_envia_el_intent_a_la_pagina_y_responde_con_voz(self):
        import time
        for nombre, intent in [('pelota', 'ball'), ('ovejas', 'sheep'), ('descubre', 'discover')]:
            c = Conn(); r = A.mostrar_animacion(c, nombre); time.sleep(0.2)
            self.assertEqual(c.websocket.sent[0]['intent'], intent); self.assertEqual(c.websocket.sent[0]['type'], 'chispa')
            self.assertTrue(r.response and r.response == r.result)
            self.assertLessEqual(c.websocket.sent[0]['durationMs'], 8000)       # la página limita a 8 s

    def test_nombre_desconocido_no_envia_nada(self):
        import time
        c = Conn(); r = A.mostrar_animacion(c, 'baila'); time.sleep(0.1)
        self.assertEqual(c.websocket.sent, []); self.assertIn('pelota', r.response)


if __name__ == '__main__':
    unittest.main()
