# Photos du site

## Aujourd'hui

Le site utilise quinze vraies photos prises au Sénégal (lieu vérifié pour chacune sur Commons, aucun enfant), sous licence **CC BY-SA 4.0** ou **3.0**, ou versées au **domaine public**. Elles montrent le contexte (cultures, récoltes, marché) : ni clients, ni sites SaytuMbay.

Sur le site public, chaque photo n'apparaît qu'une fois et correspond au texte qu'elle accompagne ; les oignons sont réservés au stockage.

La licence impose de citer l'auteur et la licence : c'est fait dans les mentions légales (section « Crédits »), qui listent toutes les photos. Elle autorise l’usage commercial. Les photos du domaine public n’imposent rien, mais nous les citons aussi.

| Fichier | Où | Sujet | Auteur |
|---|---|---|---|
| `tomates` | Accueil, héros (SMS « parcelle de tomates ») | Tomates mûres sur pied | Pacocreat |
| `arrosoirs` | Accueil, « Pour vos champs » | Arrosage des légumes (région de Ziguinchor) | Fatou kine doucoure |
| `sac` | Accueil, « Pour vos stocks » ; tableau de bord stockage | Sac d'oignons porté vers le marché | Thiam Babel Design |
| `salade-telephone` | Solutions, en-tête | Champ de salade, téléphone en main | Youfadiarragaye |
| `goutte-poste` | Solutions, les champs | Poste de goutte-à-goutte devant les rangs (Agnam-Goly, Matam ; domaine public) | Adama Diop |
| `sacs-legumes` | Solutions, le stockage | Sacs de choux et d'oignons | Thiam Babel Design |
| `salades-rangs` | À propos, fond de « Notre mission » (bas recadré : filigrane) | Planches de salade | Pacocreat |
| `aubergines` | À propos, « Où nous en sommes » | Aubergines sur pied | Cukrucum |
| `champ-choux` | À propos, en-tête | Champ de choux | Pacocreat |
| `visite-groupe` | Contact, fond de « Travaillons ensemble » | Visite d'un champ en groupe (Niaga) | Kikanakana |
| `tomate-seche` | Accueil, fond du chiffre des pertes | Plant de tomate qui dépérit | Pacocreat |
| `esp` | À propos, l'équipe | Entrée de l'ESP de Dakar (CC BY-SA 3.0) | Nathysy |
| `pompage` | À propos, questions fréquentes | Station de pompage, vallée du fleuve (CC BY-SA 3.0) | Africa Rice Center |
| `rangs` | Tableau de bord des champs | Rangs d'oignon irrigués (Diamniadio) | Pacocreat |
| `diamniadio` | Écran de connexion | Parcelle d'oignons | Wuzyprod |

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
