# Déploiement

Le domaine saytumbay.com est chez Hostinger. Deux options, à choisir selon l'étape du projet.

**Décision actuelle (novembre 2026) : option A seulement.** Le site vitrine et la démo ne stockent aucune donnée personnelle, donc aucune démarche CDP n'est nécessaire à ce stade. La plateforme avec de vraies données viendra ensuite, de préférence sur des machines hébergées au Sénégal (voir « Option C »). Hostinger ou Vercel conviennent tous deux pour l'option A ; le `.htaccess` fourni est prévu pour Hostinger.

## En ligne aujourd'hui : Vercel (adresse vercel.app)

Depuis le 3 novembre 2026, le site public et la démo sont en ligne sur **https://saytumbay-plateforme.vercel.app**, sans lien avec saytumbay.com.

- Projet Vercel « saytumbay-plateforme », relié au dépôt GitHub `saytumbayIF/saytumbay-plateforme`, branche `main`.
- Réglages : Root Directory `apps/web`, Framework Preset « Other », aucune variable d'environnement, aucun domaine personnalisé.
- **Chaque push sur `main` redéploie le site.** Lancer `npm run typecheck`, `npm test` et `npm run e2e` avant de pousser.
- Le build (`npm run build:demo`, fixé dans `apps/web/vercel.json`) écrit le site au format Build Output API de Vercel. Le module `vercelOutput` de `apps/web/vite.config.ts` y ajoute les routes de l'application, le cache et les en-têtes de sécurité tirés de `security-headers.ts`. Hors Vercel, le build ne change pas.
- L'adresse vercel.app envoie `X-Robots-Tag: noindex` : elle n'est pas indexée et ne concurrencera pas saytumbay.com.

## Option A — Site et démo sur l'hébergement mutualisé (Dakar Night Market, présentation)

Pas de serveur à administrer : le site public et la démo complète (données simulées, dans le navigateur).

```bash
npm install
npm run build:demo -w @saytumbay/web
```

1. hPanel Hostinger > Sites web > saytumbay.com > Gestionnaire de fichiers.
2. Vider `public_html/` (garder une copie), puis y envoyer **le contenu** de `apps/web/dist/` (y compris le fichier caché `.htaccess`).
3. hPanel > Sécurité > SSL : activer le certificat gratuit et « Forcer HTTPS ».
4. Vérifier : https://saytumbay.com, puis https://saytumbay.com/connexion (profils de démonstration) et une route profonde comme https://saytumbay.com/app/parcelles (doit s'ouvrir, pas d'erreur 404).

Le `.htaccess` fourni gère la redirection HTTPS, les routes de l'application, le cache et les en-têtes de sécurité (CSP comprise).

Formulaire de contact : sans serveur, rien n'est enregistré. Le visiteur remplit le formulaire, puis choisit « Envoyer par WhatsApp » (77 833 57 81) ou « Envoyer par e-mail » (contact@saytumbay.com) : le message s'ouvre déjà rédigé dans son application et il l'envoie lui-même. Avec l'API (options B et C), le formulaire enregistre les messages dans la base.

## Option B — Plateforme complète sur un VPS (pilotes, vrais capteurs)

Hostinger KVM 2 (2 vCPU, 8 Go) ou équivalent suffit largement pour les pilotes. Ubuntu 24.04.

### 1. Serveur

```bash
apt update && apt -y upgrade
adduser deploy && usermod -aG sudo deploy
# Clé SSH, puis dans /etc/ssh/sshd_config : PasswordAuthentication no, PermitRootLogin no
ufw allow OpenSSH && ufw allow 80,443/tcp && ufw allow 443/udp && ufw allow 8883/tcp && ufw enable
apt -y install unattended-upgrades fail2ban
curl -fsSL https://get.docker.com | sh && usermod -aG docker deploy
```

### 2. DNS (hPanel > Domaines > saytumbay.com > DNS)

| Type | Nom | Valeur |
|---|---|---|
| A | @ | IP du VPS |
| A | www | IP du VPS |
| CAA | @ | `0 issue "letsencrypt.org"` |

### 3. Application

```bash
git clone <dépôt> /opt/saytumbay && cd /opt/saytumbay
cp infra/.env.example infra/.env && nano infra/.env      # remplir chaque secret
# Identifiants MQTT : voir infra/mosquitto/README.md
npm ci && npm run build -w @saytumbay/web                  # site en mode API
docker compose -f infra/docker-compose.yml --env-file infra/.env up -d --build
docker compose -f infra/docker-compose.yml logs -f api
```

