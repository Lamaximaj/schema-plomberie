# Schéma de principe plomberie

Éditeur de schémas de principe pour chaufferies, sous-stations, locaux eau et réseaux d'eaux pluviales. Tout tient dans une page web autonome : aucun serveur, aucune installation.

## Ce que fait l'outil

- **Bibliothèque de 143 symboles** : robinetterie, sécurité, mesure et régulation, pompes, équipements (chaudière, sous-station vapeur, préparateur ECS, échangeur, bouteille de découplage…), appareils sanitaires, eaux pluviales (dont filtre à cartouche et stérilisateur UV), ventilation et désenfumage. CTA double flux, caisson d’extraction VMC et pompes à chaleur sont dessinés comme les appareils : caisson sur pieds, piquages, filtres, échangeur, batterie, ventilateurs centrifuges ou hélice, coffret électrique.
- **Vue réaliste des équipements** (Affichage > « Équipements en vue réaliste ») : échangeurs, bouteilles, ballons, vases, relevage, désemboueur, filtre, thermomètre et détendeur dessinés comme sur site, sans changer les raccordements.
- **Orientation comme sur le terrain** : un symbole lâché sur un tuyau s'aligne dans le sens d'écoulement. `R` tourne de 90°, `F` inverse le sens, `Maj+F` passe le corps de l'autre côté du tuyau.
- **Onglet « Raccordement »** sur chaque équipement : points numérotés sur le plan, réseau attendu, état (libre ou raccordé, et vers quoi), accessoires à prévoir, et bouton pour tracer le tuyau depuis le point choisi.
- **Tuyauteries par réseau** (EF, ECS, bouclage, chauffage, gaz, EU, EP, vapeur, air…) avec tracé orthogonal, piquages, sauts aux croisements, flèches de sens et libellés DN. Un tuyau raccordé suit l'équipement qu'on déplace, tourne ou décale au clavier, avec ce qu'il porte : vannes, manchettes, appareils de mesure, soupapes, tuyaux piqués dessus et tuyaux raccordés à une 3e voie ou à une décharge. Les organes proches de l'équipement gardent leur distance ; l'allongement ou la baïonnette se fait dans le plus grand espace libre du tronçon.
- **Mise en page** : légende et nomenclature générées automatiquement, cartouche (lot, phase, indice, date).
- **Fichiers dans vos dossiers** (Chrome ou Edge sur ordinateur) : Fichier > Enregistrer sous (Ctrl+Maj+S) écrit le schéma directement dans le dossier choisi (NAS, OneDrive, dossier du chantier), en `.json`, `.svg` ou `.pdf`. Ensuite, Ctrl+S réécrit le même fichier, dans son format. Le bas de l'écran indique le fichier ouvert et s'il reste des modifications non enregistrées. Fichier > Récents rouvre les derniers fichiers. Le dernier dossier utilisé est proposé à chaque enregistrement.
- **Exports rouvrables** : chaque export SVG, PNG ou PDF contient les données du schéma. Fichier > Ouvrir (Ctrl+O), ou un glisser-déposer sur le plan, le rouvre modifiable. Un PDF rouvert puis modifié se réenregistre en PDF, au même format (A3…).
- **Anciens SVG** : un SVG exporté avant cette fonction (sans données) se rouvre aussi : symboles reconnus par leur dessin (y compris ceux des versions précédentes), tuyaux, repères, libellés, légende et cartouche. Les désignations qui n'étaient pas affichées sur le dessin reprennent le nom par défaut : à vérifier dans la nomenclature.
- **Mes projets** (Fichier > Enregistrer dans Mes projets) : les projets sont enregistrés dans le navigateur et se rouvrent depuis Fichier > Ouvrir depuis Mes projets. « Sauvegarder tout » crée un fichier de sauvegarde de tous les projets, « Restaurer… » le recharge (sur un autre ordinateur, par exemple). Sans accès direct aux fichiers (Safari, Firefox), Ctrl+S enregistre dans Mes projets.
- **Hors connexion et application installable** : sur le site, la page, ses bibliothèques et ses polices restent disponibles sans réseau, export PDF compris. Chrome et Edge proposent de l'installer (icône dans la barre d'adresse, ou Fichier > Installer l'application) : elle s'ouvre alors dans sa propre fenêtre, et un double-clic sur un `.json` ou un `.svg` peut l'ouvrir (Ouvrir avec). Quand une nouvelle version est publiée, un bandeau propose « Mettre à jour ».
- **Cadre de la feuille** (panneau du schéma, rubrique Feuille) : la feuille A4, A3, A2, A1 ou A0, en paysage ou en portrait, apparaît sur le plan avec ses marges, l'extérieur grisé. On la déplace par son étiquette bleue et on la redimensionne par ses coins ; les blocs s'aimantent à ses marges. Le panneau indique la taille des textes une fois imprimés et ce qui sort des marges. L'export sort alors exactement la feuille, avec le trait de cadre en option. Un cadre par schéma.
- **Exports** PNG, SVG, JSON et PDF A4, A3, A2, A1 et A0. Le PDF est vectoriel (trait et texte nets à toutes les échelles, police Arimo intégrée) ; si ses bibliothèques ne se chargent pas, il est produit en image d'environ 300 dpi. Le travail en cours est aussi gardé dans le navigateur (brouillon).
- **Cartouche, légende et nomenclature** agrandissables de 50 à 400 % : glisser un coin vert du bloc sélectionné, ou saisir sa taille (%) dans son panneau. La largeur du cartouche se règle à part (240 à 600, 300 par défaut) : en dessous de 400, les cases du bas passent sur deux lignes.
- **Alignement de la mise en page** : sélectionner plusieurs blocs (légende, nomenclature, cartouche, textes) puis Gauche, Centre, Droite, Haut, Milieu ou Bas ; « Répartir » égalise les espaces. Une zone sélectionnée avec eux sert de repère et ne bouge pas. En glissant un bloc, il s’aimante aux bords et aux centres des autres blocs et des zones, avec un repère en pointillés.
- **Fonction des organes** : onglet « Fonction » d’un symbole sélectionné (à quoi il sert, où et comment le poser), bouton « Fonctions » pour la liste complète avec recherche, et rappel au survol de la bibliothèque.
- **Exemples** : local eau, chaufferie gaz, eaux pluviales des toitures non accessibles.
- **Modèles** (Fichier > Modèles) : schémas complets à reprendre, par exemple la sous-station CPCU Bessin.

