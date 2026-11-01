# Réseaux sociaux SaytuMbay

Guide pour créer et animer les comptes LinkedIn, X, Instagram et TikTok. Tous les visuels de ce dossier suivent la charte graphique v1.0 (vert forêt, orange signal, sable, nuit ; Sora et IBM Plex Mono).

## Le texte unique (bio et slogan, sur tous les réseaux)

```
Startup agritech 🇸🇳 · Voir la perte avant qu'elle arrive, du champ au magasin.
```

78 caractères : il tient partout (TikTok 80, Instagram 150, X 160, slogan LinkedIn 120). Le même texte partout rend la marque reconnaissable.

Exception pour **LinkedIn** (et X si l'on veut) : Windows n'affiche pas les drapeaux en emoji, les visiteurs sur ordinateur y lisent « SN ». Version sans drapeau :

```
Startup agritech de Dakar · Voir la perte avant qu'elle arrive, du champ au magasin.
```

## Les règles communes

- **Le même nom partout** : `@saytumbay`. Nom affiché : **SaytuMbay** (le logo s'écrit « saytumbay », les textes « SaytuMbay »).
- **La même photo de profil partout** : `avatar-saytumbay.png`. Le signe est assez centré pour être recadré en rond.
- **Le même message** : « Voir la perte avant qu'elle arrive. »
- **Le lien** : `https://saytumbay.com` dès que le site est en ligne. En attendant, le WhatsApp d'Ibrahima (`https://wa.me/221778335781`) ou `contact@saytumbay.com`.
- **Parler simple** : dire ce que l'on apporte (voir la perte avant qu'elle arrive, une alerte au bon moment), pas les technologies. « IoT » et « LoRaWAN » restent pour les spécialités LinkedIn et les échanges techniques.
- **Ne jamais inventer** : pas de chiffre de résultats, de client ni de partenaire qui n'existe pas. On montre ce qui est vrai : le travail, le terrain, l'incubation, le COC'2026.

## Fichiers

| Fichier | Taille | Usage |
|---|---|---|
| `avatar-saytumbay.png` | 800 × 800 | Photo de profil des 4 réseaux, logo de la page LinkedIn |
| `linkedin-banniere.png` | 1128 × 191 | Bannière de la page LinkedIn |
| `x-banniere.png` | 1500 × 500 | Bannière X |
| `post-1-lancement.png` | 1080 × 1350 | Première publication : qui nous sommes |
| `post-2-satellite.png` | 1080 × 1350 | Deuxième publication : notre différence |
| `post-3-coc2026.png` | 1080 × 1350 | Troisième publication : la preuve |

Pour refaire les visuels (par exemple avec les logos officiels) : `node brand/reseaux/generer.mjs`.

## LinkedIn (page entreprise)

Formulaire de création :

| Champ | À mettre |
|---|---|
| Nom | `SaytuMbay` |
| linkedin.com/company/ | `saytumbay` |
| Site web | vide pour l'instant ; `https://saytumbay.com` à la mise en ligne |
| Secteur | un secteur **tech** : taper « Technolog » et choisir « Technologie, information et Internet » (ou « Technologies et services de l'information »). L'agriculture apparaît dans le slogan, l'À propos et les spécialités. |
| Taille | `2-10 employés` |
| Type | `Société civile/Société commerciale/Autres types de sociétés` (SARL, SAS…), à ajuster quand la forme juridique sera fixée |
| Logo | `avatar-saytumbay.png` |
| Slogan (120 car.) | le texte unique ci-dessus |

Après la création (bouton « Modifier la page ») :

- **Bannière** : `linkedin-banniere.png`.
- **À propos** :

> SaytuMbay (« veiller sur l'agriculture » en wolof) est une startup agritech qui aide les producteurs, les coopératives et les stockeurs à voir la perte avant qu'elle arrive, grâce à des capteurs connectés et des alertes par SMS.
>
> Nos capteurs mesurent ce que personne ne voit : l'eau du sol à la profondeur des racines, la chaleur et les gaz au cœur des sacs dans les magasins de stockage. Quand une mesure sort de sa plage, la bonne personne reçoit un SMS avec une consigne simple, même sur un téléphone à touches. Un tableau de bord garde l'historique, pour suivre une saison et prouver les résultats.
>
> Nous partons toujours du problème de chaque exploitation : la source d'eau, la façon d'arroser, l'énergie, le réseau, les cultures, le budget. Le matériel déjà en place est conservé.
>
> Le projet est né à l'École supérieure polytechnique (ESP) de Dakar, dans le programme AfriConnect+. Il est incubé à TÀGGU NDAW ÑI (UCAD), et a été présenté et publié au colloque COC'2026 à Thiès.
>
> Nous préparons nos premiers sites pilotes et cherchons des coopératives, des partenaires techniques et des financeurs. Écrivez-nous : contact@saytumbay.com

- **Spécialités** : Agritech · Internet des objets (IoT) · LoRaWAN · Capteurs · Plateforme de données · Agriculture de précision · Irrigation · Stockage post-récolte · Alertes SMS
- **Lieu** : Dakar, Sénégal.
- **Bouton** : « Nous contacter », vers `contact@saytumbay.com` ou le WhatsApp.
- **Administrateurs** : ajouter Tidiane comme « Super admin », pour que la page ne dépende pas d'un seul compte.
- **Profils personnels** : Tidiane et Ibrahima indiquent « SaytuMbay » comme employeur actuel ; la page apparaît alors sur leurs profils.

## X

- Nom : `SaytuMbay` · Identifiant : `@saytumbay`
- Photo : `avatar-saytumbay.png` · Bannière : `x-banniere.png`
- Bio : le texte unique
- Lieu : `Dakar, Sénégal`

## Instagram

- Passer en **compte professionnel** (gratuit : Paramètres > Type de compte). Catégorie : « Science et technologie » ou « Agriculture ».
- Nom : `SaytuMbay` · Identifiant : `saytumbay`
- Photo : `avatar-saytumbay.png`
- Bio : le texte unique

- Lien : le WhatsApp en attendant le site.
- Ajouter les boutons « E-mail » et « Appeler » du compte professionnel.

## TikTok

- Passer en **compte professionnel** (gratuit). Catégorie : « Science et éducation » ou « Agriculture ».
- Nom : `SaytuMbay` · Identifiant : `@saytumbay`
- Photo : `avatar-saytumbay.png`
- Bio : le texte unique

## Les trois premières publications

Les publier dans cet ordre, à deux ou trois jours d'écart, sur LinkedIn et Instagram (et X avec un texte plus court).

1. **`post-1-lancement.png`**

> SaytuMbay, « veiller sur l'agriculture » en wolof.
> Une parcelle qui sèche pendant un après-midi d'harmattan, un tas d'oignons qui pourrit au cœur des sacs : la perte commence toujours sans témoin.
> Nous plaçons des capteurs dans le sol et dans les magasins. Quand il faut agir, la bonne personne reçoit un SMS, avec quoi faire.
> Né à l'ESP de Dakar, incubé à TÀGGU NDAW ÑI. Nous préparons nos premiers sites pilotes : coopératives, stockeurs, partenaires, écrivez-nous.

2. **`post-2-satellite.png`**

> Le satellite voit vos champs d'en haut. Il montre la santé des cultures sur de grandes surfaces.
> Il ne voit pas l'eau sous la surface, là où sont les racines. Ni le cœur d'un sac d'oignons dans un magasin.
> C'est là que nous mesurons. Les deux ensemble, c'est le plus fiable : c'est la direction que nous prenons.

3. **`post-3-coc2026.png`**

> Notre travail a été présenté et publié au Colloque sur les Objets et systèmes Connectés (COC'2026), à l'IUT de l'Université Iba Der Thiam de Thiès.
> L'article est en accès libre sur HAL : https://hal.science/hal-05571878v1
> Merci au programme AfriConnect+ et à l'ESP de Dakar, où tout a commencé.

Ajouter 3 à 5 mots-clés en fin de texte : `#agritech #Sénégal #IoT #agriculture #innovation`. Sur LinkedIn, mentionner les pages de l'ESP, de l'UCAD et d'AfriConnect+ quand elles existent (taper « @ » puis le nom).

## Ensuite : quoi publier, et à quel rythme

Rythme réaliste : **LinkedIn 2 fois par semaine, Instagram 2 à 3 fois, TikTok 2 vidéos**. Mieux vaut régulier que beaucoup d'un coup.

Cinq sujets qui reviennent :

1. **Le terrain** : une parcelle, un magasin, une rencontre avec un producteur (avec son accord).
2. **Les coulisses** : souder un capteur, tester une passerelle, une journée à l'incubateur. TikTok : vidéos de 15 à 30 s, filmées au téléphone, en wolof ou en français.
3. **Apprendre** : « Pourquoi l'oignon pourrit au cœur du tas », « Arroser le soir ou le matin ? », « C'est quoi LoRaWAN ? ».
4. **Les preuves** : COC'2026, Dakar Night Market, hackathon ISOC ESMT, un pilote qui démarre.
5. **L'équipe** : qui nous sommes, pourquoi nous faisons ça.

## Photos et vidéos

- Montrer de vraies personnes et de vrais lieux, en lumière naturelle, sans filtre (règle de la charte).
- Demander l'accord des personnes filmées ou photographiées, surtout pour un usage commercial. Éviter les enfants.
- Les photos Wikimedia Commons du site peuvent être reprises, en citant dans le texte : « Photo : nom de l'auteur, CC BY-SA 4.0 » (voir `docs/PHOTOS.md`).

## Sécurité des comptes

Tous les comptes passent par un seul compte Google : s'il est piraté, tout l'est.

- Activer la **validation en deux étapes** sur le compte Google, puis sur chaque réseau.
- Garder les **codes de secours** imprimés, dans un endroit sûr connu de Tidiane et d'Ibrahima.
- Utiliser un **gestionnaire de mots de passe** (Bitwarden est gratuit). Ne jamais envoyer un mot de passe par WhatsApp.
- Rattacher les comptes à un numéro de téléphone de l'entreprise, pas à un numéro personnel qui pourrait changer.
