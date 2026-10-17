/* Régénère les icônes PNG de l'application à partir de pwa/icons/icone.svg : npm i --no-save sharp, puis npm run icones */
const sharp = require('sharp'), fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', 'pwa', 'icons'), src = fs.readFileSync(path.join(dir, 'icone.svg'), 'utf8');
/* Version pleine page (masquable, Apple) : fond vert jusqu'aux bords, dessin réduit au centre (zone sûre de 80 %) */
const plein = src.replace('<rect width="512" height="512" rx="112" fill="#2b7a3b"/>', '<rect width="512" height="512" fill="#2b7a3b"/><g transform="translate(51.2 51.2) scale(0.8)">').replace('</svg>', '</g></svg>');
(async () => {
  await sharp(Buffer.from(src)).resize(192, 192).png().toFile(path.join(dir, 'icone-192.png'));
  await sharp(Buffer.from(src)).resize(512, 512).png().toFile(path.join(dir, 'icone-512.png'));
  await sharp(Buffer.from(plein)).resize(512, 512).png().toFile(path.join(dir, 'icone-maskable-512.png'));
  await sharp(Buffer.from(plein)).resize(180, 180).png().toFile(path.join(dir, 'apple-touch-icon.png'));
  console.log('Icônes régénérées dans pwa/icons/');
})();