## Utiliser en local

```bash
bash build.sh
open dist/index.html   # ou double-clic sur le fichier
```

Le fonctionnement hors connexion (service worker) ne s'active que sur le site publié, ou servi en `http://localhost`.

## Structure

| Fichier | Contenu |
| --- | --- |
| `src/00-entete.html` | Styles et structure de la page |
| `src/10-symboles-et-rendu.js` | Symboles, réseaux, modèle de données, rendu SVG, légende, nomenclature, cartouche |
| `src/15-fonctions.js` | Fiche de chaque organe : fonction, règles de pose |
| `src/20-interactions.js` | Tracé, pose, aimantation sur les tuyaux, orientation, déplacements, historique |
| `src/24-signatures-anciennes.js` | Empreintes des dessins des versions précédentes (généré, voir plus bas) |
| `src/25-fichiers.js` | Ouvrir, enregistrer dans un dossier, Ctrl+S, récents, données intégrées aux exports, application hors connexion |
| `src/26-import-svg.js` | Réouverture des SVG exportés sans données : reconnaissance des symboles, tuyaux, libellés, légende, cartouche |
| `src/30-interface.js` | Panneau de propriétés, bibliothèque, menus, exports, sauvegarde, exemples |
| `modeles/*.json` | Modèles proposés dans Fichier > Modèles (schémas enregistrés depuis l'outil) |
| `vendor/` | jsPDF, svg2pdf.js et police Arimo pour l'export PDF, servis avec la page (licences dans le dossier) |
| `pwa/` | Manifeste, service worker et icônes de l'application installable |
| `build.sh` | Assemble `dist/index.html`, y intègre les modèles, copie `vendor/` et `pwa/`, date le service worker |
| `tests/` | Tests de bout en bout (`npm test`) et SVG exportés par d'anciennes versions |
| `outils/` | Scripts de maintenance : empreintes des anciens dessins, exports anciens pour les tests, icônes |

Pour ajouter un modèle : enregistrer le schéma en `.json` (Fichier > Enregistrer en fichier .json), le déposer dans `modeles/`, puis relancer `build.sh`. Le nom affiché dans le menu est celui du schéma.

Pour ajouter un symbole : déclarer son dessin dans l'objet `S` (boîte, points de raccordement, fonction `draw`), puis l'ajouter à `PRE_ADD` pour qu'il apparaisse dans la bibliothèque.

**Après avoir modifié le dessin d'un symbole existant**, relancer `npm run signatures` (dépôt complet : `git fetch --unshallow` si besoin) : l'ancien dessin rejoint `src/24-signatures-anciennes.js` et les SVG exportés avant la modification restent rouvrables.

## Tests

```bash
npm ci
npx playwright install chromium
npm test
```

Les tests vérifient que les exports se rouvrent à l'identique, que les SVG des versions précédentes (`tests/anciens-exports/`) se rouvrent, l'enregistrement dans un dossier (Ctrl+S, Ctrl+O, récents, annulation entre fichiers) et le fonctionnement hors connexion avec la mise à jour. Ils tournent aussi sur chaque demande de fusion (`.github/workflows/tests.yml`).

## Publication

Le workflow `.github/workflows/pages.yml` construit et publie la page sur GitHub Pages à chaque push sur `main`. À activer une fois dans le dépôt : **Settings > Pages > Source : GitHub Actions**.

## Différences avec la version hébergée sur claude.ai

- « Mes projets » est enregistré en ligne sur claude.ai. Sur ce site, il est enregistré dans le navigateur : les projets restent sur l'ordinateur et le navigateur utilisés. Pour les passer sur un autre poste ou les mettre à l'abri, utilisez « Sauvegarder tout » puis « Restaurer… », ou enregistrez vos schémas dans vos dossiers.
- L'enregistrement direct dans un dossier, les récents et le hors connexion ne fonctionnent que sur ce site : dans claude.ai, la page est affichée dans un cadre et les fichiers se téléchargent.
