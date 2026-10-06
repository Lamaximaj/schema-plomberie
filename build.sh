#!/usr/bin/env bash
# Assemble les sources en une seule page autonome : dist/index.html
# Les schémas déposés dans modeles/*.json sont intégrés à la page (Fichier > Modèles).
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
cat src/00-entete.html src/10-symboles-et-rendu.js src/15-fonctions.js "$mod" src/20-interactions.js src/30-interface.js src/99-pied.html > dist/index.html
# Bibliothèques de l’export PDF, servies avec la page
rm -rf dist/vendor && cp -R vendor dist/vendor
# Suivi de l’occupation des logements du 5 rue du Bessin, servi à côté de l’éditeur
rm -rf dist/logements-bessin && cp -R logements-bessin dist/logements-bessin
echo "dist/index.html généré ($(wc -c < dist/index.html) octets)"
