# Schéma de principe plomberie

Éditeur de schémas de principe pour chaufferies, sous-stations, locaux eau et réseaux d'eaux pluviales. Tout tient dans une page web autonome : aucun serveur, aucune installation.

## Ce que fait l'outil

- **Bibliothèque de 143 symboles** : robinetterie, sécurité, mesure et régulation, pompes, équipements (chaudière, sous-station vapeur, préparateur ECS, échangeur, bouteille de découplage…), appareils sanitaires, eaux pluviales (dont filtre à cartouche et stérilisateur UV), ventilation et désenfumage.
- **Vue réaliste des équipements** (Affichage > « Équipements en vue réaliste ») : échangeurs, bouteilles, ballons, vases, relevage, désemboueur, filtre, thermomètre et détendeur dessinés comme sur site, sans changer les raccordements.
- **Orientation comme sur le terrain** : un symbole lâché sur un tuyau s'aligne dans le sens d'écoulement. `R` tourne de 90°, `F` inverse le sens, `Maj+F` passe le corps de l'autre côté du tuyau.
- **Onglet « Raccordement »** sur chaque équipement : points numérotés sur le plan, réseau attendu, état (libre ou raccordé, et vers quoi), accessoires à prévoir, et bouton pour tracer le tuyau depuis le point choisi.
- **Tuyauteries par réseau** (EF, ECS, bouclage, chauffage, gaz, EU, EP, vapeur, air…) avec tracé orthogonal, piquages, sauts aux croisements, flèches de sens et libellés DN. Un tuyau raccordé suit l'équipement qu'on déplace.
- **Mise en page** : légende et nomenclature générées automatiquement, cartouche (lot, phase, indice, date).
- **Mes projets** (Fichier > Enregistrer dans Mes projets, Ctrl+S) : les projets sont enregistrés dans le navigateur et se rouvrent depuis Fichier > Ouvrir depuis Mes projets. « Sauvegarder tout » crée un fichier de sauvegarde de tous les projets, « Restaurer… » le recharge (sur un autre ordinateur, par exemple).
- **Exports** PNG, SVG, JSON et PDF A4, A3 et A0. Le PDF est vectoriel (trait et texte nets à toutes les échelles, police Arimo intégrée) ; si ses bibliothèques ne se chargent pas, il est produit en image d'environ 300 dpi. Le travail en cours est gardé dans le navigateur.
- **Cartouche** agrandissable de 100 à 300 % (panneau du cartouche, réglage « Taille »).
- **Exemples** : local eau, chaufferie gaz, eaux pluviales des toitures non accessibles.
- **Modèles** (Fichier > Modèles) : schémas complets à reprendre, par exemple la sous-station CPCU Bessin.

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
| `modeles/*.json` | Modèles proposés dans Fichier > Modèles (schémas enregistrés depuis l'outil) |
| `build.sh` | Assemble `dist/index.html` et y intègre les modèles |

Pour ajouter un modèle : enregistrer le schéma en `.json` (Fichier > Enregistrer en fichier .json), le déposer dans `modeles/`, puis relancer `build.sh`. Le nom affiché dans le menu est celui du schéma.

Pour ajouter un symbole : déclarer son dessin dans l'objet `S` (boîte, points de raccordement, fonction `draw`), puis l'ajouter à `PRE_ADD` pour qu'il apparaisse dans la bibliothèque.

## Publication

Le workflow `.github/workflows/pages.yml` construit et publie la page sur GitHub Pages à chaque push sur `main`. À activer une fois dans le dépôt : **Settings > Pages > Source : GitHub Actions**.

## Différences avec la version hébergée sur claude.ai

- « Mes projets » est enregistré en ligne sur claude.ai. Sur ce site, il est enregistré dans le navigateur : les projets restent sur l'ordinateur et le navigateur utilisés. Pour les passer sur un autre poste ou les mettre à l'abri, utilisez « Sauvegarder tout » puis « Restaurer… ».
- Les exports se téléchargent directement.
