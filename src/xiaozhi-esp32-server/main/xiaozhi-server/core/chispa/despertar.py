"""Detector de «hola chispa» con Vosk en español y gramática restringida.
Solo puede reconocer unas pocas frases (el resto lo marca como [unk]), así que es mucho más preciso que el dictado libre y
casi no cuesta CPU. Se usa mientras Chispa está en reposo, sin pasar por el VAD ni por el ASR completo."""
import json
import time

from core.chispa import reposo

# Todas las palabras deben existir en el vocabulario del modelo pequeño (comprobado: hola, oye, hey, ey, buenas, chispa, chispas, chispita).
FRASES = ["hola chispa", "oye chispa", "hey chispa", "ey chispa", "buenas chispa", "hola chispas", "hola chispita", "chispa"]
GRAMATICA = json.dumps(FRASES + ["[unk]"], ensure_ascii=False)
SORDERA_TRAS_HABLAR_S = 1.5       # no escucha mientras Chispa habla ni un momento después (para no oír su propio «hola chispa»)


class DetectorDespertar:
    def __init__(self, modelo, sample_rate=16000, recognizer_cls=None):
        if recognizer_cls is None:
            import vosk
            recognizer_cls = vosk.KaldiRecognizer
        self._rec = recognizer_cls(modelo, sample_rate, GRAMATICA)
        self.sordo_hasta = 0.0

    def ensordecer(self, segundos, ahora=None):
        self.sordo_hasta = max(self.sordo_hasta, (ahora if ahora is not None else time.time()) + segundos)
        self._rec.Reset()

    def alimentar(self, pcm, ahora=None):
        """Devuelve True cuando oye «hola chispa» (o parecido). 'pcm' es PCM de 16 bits, 16 kHz, mono."""
        t = ahora if ahora is not None else time.time()
        if t < self.sordo_hasta:
            return False
        if self._rec.AcceptWaveform(pcm):
            texto = json.loads(self._rec.Result()).get("text", "")
        else:
            texto = json.loads(self._rec.PartialResult()).get("partial", "")
        if texto and reposo.detectar(texto, True)[0] == "despertar" or texto.strip() == "chispa":
            self._rec.Reset()
            return True
        return False
