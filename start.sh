#!/bin/sh
# EVOLVE Web Build Lab - run locally on http://localhost:8765
cd "$(dirname "$0")"
if command -v node >/dev/null 2>&1; then exec node server.js 8765; fi
if command -v python3 >/dev/null 2>&1; then exec python3 -m http.server 8765; fi
echo "Install Node.js or Python, or open index.html directly."
