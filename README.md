# SaytuMbay

**Voir la perte avant qu'elle arrive.** SaytuMbay (« veiller sur l'agriculture », en wolof) est une startup de Dakar. De petits capteurs surveillent l'eau du sol dans les champs et la chaleur au cœur des stocks d'oignons ; au moindre problème, le producteur reçoit un SMS, sur le téléphone qu'il a déjà, sans internet.

**Site en ligne : https://saytumbay-plateforme.vercel.app**, avec le site public et la démo de la plateforme (données simulées, rien n'est enregistré).

Ce dépôt contient tout : le site public, l'espace client, la console de l'équipe, l'API IoT et l'infrastructure.

## Où en est le projet

| Prêt | En cours | Prévu ensuite |
|---|---|---|
| Site public, démo en ligne | Premiers sites pilotes avec des coopératives | Commande de l'arrosage à distance |
| Tableau de bord champs et magasins | SMS en wolof (textes en relecture) | Capteurs et images satellites combinés |
| Alertes SMS, droits par rôle, double authentification | Détection des mesures anormales par IA (prototype présenté au COC'2026) | |

Pas encore de client ni de capteur installé chez un client. Les chiffres du site sont sourcés (FAO, Université de Bonn), aucun résultat terrain n'est annoncé.

## Contenu du dépôt

| Dossier | Contenu |
|---|---|
| `apps/web` | Site public, pages de connexion, espace client (module champs « AgriTech », module stockage « Onion »), console. React 19, Vite 7, Tailwind 4, PWA installable |
| `apps/api` | API Fastify 5 : sessions, double authentification, droits par rôle, cloisonnement par organisation, mesures, alertes SMS, réception des capteurs (MQTT / ChirpStack) |
| `packages/shared` | Ce que le site et l'API partagent : types, règles métier, calculs, validation (zod), droits, jeu de démonstration |
| `infra` | Docker Compose (Caddy, API, PostgreSQL, Mosquitto), sauvegardes chiffrées |
| `docs` | Architecture, sécurité, données, déploiement, photos, pilotes, points à valider |
| `brand` | Logo et visuels pour les réseaux sociaux |

Capteur de référence : Dragino LSE01 (sol), en LoRaWAN vers une passerelle reliée en 4G.

## Démarrer

Prérequis : Node.js 22.

```bash
npm install
npm run dev            # site + démo dans le navigateur : http://localhost:5173
```

La démo tourne sans serveur : données simulées, actions gardées dans le navigateur 3 jours. Sur `/connexion`, trois profils s'ouvrent en un clic (responsable de coopérative, technicien, équipe SaytuMbay).

### Avec la vraie API

```bash
npm run dev:api        # API sur :4000, base PGlite embarquée, données de démo au premier lancement
npm run dev:web-api    # site branché sur l'API (proxy /api) : http://localhost:5173
```

Comptes de démonstration, **base de développement uniquement** :

| Profil | E-mail | Rôle |
|---|---|---|
| Awa Ndiaye | awa.ndiaye@demo.saytumbay.com | Responsable, Coopérative de Thiès |
| Moussa Sarr | moussa.sarr@demo.saytumbay.com | Exploitant (parcelles A et D) |
| Ibou Faye | ibou.faye@demo.saytumbay.com | Technicien |
| Mamadou Ba | mamadou.ba@demo.saytumbay.com | Lecture seule |
| Khady Gueye | khady.gueye@demo.saytumbay.com | Propriétaire, GIE Niayes Mboro |
| Mame Sow | mame.sow@demo.saytumbay.com | Console (admin), double authentification |

Mot de passe commun : `Demo-SaytuMbay-2026`. Double authentification de Mame Sow : secret TOTP `JBSWY3DPEHPK3PXP`, ou codes de secours `1111-2222`, `3333-4444`… (usage unique). Dans la démo navigateur, le code est `246810`.

Tant que `SMS_PROVIDER=console`, les SMS sont écrits dans les journaux de l'API au lieu d'être envoyés.

## Vérifier avant de dire « c'est fini »

```bash
npm run typecheck      # TypeScript strict, trois paquets
npm test               # 67 tests : règles partagées, sécurité de l'API (PGlite en mémoire), site
npm run e2e            # 24 parcours Playwright + axe (ordinateur et téléphone), sous la vraie politique de sécurité
```

## Mettre en ligne

**Chaque `git push` sur `main` met le site à jour** sur https://saytumbay-plateforme.vercel.app en une minute environ. Pousser, c'est publier : vérifiez d'abord.

Réglages du projet Vercel : Root Directory `apps/web`, Framework Preset « Other », aucune variable d'environnement, aucun domaine personnalisé. La commande de build est dans `apps/web/vercel.json`. Au build, `vite.config.ts` écrit la configuration de Vercel : routes de l'application, cache, en-têtes de sécurité tirés de `apps/web/security-headers.ts`. L'adresse vercel.app n'est pas indexée par les moteurs de recherche.

Autres options (hébergement Hostinger pour saytumbay.com, VPS pour la plateforme complète avec vrais capteurs) : [docs/DEPLOIEMENT.md](docs/DEPLOIEMENT.md).

```bash
npm run build:demo -w @saytumbay/web   # site de démonstration statique (apps/web/dist)
npm run build                          # site en mode API + API (apps/api/dist)
```

## Règles du projet

- **Tout en français** : interface, commentaires, commits. Des mots simples, pensés d'abord pour un agriculteur.
- **Rien d'inventé** : ni chiffre, ni client, ni fonctionnalité. Chaque chiffre a une source vérifiable ; ce qui n'existe pas encore est dit « en cours ».
- **Accessibilité WCAG 2.1 AA**, téléphone d'abord, animations coupées si le visiteur le demande.
- **Thèmes** : le site public reste toujours clair (couleurs de la marque) ; l'espace client et la console proposent clair et sombre.
- **Sécurité** : la politique de sécurité du contenu (CSP) n'est écrite que dans `apps/web/security-headers.ts`. Aucun secret dans le dépôt (les `.env` sont ignorés ; voir `*.env.example`).
- **Photos** : vraies photos du Sénégal sous licence libre, sans enfant, créditées dans les mentions légales ([docs/PHOTOS.md](docs/PHOTOS.md)).
- **Commits** petits et décrits en français.

## Documentation

- [Architecture](docs/ARCHITECTURE.md) : flux des données, moteur partagé, choix techniques
- [Sécurité](docs/SECURITE.md) : modèle de menace, mesures, tests correspondants, reste à faire
- [Données](docs/DONNEES.md) : modèle, durées de conservation, loi sénégalaise 2008-12
- [Déploiement](docs/DEPLOIEMENT.md) : Vercel, Hostinger, VPS
- [Photos](docs/PHOTOS.md) : sources, licences, photos à prendre par l'équipe
- [Pilotes](docs/PILOTE.md) : proposition de critères de réussite
- [SMS en wolof](docs/SMS-WOLOF.md) : textes des alertes, à relire avant mise en service
- [Points à valider](docs/A-VALIDER.md) : décisions et informations que l'équipe doit fournir

## Équipe

- **Tidiane Sow**, directeur général
- **Ibrahima Fall**, directeur technique

Né à l'École supérieure polytechnique (ESP) de Dakar, dans le programme AfriConnect+. Incubé à TÀGGU NDAW ÑI (Université Cheikh Anta Diop). Article : [SaytuMbay : une plateforme IoT-IA pour l'agriculture de précision au Sénégal](https://hal.science/hal-05571878v1), Tidiane Sow, Ibrahima Fall et al., colloque COC'2026, Thiès.

Contact : contact@saytumbay.com
