# Consignes pour ce dépôt

- Application : une seule page (`dist/index.html`) assemblée par `build.sh` à partir de `src/` ; textes de l'interface et commentaires en français.
- Avant toute demande de fusion : `npm test` (construit la page et lance `tests/e2e.cjs` dans Chromium). Les tests tournent aussi sur chaque demande de fusion.
- Modifier le dessin d'un symbole existant (fonction `draw` d'un élément de `S`, ou ses réglages) : relancer `npm run signatures` pour garder rouvrables les SVG exportés avant la modification, puis committer `src/24-signatures-anciennes.js`. Le bloc `<empreintes>` de `src/26-import-svg.js` est réutilisé par ce script dans les anciennes versions : il ne doit dépendre que de l'objet `api` qu'on lui passe.
- Format des exports : chaque export porte les données du schéma (`payload()` dans `src/25-fichiers.js`) ; ne pas retirer ce bloc des SVG, PNG (iTXt `schema-plomberie`) et PDF (métadonnées XMP).
- Nouveau fichier livré avec la page (bibliothèque, police, icône) : l'ajouter à la liste `FICHIERS` de `pwa/sw.js` pour qu'il reste disponible hors connexion.
