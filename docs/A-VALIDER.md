# Points à valider par l'équipe

Ce que le code ne peut pas décider seul. Classés par urgence.

## Avant toute mise en ligne

1. **Mentions légales et confidentialité** : forme juridique, capital, RCCM, NINEA, adresse du siège, directeur de publication, adresse e-mail de contact et de sécurité, hébergeur retenu. Ces champs apparaissent entre crochets surlignés sur les pages `/mentions-legales`, `/confidentialite`, `/conditions`, `/securite`. Le site affiche un bandeau « Document de travail » tant qu'ils ne sont pas remplis (`draft` dans `LegalPage`).
2. **Relecture juridique** des conditions et de la politique de confidentialité, et déclaration à la CDP.
3. **Nom commercial** : votre présentation d'entreprise signale que « Saaytu Mbay » est utilisé par Jokalante ; vérifier à l'OAPI avant d'investir davantage dans la marque.

## Produit

4. **Commande d'irrigation** : les maquettes prévoyaient le pilotage des vannes depuis l'application ; la présentation d'entreprise annonce une v1 « surveillance seule ». La plateforme gère les deux (journal, règles, commandes manuelles) ; le site public présente les vannes connectées « en option ». Décider ce qui est vendu en v1, puis masquer l'irrigation commandée si besoin.
5. **Économies d'eau** : aucun pourcentage n'est affiché sans saison de comparaison (« calculée après une saison de comparaison »). La démo navigateur affiche 38 %, valeur d'exemple. Définir la méthode de référence (arrosage à heure fixe sur une parcelle témoin) avant de communiquer un chiffre.
6. **Tarifs** : la page Coûts montre qu'à 2 500 FCFA par capteur, chaque capteur coûte plus qu'il ne rapporte (coût direct ≈ 3 900 FCFA/mois). Aucun prix n'est publié sur le site ; à trancher avant les pilotes payants.
7. **Codec ChirpStack** : la correspondance des champs Dragino LSE01 (`water_SOIL`, `temp_SOIL`, `conduct_SOIL`, `Bat`) suit le décodeur habituel du fabricant ; la confirmer avec le profil réellement configuré. Même chose pour la future sonde de stockage.

## Exploitation

8. **Opérateur SMS** : contrat Orange (ou autre), numéro et nom d'expéditeur.
9. **Création des parcelles et capteurs d'un nouveau client** : se fait depuis l'espace client (parcelles, capteurs avec DevEUI). Un import CSV accélérerait la pose des pilotes.
10. **Fin de contrat** : outil d'export complet et de suppression d'une organisation (procédure promise dans la politique de confidentialité).
11. **SMS en wolof** : les textes des SMS d'alerte sont rédigés mais pas encore relus. Les faire relire par une personne qui parle wolof, puis les activer : voir [SMS-WOLOF.md](SMS-WOLOF.md). L'interface reste en français.

## Ce qui n'a pas été repris des maquettes, volontairement

- Les chiffres de « pertes évitées » : remplacés par la méthode du magasin témoin, affichée telle quelle.
- Les avis clients, logos de partenaires et témoignages : aucun n'existe encore, rien n'est inventé.
