# Déploiement

Le domaine saytumbay.com est chez Hostinger. Deux options, à choisir selon l'étape du projet.

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

Limite : le formulaire de contact de la démo ne transmet rien. Pendant cette phase, le bouton WhatsApp reste le canal de contact.

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
