# SMS d'alerte en wolof : à relire

Les textes ci-dessous sont un **premier jet**. Ils ne partiront vers les agriculteurs qu'après relecture par une personne qui parle et écrit le wolof.

## Où en est-on

- Chaque utilisateur choisit la langue de ses SMS dans **Paramètres → Profil → Langue des SMS d'alerte** (français ou wolof).
- Tant que les textes ne sont pas validés, ceux qui ont choisi le wolof **reçoivent le français**. Le profil le leur dit.
- Le SMS wolof n'est pas une traduction de la phrase française. Il est construit à partir des données de l'alerte (parcelle, valeur mesurée, magasin), avec une phrase pour le constat et une pour l'action.
- Seuls les SMS d’alerte sont concernés. Les autres SMS (invitation, mot de passe oublié, nouvelle tâche, relance de facture) restent en français.

## Ce qu'il faut relire

Pour chaque ligne : le wolof dit-il bien ce que dit la colonne « Sens voulu » ? Est-ce naturel, compréhensible par un exploitant de Thiès ou des Niayes ? Corriger directement dans la colonne wolof, ou proposer mieux.

Exemples réels, pour la Coopérative de Thiès (« Coop. Thiès ») :

| Alerte | Wolof proposé | Sens voulu | Français envoyé aujourd'hui |
|---|---|---|---|
| Parcelle sèche | Coop. Thiès : Toolu B dafa wow (18 %). Ndoxal ko léegi walla seetal ndoxal bu otomatik bi. | La parcelle B est sèche (18 %). Arrose-la maintenant ou vérifie l'arrosage automatique. | Coop. Thiès : Parcelle B est sèche (18 %). Lancer une irrigation ou vérifier que la règle automatique est active. |
| Parcelle trop humide | Coop. Thiès : Toolu B dafa tooy lool (48 %). Taxawal ndoxal bi. | La parcelle B est très mouillée (48 %). Arrête l'arrosage. | Coop. Thiès : Parcelle B est trop humide (48 %). Suspendre l'irrigation et vérifier le drainage de la parcelle. |
| Capteur muet | Coop. Thiès : Capteur AS-0011 yónneewul dara. Seetal kuuraŋ bi ak antenn bi. | Le capteur AS-0011 n'envoie plus rien. Vérifie le courant et l'antenne. | Coop. Thiès : AS-0011 ne répond plus. Vérifier l'alimentation et l'antenne du capteur, puis sa portée jusqu'à la passerelle. |
| Pile faible | Coop. Thiès : Pil bu capteur AS-0011 dafa bëgg a jeex (12 %). Waajal beneen pil. | La pile du capteur AS-0011 va bientôt s'épuiser (12 %). Prépare une autre pile. | Coop. Thiès : Batterie faible sur AS-0011 (12 %). Prévoir le remplacement de la batterie lors du prochain passage. |
| Magasin : humidité | Coop. Thiès : Tooy bi bari na ci rangée 2 (88,4 %, Magasin de Mboro). Ubbil palanteer yi guddi te seetal saaku yi. | Il y a trop d'humidité dans la rangée 2. Ouvre les fenêtres cette nuit et vérifie les sacs. | Coop. Thiès : Humidité 88,4 % en rangée 2 (Magasin de Mboro). Aérer le magasin cette nuit et contrôler les sacs de la zone concernée. |
| Magasin : chaleur | Coop. Thiès : Tàng bi bari na ci rangée 2 (36 °C, Magasin de Mboro). Ubbil palanteer yi bu sedde, te bul yokk saaku. | Il fait trop chaud dans la rangée 2. Ouvre les fenêtres quand il fait frais et n'ajoute pas de sacs. | Coop. Thiès : La rangée 2 chauffe (36 °C, Magasin de Mboro). Ouvrir les aérations aux heures fraîches et éviter d'entasser de nouveaux sacs. |
| Magasin : CO₂ | Coop. Thiès : CO2 bi bari na ci rangée 2 (2900 ppm, Magasin de Mboro). Ubbil palanteer yi te seetal ndax am na soble yu nooy. | Le CO₂ est élevé dans la rangée 2. Ouvre les fenêtres et regarde s'il y a des oignons mous. | Coop. Thiès : CO₂ élevé en rangée 2 (Magasin de Mboro). Aérer et ouvrir quelques sacs de la zone pour chercher des bulbes mous. |
| Magasin : pourriture | Coop. Thiès : Xetu yàqu ci rangée 2 (Magasin de Mboro). Génnal saaku yi te tànn leen léegi. | Odeur de pourriture dans la rangée 2. Sors les sacs et trie-les tout de suite. | Coop. Thiès : Gaz de pourriture en rangée 2 (Magasin de Mboro). Sortir et trier les sacs de la zone en priorité. |

Le nom de l'organisation, les codes de parcelle (B), de capteur (AS-0011), de zone (« rangée 2 ») et de magasin viennent de la plateforme et restent tels quels.

## Questions à trancher pendant la relecture

1. **Tutoiement ou pluriel** : les consignes sont à l'impératif singulier (*ndoxal*, *seetal*, *ubbil*). Faut-il le pluriel de politesse (*ndoxal-leen*, *seetal-leen*) ?
2. **Mots empruntés** : *capteur*, *antenn*, *palanteer*, *otomatik*, *pil*, *kuuraŋ*. Les agriculteurs les disent-ils ainsi, ou faut-il un autre mot ?
3. **Orthographe** : les textes suivent l'orthographe officielle (ë, ñ, ŋ, accents). Beaucoup de gens écrivent leurs SMS sans ces lettres. Lequel sera le mieux lu sur un téléphone à touches ?
4. **Coût d'envoi** : un SMS normal compte 160 caractères. Une seule lettre hors de l'alphabet SMS de base (ë, ŋ, ó, mais aussi l'apostrophe courbe ’ ou le ô des textes français) le fait passer à 70 caractères par SMS, donc 2 ou 3 SMS facturés pour un message. Écrire sans ces lettres réduit la facture. Cela concerne aussi les SMS français d'aujourd'hui.

## Mettre en service après relecture

Pour l'équipe technique :

1. Reporter les corrections dans `packages/shared/src/domain/sms.ts` (objet `SMS_WOLOF`).
2. Passer `WOLOF_SMS_RELU` à `true` dans le même fichier.
3. Lancer `npm test` : les tests vérifient que chaque alerte a son texte, sans valeur manquante, en 160 caractères au plus.
