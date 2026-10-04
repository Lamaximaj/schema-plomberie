#!/usr/bin/env bash
# Assemble les sources en une seule page autonome : dist/index.html
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p dist
cat src/00-entete.html src/10-symboles-et-rendu.js src/20-interactions.js src/30-interface.js src/99-pied.html > dist/index.html
echo "dist/index.html généré ($(wc -c < dist/index.html) octets)"
