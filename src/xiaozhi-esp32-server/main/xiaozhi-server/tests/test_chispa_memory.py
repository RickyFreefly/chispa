import os, sys, tempfile, types, unittest, asyncio
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
lg = types.ModuleType('config.logger')
class _L:
    def bind(self, **k): return self
    def __getattr__(self, n): return lambda *a, **k: None
lg.setup_logging = lambda: _L()
sys.modules.setdefault('config', types.ModuleType('config')); sys.modules['config.logger'] = lg
cl = types.ModuleType('config.config_loader'); cl.get_project_dir = lambda: ''; sys.modules['config.config_loader'] = cl
from core.providers.memory.mem_chispa.mem_chispa import MemoryProvider, clean_notes, scrub, normalize_person


class Msg:
    def __init__(self, role, content, tmp=False): self.role, self.content, self.is_temporary = role, content, tmp


class FakeLLM:
    def __init__(self, out): self.out, self.calls = out, []
    def response_no_stream(self, system, user, **k): self.calls.append((system, user)); return self.out


def run(c): return asyncio.new_event_loop().run_until_complete(c)


class MemTest(unittest.TestCase):
    def setUp(self):
        self.d = tempfile.TemporaryDirectory()
        self.path = os.path.join(self.d.name, 'm.json')
    def tearDown(self): self.d.cleanup()
    def mk(self, out="- Prefiere que la llamen Sofi\n- Le gustan los dinosaurios", enabled=True):
        m = MemoryProvider({'path': self.path, 'default_enabled': False})
        m.init_memory('dev1', FakeLLM(out)); m.set_enabled(enabled); return m
    CONV = [Msg('system', 'x'), Msg('user', 'Hola, dime Sofi', True), Msg('user', 'Hola, soy Sofi y me gustan los dinosaurios'), Msg('assistant', 'Hola Sofi')]

    def test_apagada_por_defecto_no_guarda_ni_devuelve(self):
        m = self.mk(enabled=False)
        self.assertIsNone(run(m.save_memory(self.CONV)))
        self.assertEqual(run(m.query_memory('x')), '')
        self.assertFalse(os.path.exists(self.path))

    def test_guarda_y_recuerda_en_otra_sesion(self):
        m = self.mk(); run(m.save_memory(self.CONV))
        self.assertIn('Sofi', run(m.query_memory('x')))
        m2 = MemoryProvider({'path': self.path}); m2.init_memory('dev1', FakeLLM('')); m2.set_enabled(True)
        self.assertIn('dinosaurios', run(m2.query_memory('x')))

    def test_el_resumen_ignora_mensajes_temporales_y_pasa_notas_previas(self):
        m = self.mk(); run(m.save_memory(self.CONV))
        _, user = m.llm.calls[0]
        self.assertNotIn('dime Sofi', user); self.assertIn('Persona: Hola, soy Sofi', user)
        run(m.save_memory(self.CONV)); self.assertIn('dinosaurios', m.llm.calls[1][1])

    def test_memoria_separada_por_perfil_y_por_dispositivo(self):
        m = self.mk(); run(m.save_memory(self.CONV))
        m.switch_profile('teacher', self.CONV)            # resume bajo student en segundo plano; teacher parte vacío
        self.assertEqual(run(m.query_memory('x')), '')
        m3 = MemoryProvider({'path': self.path}); m3.init_memory('otro-robot', FakeLLM('')); m3.set_enabled(True)
        self.assertEqual(run(m3.query_memory('x')), '')

    def test_cambio_de_perfil_solo_resume_lo_anterior_al_cambio(self):
        m = self.mk(); import time
        m.switch_profile('teacher', self.CONV); time.sleep(0.3)
        self.assertEqual(len(m.llm.calls), 1)             # lo hablado como student
        run(m.save_memory(self.CONV)); self.assertEqual(len(m.llm.calls), 1)   # nada nuevo tras el límite

    def test_olvidar_borra_perfil_actual_o_todo(self):
        m = self.mk(); run(m.save_memory(self.CONV)); m.switch_profile('teacher', None)
        m.llm.out = '- Es docente de ciencias'; run(m.save_memory(self.CONV))
        self.assertEqual(m.forget(), 1); self.assertEqual(run(m.query_memory('x')), '')
        m.switch_profile('student', None); self.assertIn('Sofi', run(m.query_memory('x')))
        self.assertEqual(m.forget(everything=True), 1); self.assertEqual(m.notes, '')

    def test_privacidad_limpia_contacto_y_limita_tamano(self):
        out = clean_notes('- Escribe a sofi@correo.com\n- Su cel es 300 123 4567\n' + '\n'.join(f'- nota {i}' for i in range(20)), 120)
        self.assertNotIn('@', out); self.assertNotIn('4567', out); self.assertLessEqual(len(out), 120)
        self.assertEqual(clean_notes('NADA', 700), ''); self.assertNotIn('http', scrub('mira https://x.co/a'))

    def test_olvidar_durante_un_resumen_no_lo_resucita(self):
        m = self.mk()
        class Slow(FakeLLM):
            def response_no_stream(s, system, user, **k): m.forget(); return '- algo'
        m.llm = Slow('')
        run(m.save_memory(self.CONV)); self.assertEqual(run(m.query_memory('x')), '')

    def test_cada_persona_tiene_su_memoria_y_olvidar_no_toca_a_otros(self):
        m = self.mk(); m.switch_person('Sofi Ramírez', None)          # solo el primer nombre
        self.assertEqual(m.person, 'sofi')
        m.llm.out = '- Le gustan los dinosaurios'; run(m.save_memory(self.CONV))
        m.switch_person('Pedro', None); self.assertEqual(run(m.query_memory('x')), '')
        m.llm.out = '- Le gusta el fútbol'; run(m.save_memory(self.CONV))
        m.switch_person('sofi', None); self.assertIn('dinosaurios', run(m.query_memory('x')))
        m.forget(everything=True)
        m.switch_person('pedro', None); self.assertIn('fútbol', run(m.query_memory('x')))   # Pedro intacto
        m.switch_person('', None); self.assertEqual(run(m.query_memory('x')), '')            # sin nombre: memoria aparte

    def test_ids_de_dispositivo_con_dos_puntos_no_rompen_las_claves(self):
        m = MemoryProvider({'path': self.path}); m.init_memory('aa:bb:cc:dd', FakeLLM('- Le gusta leer')); m.set_enabled(True)
        m.switch_person('ana', None); run(m.save_memory(self.CONV)); self.assertEqual(m.forget(everything=True), 1)

    def test_normalizar_nombre(self):
        self.assertEqual(normalize_person('  María José Pérez '), 'maría'); self.assertEqual(normalize_person('A1!'), 'a'); self.assertEqual(normalize_person('123'), '')


if __name__ == '__main__':
    unittest.main()
