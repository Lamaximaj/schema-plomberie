#!/usr/bin/env bash
# Assemble les sources en une seule page autonome : dist/index.html
# Les schémas déposés dans modeles/*.json sont intégrés à la page (Fichier > Modèles).
# Copie aussi vendor/ (export PDF) et les fichiers de l'application installable (pwa/) ; sw.js reçoit l'empreinte de la publication.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p dist
mod=$(mktemp)
trap 'rm -f "$mod"' EXIT
{
  echo '/* ===== Modèles intégrés depuis modeles/*.json (généré par build.sh) ===== */'
  echo 'const MODELES = ['
  for f in modeles/*.json; do
    [ -e "$f" ] || continue
    printf '{ file: "%s", doc: ' "$(basename "$f" .json)"
    sed 's#</#<\\/#g' "$f"
    printf ' },\n'
  done
  echo '];'
} > "$mod"
cat src/00-entete.html src/10-symboles-et-rendu.js src/15-fonctions.js "$mod" src/20-interactions.js \
  src/24-signatures-anciennes.js src/25-fichiers.js src/26-import-svg.js src/30-interface.js src/99-pied.html > dist/index.html
# Bibliothèques de l’export PDF, servies avec la page
rm -rf dist/vendor dist/icons && cp -R vendor dist/vendor && cp -R pwa/icons dist/icons && cp pwa/manifest.webmanifest dist/
# Service worker : une empreinte par publication pour que la nouvelle version s'installe
version=$(cat dist/index.html dist/manifest.webmanifest dist/vendor/* dist/icons/* pwa/sw.js | cksum | cut -d' ' -f1)
sed "s/__VERSION__/$version/" pwa/sw.js > dist/sw.js
echo "dist/index.html généré ($(wc -c < dist/index.html) octets), version $version"
