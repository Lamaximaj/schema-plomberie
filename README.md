# Schéma de principe plomberie

Éditeur de schémas de principe pour chaufferies, sous-stations, locaux eau et réseaux d'eaux pluviales. Tout tient dans une page web autonome : aucun serveur, aucune installation.

## Ce que fait l'outil

- **Bibliothèque de 130 symboles** : robinetterie, sécurité, mesure et régulation, pompes, équipements (chaudière, sous-station vapeur, préparateur ECS, échangeur, bouteille de découplage…), appareils sanitaires, eaux pluviales, ventilation et désenfumage.
- **Orientation comme sur le terrain** : un symbole lâché sur un tuyau s'aligne dans le sens d'écoulement. `R` tourne de 90°, `F` inverse le sens, `Maj+F` passe le corps de l'autre côté du tuyau.
- **Onglet « Raccordement »** sur chaque équipement : points numérotés sur le plan, réseau attendu, état (libre ou raccordé, et vers quoi), accessoires à prévoir, et bouton pour tracer le tuyau depuis le point choisi.
- **Tuyauteries par réseau** (EF, ECS, bouclage, chauffage, gaz, EU, EP, vapeur, air…) avec tracé orthogonal, piquages, sauts aux croisements, flèches de sens et libellés DN. Un tuyau raccordé suit l'équipement qu'on déplace.
- **Mise en page** : légende et nomenclature générées automatiquement, cartouche (lot, phase, indice, date).
- **Exports** PNG, SVG, PDF A4/A3 et JSON. Le travail en cours est gardé dans le navigateur.
- **Exemples** : local eau, chaufferie gaz, eaux pluviales des toitures non accessibles.

## Utiliser en local

```bash
bash build.sh
open dist/index.html   # ou double-clic sur le fichier
```

## Structure

| Fichier | Contenu |
| --- | --- |
| `src/00-entete.html` | Styles et structure de la page |
| `src/10-symboles-et-rendu.js` | Symboles, réseaux, modèle de données, rendu SVG, légende, nomenclature, cartouche |
| `src/20-interactions.js` | Tracé, pose, aimantation sur les tuyaux, orientation, déplacements, historique |
| `src/30-interface.js` | Panneau de propriétés, bibliothèque, menus, exports, sauvegarde, exemples |
| `build.sh` | Assemble `dist/index.html` |

Pour ajouter un symbole : déclarer son dessin dans l'objet `S` (boîte, points de raccordement, fonction `draw`), puis l'ajouter à `PRE_ADD` pour qu'il apparaisse dans la bibliothèque.

## Publication

Le workflow `.github/workflows/pages.yml` construit et publie la page sur GitHub Pages à chaque push sur `main`. À activer une fois dans le dépôt : **Settings > Pages > Source : GitHub Actions**.

## Différences avec la version hébergée sur claude.ai

- « Mes schémas » (enregistrement en ligne) n'est disponible que sur claude.ai. Ici, on enregistre en fichier `.json` et on le rouvre avec Fichier > Ouvrir.
- Les exports se téléchargent directement.