Caddy obtient le certificat HTTPS au premier démarrage. Adapter ensuite les chemins du certificat dans `infra/mosquitto/mosquitto.conf` (listener 8883) et redémarrer Mosquitto.

### 4. Premier compte

Base vide en production : créer le compte console, puis la première organisation et son propriétaire.

```bash
C="docker compose -f infra/docker-compose.yml exec api node dist/db/bootstrap-cli.js"
$C admin --email mame@saytumbay.com --prenom Mame --nom Sow --tel 771234567
$C org --nom "Coopérative de Thiès" --type cooperative --localite Mboro --region Thiès --modules agritech,onion \
  --lat 15.142 --lng -16.883 \
  --proprietaire-email awa@coop-thies.sn --proprietaire-prenom Awa --proprietaire-nom Ndiaye --proprietaire-tel 774120833
```

Chaque commande affiche un mot de passe provisoire une seule fois. À la première connexion : changer le mot de passe, puis activer la double authentification (obligatoire pour la console). Le propriétaire invite ensuite ses membres depuis « Membres et rôles ».

Pour une **démo publique sur le vrai serveur** (données fictives) : `SEED_DEMO=true`, `DEMO_LOGIN=true`, `SIMULATOR=true` sur une base vide. Ne jamais l'activer sur une base qui contient des clients.

### 5. ChirpStack

ChirpStack v4 peut tourner sur le même VPS (image officielle `chirpstack/chirpstack`, avec Redis et sa propre base) ou chez un fournisseur. L'intégration MQTT doit publier sur le Mosquitto de la pile avec l'identifiant `chirpstack`. Dans SaytuMbay, renseigner le DevEUI de chaque capteur (`devices.ref`).

### 6. Sauvegardes et surveillance

```bash
crontab -e
30 2 * * * /opt/saytumbay/infra/scripts/backup.sh >> /var/log/saytumbay-backup.log 2>&1
```

Copier les sauvegardes hors du serveur (stockage objet, autre VPS) et tester une restauration chaque trimestre. Surveiller `https://saytumbay.com/api/health`.

### Mise à jour

```bash
cd /opt/saytumbay && git pull
npm ci && npm run build -w @saytumbay/web
docker compose -f infra/docker-compose.yml --env-file infra/.env up -d --build
```

Les migrations de base s'appliquent au démarrage de l'API.

## Option C — Plateforme complète hébergée au Sénégal (cible, avec financement)

Même logiciel que l'option B : tout tient dans `infra/docker-compose.yml` (Caddy, API, PostgreSQL, Mosquitto) et tourne sur n'importe quelle machine Linux. Les données restent au Sénégal : une **déclaration** à la CDP suffit en principe, au lieu d'une demande d'autorisation pour un hébergement à l'étranger (à confirmer avec la CDP).

Deux façons de faire :

1. **Vos propres serveurs dans un data center sénégalais** (hébergement « en colocation ») : vous achetez les machines, le data center fournit l'électricité secourue, la climatisation, la sécurité physique et une connexion fiable. C'est la solution la plus sûre.
2. **Une machine dans vos locaux** : moins chère au départ, mais à éviter pour des clients en production sans les conditions ci-dessous.

Conditions minimales, quelle que soit la solution :

| Besoin | Pourquoi | Repère |
|---|---|---|
| Électricité secourue | Une coupure arrête les alertes | Onduleur, groupe ou solaire avec batteries ; au moins 4 h d'autonomie |
| Connexion internet fixe et adresse IP fixe | Les passerelles LoRaWAN et les navigateurs doivent joindre le serveur | Fibre professionnelle ; une 4G de secours |
| Deux machines | Une panne ne doit pas tout arrêter | Une en service, une prête à prendre le relais avec la dernière sauvegarde |
| Sauvegardes ailleurs, mais au Sénégal | Un incendie ou un vol ne doit pas tout effacer | `infra/scripts/backup.sh` chiffré, copié chaque nuit vers un second site |
| Surveillance | Être prévenu avant les clients | Alerte si `/api/health` ne répond plus ou si aucune mesure n'arrive pendant 1 h |
| Machine | Suffisant pour les premiers pilotes | 4 cœurs, 16 Go de mémoire, SSD 500 Go ; disques en miroir (RAID 1) |

Le passage de l'option B à l'option C se fait sans changer le code : installer la même pile, restaurer la dernière sauvegarde PostgreSQL, puis pointer le DNS de saytumbay.com vers la nouvelle adresse.
