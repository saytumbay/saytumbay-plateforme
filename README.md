# SaytuMbay — plateforme

Site public, espace client (AgriTech en premier, Onion en second), console de l'équipe et API IoT.
Reconstruction complète des maquettes du dossier `livraison` (Claude Design), en application réelle.

| Partie | Contenu |
|---|---|
| `apps/web` | Site saytumbay.com, pages d'accès, espace client, console. React 19, Vite 7, Tailwind 4, PWA installable |
| `apps/api` | API Fastify 5 : sessions, double authentification, droits par rôle, cloisonnement par organisation, mesures, alertes SMS, ingestion MQTT / ChirpStack |
| `packages/shared` | Contrat commun : types, règles métier, moteur de calcul, validation (zod), droits (RBAC), jeu de démonstration |
| `infra` | Docker Compose (Caddy, API, PostgreSQL, Mosquitto), sauvegardes chiffrées |
| `docs` | Architecture, sécurité, données, déploiement, points à valider |

## Démarrer

Prérequis : Node.js 22.

```bash
npm install
npm run dev            # site + démo complète dans le navigateur : http://localhost:5173
```

La démo tourne sans serveur : données simulées, actions gardées dans le navigateur 3 jours.
Sur `/connexion`, trois profils en un clic (responsable de coopérative, technicien, équipe SaytuMbay).

### Avec la vraie API

```bash
npm run dev:api        # API sur :4000, base PGlite embarquée, données de démo au premier lancement
npm run dev:web-api    # site branché sur l'API (proxy /api) : http://localhost:5173
```

Comptes de démonstration (base de développement uniquement) :

| Profil | E-mail | Rôle |
|---|---|---|
| Awa Ndiaye | awa.ndiaye@demo.saytumbay.com | Responsable, Coopérative de Thiès |
| Moussa Sarr | moussa.sarr@demo.saytumbay.com | Exploitant (parcelles A et D) |
| Ibou Faye | ibou.faye@demo.saytumbay.com | Technicien |
| Mamadou Ba | mamadou.ba@demo.saytumbay.com | Lecture seule |
| Khady Gueye | khady.gueye@demo.saytumbay.com | Propriétaire, GIE Niayes Mboro |
| Mame Sow | mame.sow@demo.saytumbay.com | Console (admin), double authentification |

Mot de passe commun : `Demo-SaytuMbay-2026`.
Double authentification de Mame Sow : secret TOTP `JBSWY3DPEHPK3PXP` à ajouter dans une application d'authentification, ou codes de secours `1111-2222`, `3333-4444`… (usage unique). Dans la démo navigateur, le code est `246810`.

Les SMS sont écrits dans les journaux de l'API tant que `SMS_PROVIDER=console`.

## Vérifier

```bash
npm run typecheck      # TypeScript strict, trois paquets
npm test               # 63 tests : règles partagées, sécurité de l'API (PGlite en mémoire), web
npm run e2e            # 20 parcours Playwright + axe (ordinateur et téléphone), sous la CSP de production
```

## Construire

```bash
npm run build                       # site en mode API + bundle de l'API (apps/api/dist)
npm run build:demo -w @saytumbay/web   # site de démonstration statique (hébergement mutualisé)
```

Déploiement : voir [docs/DEPLOIEMENT.md](docs/DEPLOIEMENT.md).

## Documentation

- [Architecture](docs/ARCHITECTURE.md) : flux des données, moteur partagé, choix techniques
- [Sécurité](docs/SECURITE.md) : modèle de menace, mesures, tests correspondants, reste à faire
- [Données](docs/DONNEES.md) : modèle, durées de conservation, loi 2008-12
- [Déploiement](docs/DEPLOIEMENT.md) : Hostinger mutualisé (démo) ou VPS (plateforme complète)
- [Points à valider](docs/A-VALIDER.md) : décisions et informations que l'équipe doit fournir
- [SMS en wolof](docs/SMS-WOLOF.md) : textes des alertes à relire avant mise en service
