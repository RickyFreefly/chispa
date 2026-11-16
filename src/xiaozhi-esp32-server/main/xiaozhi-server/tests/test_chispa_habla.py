import unittest
from core.chispa.habla import normalizar_para_voz as n, numero_a_palabras as w


class TestHabla(unittest.TestCase):
    def test_numeros(self):
        self.assertEqual(w(0), "cero")
        self.assertEqual(w(21), "veintiuno")
        self.assertEqual(w(45), "cuarenta y cinco")
        self.assertEqual(w(100), "cien")
        self.assertEqual(w(101), "ciento uno")
        self.assertEqual(w(1000), "mil")
        self.assertEqual(w(21000), "veintiún mil")
        self.assertEqual(w(1500000), "un millón quinientos mil")

    def test_horas(self):
        self.assertEqual(n("a las 3:30 pm"), "a las tres y treinta de la tarde")
        self.assertEqual(n("a las 3:30"), "a las tres y treinta de la mañana")
        self.assertEqual(n("a la 1:00"), "a la una de la mañana")
        self.assertEqual(n("a las 15:05"), "a las tres y cinco de la tarde")
        self.assertIn("nueve y quince de la noche", n("21:15"))
        self.assertIn("mediodía", n("12:00"))

    def test_dinero_porcentaje_decimal(self):
        self.assertEqual(n("$50.000"), "cincuenta mil pesos")
        self.assertEqual(n("80%"), "ochenta por ciento")
        self.assertEqual(n("3,5 horas"), "tres coma cinco horas")

    def test_limpieza(self):
        self.assertEqual(n("**Listo** 😀 tarea hecha"), "Listo tarea hecha")
        self.assertEqual(n("25 min"), "veinticinco minutos")


if __name__ == "__main__":
    unittest.main()
