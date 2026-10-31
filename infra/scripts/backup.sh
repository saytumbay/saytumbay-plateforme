#!/usr/bin/env sh
# Sauvegarde chiffrée de PostgreSQL (AES-256, clé dérivée PBKDF2), rotation 14 jours.
# Cron conseillé (tous les jours à 02:30) :  30 2 * * *  /opt/saytumbay/infra/scripts/backup.sh
# Restauration : openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -in FICHIER -pass env:BACKUP_PASSPHRASE | gunzip | \
#   docker compose -f infra/docker-compose.yml exec -T db psql -U saytumbay -d saytumbay
set -eu
cd "$(dirname "$0")/../.."
. infra/.env
: "${BACKUP_DIR:?}" "${BACKUP_PASSPHRASE:?}"
mkdir -p "$BACKUP_DIR"
umask 077
FILE="$BACKUP_DIR/saytumbay-$(date -u +%Y%m%dT%H%M%SZ).sql.gz.enc"
docker compose -f infra/docker-compose.yml exec -T db pg_dump -U saytumbay -d saytumbay --no-owner \
  | gzip -9 \
  | BACKUP_PASSPHRASE="$BACKUP_PASSPHRASE" openssl enc -aes-256-cbc -salt -pbkdf2 -iter 200000 -pass env:BACKUP_PASSPHRASE -out "$FILE"
find "$BACKUP_DIR" -name 'saytumbay-*.sql.gz.enc' -mtime +14 -delete
echo "Sauvegarde : $FILE ($(du -h "$FILE" | cut -f1))"
