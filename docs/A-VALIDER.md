# Points à valider par l'équipe

Ce que le code ne peut pas décider seul. Classés par urgence. Mis à jour le 1er novembre 2026.

## Avant toute mise en ligne

1. **Mentions légales** (en cours) : forme juridique, capital, RCCM, NINEA, adresse du siège, directeur de la publication, hébergeur. Ces champs apparaissent entre crochets surlignés sur `/mentions-legales`, `/confidentialite`, `/conditions` et `/securite`. Le site affiche un bandeau « Document de travail » tant qu'ils ne sont pas remplis (`draft` dans `LegalPage`). Les adresses e-mail sont déjà en place (`contact@`, `tidianesow@`, `ibrahimafall@saytumbay.com`).
2. **Déclaration à la CDP** (avant la vraie plateforme, pas pour le site vitrine) : à confirmer avec le numéro de récépissé. Aucune trace publique n'a été trouvée, ce qui est normal : la CDP ne publie pas de registre consultable par entreprise. Point d'attention : un hébergement hors du Sénégal (Hostinger) est un transfert de données à l'étranger, qui relève en principe d'une **demande d'autorisation**, pas d'une simple déclaration. Contact : `contactcdp@cdp.sn`, formulaires sur cdp.sn.
3. **Relecture juridique** des conditions d'utilisation et de la politique de confidentialité.

## Produit

4. **Critères de réussite des pilotes** : proposition dans [PILOTE.md](PILOTE.md), à valider. Le site dit seulement « objectifs fixés ensemble avant la pose ».
5. **Tarifs** : la page Coûts montre qu'à 2 500 FCFA par capteur, chaque capteur coûte plus qu'il ne rapporte (coût direct ≈ 3 900 FCFA/mois). Aucun prix n'est publié sur le site ; à trancher avant les pilotes payants, y compris le prix réduit du pilote.
6. **Économies d'eau** : aucun pourcentage n'est affiché sans saison de comparaison. La démo navigateur affiche 38 %, valeur d'exemple. La méthode de référence est la parcelle témoin arrosée comme d'habitude.
7. **Codec ChirpStack** : le capteur de référence est la Dragino LSE01. La correspondance des champs (`water_SOIL`, `temp_SOIL`, `conduct_SOIL`, `Bat`) suit le décodeur habituel du fabricant ; la confirmer avec le profil réellement configuré. Même chose pour la future sonde de stockage.
8. **Moteur du prototype COC'2026** (dossier `saytumbay` sur le Raspberry Pi) : repérage des mesures anormales (Isolation Forest) et risque fongique, annoncés « en cours » sur le site. À reprendre dans la plateforme et à tester sur de vraies mesures avant de les présenter comme disponibles. Le calcul d'évapotranspiration du prototype sous-estime fortement (0,1 à 0,4 mm/j) ; la plateforme utilise Hargreaves.

## Exploitation

9. **Opérateur SMS** (inconnu pour l'instant) : contrat Orange ou autre, numéro et nom d'expéditeur.
10. **SMS en wolof** (relecteur à trouver) : voir [SMS-WOLOF.md](SMS-WOLOF.md).
11. **Photos et logo** : les photos du site viennent de Wikimedia Commons ; les remplacer par les vôtres quand elles existent ([PHOTOS.md](PHOTOS.md)). Les fichiers SVG officiels du logo de la charte sont à récupérer auprès de Tidiane.
12. **Création des parcelles et capteurs d'un nouveau client** : se fait depuis l'espace client. Un import CSV accélérerait la pose des pilotes.
13. **Fin de contrat** : outil d'export complet et de suppression d'une organisation (procédure promise dans la politique de confidentialité).

## Décisions prises

- **Nom** : SaytuMbay, en un mot. Le site, la charte et l'article COC'2026 l'utilisent déjà ; l'équipe ne voit pas de conflit avec « Saaytu Mbay ».
- **Domaine** : `saytumbay.com`, acheté chez Hostinger.
- **Irrigation commandée** : prévue ; la plateforme garde la commande des vannes (« selon le matériel » sur le site).
- **Capteur de sol** : Dragino LSE01 (et non le ZTS-3002 du prototype).
- **Équipe affichée** : Tidiane Sow et Ibrahima Fall. L'article est cité « Tidiane Sow, Ibrahima Fall et al. » ; la liste complète des auteurs reste sur HAL.
- **Photo d'enfants** : retirée ; photo dont le lieu est incertain écartée.
- **Hébergement** : pour l'instant, site vitrine et démo seulement (aucune donnée personnelle, rien à déclarer). La vraie plateforme viendra ensuite sur des machines hébergées au Sénégal, avec les fonds levés (option C de [DEPLOIEMENT.md](DEPLOIEMENT.md)).
- **Formulaire de contact du site vitrine** : rédige le message dans WhatsApp ou dans la messagerie du visiteur ; rien n'est enregistré.
- **Mise en ligne** : rien n'est poussé ni déployé sans demande explicite.

## Ce qui n'a pas été repris des maquettes, volontairement

- Les chiffres de « pertes évitées » : remplacés par la méthode du magasin témoin, affichée telle quelle.
- Les avis clients, logos de partenaires et témoignages : aucun n'existe encore, rien n'est inventé.
