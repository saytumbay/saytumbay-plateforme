# Identifiants MQTT

Le fichier `passwd` n'est jamais versionné. Pour le créer :

```bash
docker run --rm -v "$PWD:/w" eclipse-mosquitto:2.0 mosquitto_passwd -c -b /w/passwd api 'MOT_DE_PASSE_API'
docker run --rm -v "$PWD:/w" eclipse-mosquitto:2.0 mosquitto_passwd -b /w/passwd chirpstack 'MOT_DE_PASSE_CHIRPSTACK'
docker run --rm -v "$PWD:/w" eclipse-mosquitto:2.0 mosquitto_passwd -b /w/passwd gw-org-thies 'MOT_DE_PASSE_PASSERELLE'
chmod 600 passwd
```

Le mot de passe `api` doit être celui de `MQTT_API_PASSWORD` dans `infra/.env`.
L'API refuse aussi, de son côté, une mesure dont l'organisation du sujet n'est pas celle du capteur.
