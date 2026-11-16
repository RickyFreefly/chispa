# Guía de montaje (resumen) — fuente: https://trokotec.com/troko/build

Piezas: ESP32-S3 N16R8, pantalla ST7789 240x240 (SPI), micrófono INMP441 (I2S),
amplificador MAX98357A (I2S), parlante 4-8 ohm 2-3 W, 2 pulsadores, LED + 220 ohm (opcional).

| Módulo | Pin | ESP32-S3 |
|---|---|---|
| Pantalla | SDA/MOSI | GPIO 8 |
| Pantalla | SCL/CLK | GPIO 9 |
| Pantalla | CS | GPIO 11 |
| Pantalla | DC | GPIO 12 |
| Pantalla | RES | GPIO 13 |
| Pantalla | BLK | GPIO 10 |
| Pantalla | VCC / GND | 3V3 / GND |
| Micrófono | SCK | GPIO 42 |
| Micrófono | WS | GPIO 40 |
| Micrófono | SD | GPIO 41 |
| Micrófono | L/R, GND | GND |
| Micrófono | VDD | 3V3 |
| Amplificador | BCLK | GPIO 47 |
| Amplificador | LRC | GPIO 48 |
| Amplificador | DIN | GPIO 21 |
| Amplificador | VIN | 5V |
| Amplificador | SD, GAIN | sin conectar |
| Botón volumen + | | GPIO 38 (otra pata a GND) |
| Botón volumen - | | GPIO 39 (otra pata a GND) |
| LED | | GPIO 14 |
| Botón hablar | BOOT | GPIO 0 (ya en la placa) |

No usar: GPIO 19-20 (USB), 26-37 (flash/PSRAM), 43-44 (serie).
Tierra común obligatoria. Cables cortos en la pantalla. No cruzar BCLK/LRC ni SCK/WS.

Compilar el firmware propio (según la guía, requiere ESP-IDF 6.1):
  python3 scripts/build.py wk-esp32s3-dev --name wk-esp32s3-dev --custom-wake-word troko --language es-ES
(Para tu producto cambia la palabra de activación y el nombre.)

Código fuente abierto (MIT) descargado de GitHub:
  src/xiaozhi-esp32          (firmware)
  src/xiaozhi-esp32-server   (servidor propio: voz a texto, LLM, voz sintética)
