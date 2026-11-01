# Photos du site

## Aujourd'hui

Le site utilise six vraies photos prises au Sénégal et publiées sur Wikimedia Commons, sous licence **CC BY-SA 4.0**. Elles montrent le contexte (cultures, récoltes, marché) : ni clients, ni sites SaytuMbay.

La licence impose de citer l'auteur et la licence. C'est fait sous chaque photo et dans les mentions légales (section « Crédits »). Elle autorise l'usage commercial.

| Fichier | Où | Sujet | Auteur |
|---|---|---|---|
| `champ-goutte` | Accueil, héros | Main qui sort un oignon, goutte-à-goutte (Diamniadio) | Pacocreat |
| `sac` | Accueil, « Le problème » | Sac d'oignons porté vers le marché | Thiam Babel Design |
| `rangs` | Accueil, AgriTech | Rangs d'oignon irrigués (Diamniadio) | Pacocreat |
| `recolte` | Accueil, Onion | Producteur et sa récolte d'oignons | NoahElhardt |
| `diamniadio` | Accueil, « Du champ au marché » ; écran de connexion | Parcelle d'oignons | Wuzyprod |
| `marche` | Accueil, « Du champ au marché » | Marché de Case Ba, Parcelles Assainies | Pacocreat |

Les fichiers sont dans `apps/web/src/assets/photos`, en WebP à 640, 1200 et 1920 px de large. Leurs métadonnées (lieu, auteur, licence, lien) sont dans `index.ts`.

## À photographier par l'équipe

La charte demande de vraies personnes et de vrais sites, en lumière naturelle, le matériel montré en situation, sans banque d'images ni filtre. Nos propres photos remplaceront celles de Commons, et elles pourront montrer le produit.

1. **Une sonde plantée dans une parcelle**, avec les cultures autour. Pour le héros.
2. **Un capteur posé sur un tas ou entre des sacs d'oignons** dans un magasin. Pour la section Onion.
3. **Un technicien qui installe une passerelle ou une sonde** près d'un forage.
4. **Un responsable de coopérative qui lit une alerte SMS** sur un téléphone à touches, sur sa parcelle.
5. **L'équipe sur le terrain**, avec des producteurs. Pour la section Équipe.
6. **Un magasin de stockage de l'intérieur**, avec ses rangées de sacs.

Conseils :
- Format paysage, au moins 3000 px de large, net, en plein jour mais pas en plein midi.
- Demander l'accord écrit des personnes photographiées, surtout pour un usage commercial ; éviter les enfants.
- Garder l'original : on en tire les versions WebP.

## Remplacer une photo

1. Mettre l'original dans un dossier de travail.
2. Produire les trois largeurs en WebP (qualité 0,78) et les déposer dans `apps/web/src/assets/photos` sous le même nom.
3. Dans `index.ts`, mettre à jour `place`, `author`, `width`, `height` et `source`. Pour une photo de l'équipe, indiquer « SaytuMbay » comme auteur ; le crédit Commons n'est plus nécessaire.
