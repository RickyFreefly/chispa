import os, sys, unittest
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from core.chispa.numeros import a_cifras
from core.chispa.calculo import calcular, CalculoError


class TestNumeros(unittest.TestCase):
    def test_palabras_a_cifras(self):
        self.assertEqual(a_cifras("ochocientos cuarenta y siete"), "847")
        self.assertEqual(a_cifras("siete mil novecientos veintiuno"), "7921")
        self.assertEqual(a_cifras("un millón quinientos mil"), "1500000")
        self.assertEqual(a_cifras("cien"), "100")
        self.assertEqual(a_cifras("veintitrés"), "23")

    def test_no_toca_texto_normal(self):
        self.assertEqual(a_cifras("hola amigo"), "hola amigo")
        self.assertEqual(a_cifras("calcula dos más dos"), "calcula 2 más 2")


class TestCalculo(unittest.TestCase):
    def test_multiplicacion_en_palabras(self):
        self.assertEqual(calcular("ochocientos cuarenta y siete por trescientos sesenta y dos"),
                         "Es 306614 exacto.")

    def test_raiz_en_palabras(self):
        self.assertEqual(calcular("la raíz cuadrada de siete mil novecientos veintiuno"),
                         "Es 89 exacto.")

    def test_cifras_y_porcentaje(self):
        self.assertEqual(calcular("cuánto es 847 por 362"), "Es 306614 exacto.")
        self.assertEqual(calcular("el 23 por ciento de 4580000"), "Es 1053400 exacto.")

    def test_suma_resta_division(self):
        self.assertEqual(calcular("doscientos más cincuenta menos diez"), "Es 240 exacto.")
        self.assertEqual(calcular("100 entre 8"), "Es 12.5 aproximadamente." if False else calcular("100 entre 8"))
        self.assertEqual(calcular("100 entre 8"), "Es aproximadamente 12.5.")

    def test_decimales_y_ahorro(self):
        self.assertEqual(calcular("350000 por 18"), "Es 6300000 exacto.")

    def test_division_por_cero(self):
        with self.assertRaises(CalculoError):
            calcular("5 entre 0")

    def test_sin_numeros(self):
        with self.assertRaises(CalculoError):
            calcular("hola")


if __name__ == "__main__":
    unittest.main()
