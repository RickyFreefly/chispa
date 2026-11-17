# Despliegue — dónde y cómo publicar Chispa para el público

La URL del servidor **se graba en el firmware al compilar**, así que el modelo de
despliegue se decide **antes** de flashear el primer robot.

## Qué necesita un robot ya flasheado

El ESP32 solo necesita alcanzar dos servicios desde la red del cliente:

| Servicio | Protocolo | Para qué |
|---|---|---|
| **Endpoint OTA** | HTTP/HTTPS | Al encender, el robot lo consulta: le dice dónde está el servidor de voz y le entrega actualizaciones de firmware. Es el control remoto sobre los robots vendidos. |
| **Servidor de voz** | WebSocket (`ws://` o `wss://`) | El `xiaozhi-server` de este repo: audio de ida y vuelta, Vosk + Ollama + Kokoro, organizador, reposo. |

La cara corre en la pantalla del propio robot (port a LVGL pendiente), no se publica.
El panel (`manager-web`) y la app (`manager-mobile`) son opcionales.

## Modelo A — Local en casa del cliente (kit educativo)

El cliente instala el servidor en su computador; robot y computador en el mismo WiFi.
El robot se configura con el portal WiFi que trae el firmware xiaozhi (crea una red
temporal y el cliente indica la dirección de su servidor).

- **Pro:** costo cero por uso, privacidad total, cumple la promesa «100 % local».
  Instalar el servidor es parte de la experiencia educativa.
- **Contra:** exige un computador con RAM suficiente (Ollama + Vosk grande) y seguir
  la guía de instalación (`LOCAL_SETUP.md`). No apto para consumidor general.

## Modelo B — Servidor propio en la nube (SaaS)

Dominio propio (ej. `chispa.com.co`) + VPS con TLS (Let's Encrypt, nginx o caddy):

- OTA y servidor de voz publicados como `https://` y `wss://` en ese dominio.
- `manager-api` (incluido en el repo) para registro de dispositivos, código de
  activación por robot y configuración por usuario. Requiere MySQL y Redis.
- **Costos:** VPS chico para OTA + manager ≈ 10–20 USD/mes. Lo caro es la
  **inferencia** (ASR + LLM + TTS por conversación concurrente): GPU propia o APIs de
  pago por uso. Región São Paulo o us-east para latencia desde Colombia.
- **Pro:** el cliente solo enchufa y configura WiFi. **Contra:** costo mensual por
  usuario y se pierde el «100 % local».

## Modelo C — Híbrido (recomendado para flashear)

Todos los robots se flashean apuntando a **un OTA propio en la nube** (servicio
minúsculo, casi gratis). El OTA dirige a cada robot a su servidor de voz:

- al computador local del cliente, para los kits educativos (modelo A), o
- a la nube propia, para quien pague el servicio (modelo B).

Un mismo firmware sirve para ambos negocios y permite actualizar robots vendidos sin
tocarlos.

## Checklist antes de flashear el primer robot

- [ ] Dominio propio comprado y DNS configurado.
- [ ] OTA publicado con **HTTPS y certificado válido** en ese dominio (el ESP32
      rechaza certificados inválidos).
- [ ] Decidido el modelo (A/B/C) y probada la URL desde una red doméstica.
- [ ] Firmware compilado con nombre y palabra de activación propios (no «Troko»).
- [ ] Carta de no pertinencia de homologación ante la CRC (para vender en Colombia).
- [ ] Probado el flujo completo: encender → portal WiFi → OTA → conversación.
