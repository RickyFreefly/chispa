#!/usr/bin/env bash
# Arranca el servidor local del robot (Mac).
cd "$(dirname "$0")/src/xiaozhi-esp32-server/main/xiaozhi-server" || exit 1
source .venv/bin/activate
DYLD_LIBRARY_PATH=/opt/homebrew/lib exec python app.py
