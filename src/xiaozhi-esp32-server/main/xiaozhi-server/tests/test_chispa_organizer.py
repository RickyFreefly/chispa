import os, sys, time, unittest
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from core.chispa import organizer as org
from datetime import datetime


def at(h, m=0):
    return datetime(2026, 11, 14, h, m, tzinfo=org.TZ).timestamp()


class T(unittest.TestCase):
    def setUp(self):
        self.s = org.OrganizerStore(":memory:")

    def test_hora(self):
        n = at(6)
        self.assertEqual(org.parse_hora("7 de la mañana", n), at(7))
        self.assertEqual(org.parse_hora("7 pm", n), at(19))
        self.assertEqual(org.parse_hora("19:30", n), at(19, 30))
        self.assertEqual(org.parse_hora("5:00 am", n), at(5) + 86400)   # ya pasó -> mañana
        self.assertEqual(org.parse_hora("mediodía", n), at(12))
        with self.assertRaises(org.OrganizerError): org.parse_hora("blah", n)
        with self.assertRaises(org.OrganizerError): org.parse_hora("25:00", n)

    def test_minutos(self):
        self.assertEqual(org.parse_minutos("5"), 5)
        for bad in ("0", "-3", "abc", "99999"):
            with self.assertRaises(org.OrganizerError): org.parse_minutos(bad)

    def test_limite_8_avisos(self):
        for i in range(8): self.s.add_alert("recordatorio", f"r{i}", time.time() + 99)
        with self.assertRaises(org.OrganizerError): self.s.add_alert("temporizador", "x", time.time() + 99)
        self.s.add_alert("concentracion", "f", time.time() + 99)          # concentración no cuenta
        with self.assertRaises(org.OrganizerError): self.s.add_alert("concentracion", "f2", time.time() + 99)

    def test_vencen_una_sola_vez_y_stop(self):
        a = self.s.add_alert("alarma", "a", 100.0, now=50.0)
        self.assertEqual([x["id"] for x in self.s.due_alerts(now=101.0)], [a["id"]])
        self.assertEqual(self.s.due_alerts(now=200.0), [])
        b = self.s.add_alert("alarma", "b", 1e12); self.s.stop(b["id"])
        self.assertEqual(self.s.active_alerts(), [])

    def test_tareas(self):
        self.s.add_task("comprar pan", "Personal"); self.s.add_task("estudiar ETL", "estudio")
        k, it = self.s.complete("pan"); self.assertEqual(k, "tarea")
        snap = self.s.snapshot()
        self.assertTrue(next(t for t in snap["tasks"] if t["text"] == "comprar pan")["done"])
        self.assertIn("1 tarea pendiente", self.s.resumen_voz())
        with self.assertRaises(org.OrganizerError): self.s.complete("inexistente")

    def test_habitos(self):
        self.s.add_habit("Tomar agua", "8 vasos")
        with self.assertRaises(org.OrganizerError): self.s.add_habit("tomar agua")
        t = time.time()
        self.s.complete("agua", now=t); self.s.complete("agua", now=t)    # idempotente en el día
        h = self.s.snapshot(t)["habits"][0]
        self.assertTrue(h["doneToday"]); self.assertEqual(h["weekCount"], 1)
        self.s.complete("agua", now=t - 86400)
        self.assertEqual(self.s.snapshot(t)["habits"][0]["weekCount"], 2)

    def test_ambigua(self):
        self.s.add_task("llamar a Ana"); self.s.add_task("llamar a Luis")
        with self.assertRaises(org.OrganizerError): self.s.complete("llamar")

    def test_persistencia(self):
        import tempfile
        p = os.path.join(tempfile.mkdtemp(), "o.db")
        org.OrganizerStore(p).add_task("x")
        self.assertEqual(len(org.OrganizerStore(p).snapshot()["tasks"]), 1)

    def test_frases_de_aviso(self):
        f = org.frase_aviso
        self.assertEqual(f({"kind": "recordatorio", "text": "sacar la ropa"}), "Oye, es hora de: sacar la ropa.")
        self.assertEqual(f({"kind": "temporizador", "text": "Temporizador de cinco minutos"}), "Listo, terminó tu temporizador de cinco minutos.")
        self.assertEqual(f({"kind": "alarma", "text": "Alarma"}), "Es la hora de tu alarma.")
        self.assertEqual(f({"kind": "alarma", "text": "Reunión"}), "Es la hora: Reunión.")
        self.assertIn("concentración", f({"kind": "concentracion", "text": "Modo concentración"}))
        for k in ("recordatorio", "temporizador", "alarma", "concentracion"):
            self.assertNotIn("!", f({"kind": k, "text": "x"}))

    def test_hablar_usa_la_voz_y_respeta_a_quien_habla(self):
        from unittest import mock

        class C:
            def __init__(self, hablando):
                self.client_is_speaking, self.tts, self.sentence_id = hablando, object(), None
        hub = org.OrganizerHub(self.s)
        libre = C(False)
        ocupada = C(True)
        hub._conns = {libre, ocupada}
        sp = mock.Mock()
        falso = mock.Mock(speak_txt=sp)          # el módulo real necesita todo el servidor; aquí basta un doble
        with mock.patch.dict(sys.modules, {"core.handle.intentHandler": falso}):
            hub.hablar("hola")
        sp.assert_called_once()
        self.assertIs(sp.call_args[0][0], libre)
        self.assertEqual(sp.call_args[0][1], "hola")
        self.assertTrue(libre.sentence_id)


if __name__ == "__main__":
    unittest.main()
