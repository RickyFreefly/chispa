import os, sys, unittest
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from datetime import date, datetime
from core.chispa import info


def ts(y, m, d, h=0, mi=0):
    return datetime(y, m, d, h, mi, tzinfo=info.TZ).timestamp()


class T(unittest.TestCase):
    def test_hora(self):
        self.assertEqual(info.hora_texto(ts(2026, 11, 14, 16, 5)), "Son las 4:05 de la tarde.")
        self.assertEqual(info.hora_texto(ts(2026, 11, 14, 13, 0)), "Es la 1 en punto de la tarde.")
        self.assertEqual(info.hora_texto(ts(2026, 11, 14, 12, 0)), "Es mediodía.")
        self.assertEqual(info.hora_texto(ts(2026, 11, 14, 0, 0)), "Es medianoche.")

    def test_pascua(self):
        self.assertEqual(info.pascua(2026), date(2026, 4, 5))
        self.assertEqual(info.pascua(2025), date(2025, 4, 20))

    def test_festivos_2026(self):  # lista oficial de Colombia 2026
        f = info.festivos(2026)
        esperados = {date(2026, 1, 1), date(2026, 1, 12), date(2026, 3, 23), date(2026, 4, 2), date(2026, 4, 3), date(2026, 5, 1),
                     date(2026, 5, 18), date(2026, 6, 8), date(2026, 6, 15), date(2026, 6, 29), date(2026, 7, 20), date(2026, 8, 7),
                     date(2026, 8, 17), date(2026, 10, 12), date(2026, 11, 2), date(2026, 11, 16), date(2026, 12, 8), date(2026, 12, 25)}
        self.assertEqual(set(f), esperados)

    def test_proximo_y_dias(self):
        self.assertIn("Todos los Santos", info.proximo_festivo(ts(2026, 10, 20)))
        self.assertIn("Navidad", info.proximo_festivo(ts(2026, 12, 9)))
        self.assertIn("Año Nuevo", info.proximo_festivo(ts(2026, 12, 26)))   # cruza de año
        self.assertEqual(info.dias_para("25/12", ts(2026, 12, 24)), "Es mañana.")
        self.assertIn("Faltan 41 días", info.dias_para("25/12", ts(2026, 11, 14)))
        with self.assertRaises(info.InfoError): info.dias_para("nunca")

    def test_fecha_festivo(self):
        self.assertIn("festivo", info.fecha_texto(ts(2026, 12, 25, 10)))
        self.assertNotIn("festivo", info.fecha_texto(ts(2026, 11, 14, 10)))

    def _svc(self, fail=False):
        calls = []
        def get(url):
            calls.append(url)
            if fail: raise OSError("sin red")
            if "geocoding" in url: return {"results": [{"name": "Medellín", "latitude": 6.25, "longitude": -75.56}]}
            return {"current": {"temperature_2m": 22.4, "apparent_temperature": 23, "weather_code": 63, "precipitation": 1},
                    "daily": {"weather_code": [63, 3], "temperature_2m_max": [24, 26], "temperature_2m_min": [16, 17], "precipitation_probability_max": [80, 20]}}
        t = [0]
        return info.WeatherService(get, lambda: t[0]), calls, t

    def test_clima(self):
        s, calls, _ = self._svc()
        r = s.clima("Medellín", "hoy")
        self.assertIn("Medellín", r); self.assertIn("22 grados", r); self.assertIn("con lluvia", r); self.assertIn("paraguas", r)
        self.assertIn("nublado", s.clima("Medellín", "mañana"))
        n = len(calls); s.clima("Medellín", "hoy"); self.assertEqual(len(calls), n)   # caché
        self.assertIn("Bogotá", s.clima("", "hoy"))

    def test_clima_sin_red(self):
        s, _, _ = self._svc(fail=True)
        with self.assertRaises(info.InfoError): s.clima("Cali")

    def test_clima_sin_red_usa_cache_vieja(self):
        s, calls, t = self._svc(); s.clima("", "hoy")
        s.http_get = lambda u: (_ for _ in ()).throw(OSError()); t[0] = 9999
        self.assertIn("Bogotá", s.clima("", "hoy"))

    def test_panel(self):
        s, _, _ = self._svc(); info._weather = s
        p = info.panel(ts(2026, 11, 14, 10))
        self.assertEqual(p["clima"]["temp"], 22); self.assertIsNone(p["error"]); self.assertGreaterEqual(p["proximo"]["dias"], 0)
        s2, _, _ = self._svc(fail=True); info._weather = s2
        p = info.panel(ts(2026, 11, 14, 10))
        self.assertIsNone(p["clima"]); self.assertTrue(p["error"]); self.assertTrue(p["proximo"]["nombre"])


if __name__ == "__main__":
    unittest.main()
