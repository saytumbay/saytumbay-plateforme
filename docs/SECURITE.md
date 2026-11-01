# Sécurité

## Ce que l'on protège

| Bien | Risque principal |
|---|---|
| Données des organisations (parcelles, stocks, mesures, membres) | Lecture ou modification par une autre organisation |
| Comptes | Vol de mot de passe, devinette, session volée |
| Console SaytuMbay | Accès à tous les clients, facturation |
| Parc de capteurs | Fausses mesures, fausses alertes, mise à jour malveillante |
| Numéros de téléphone | Fuite, envoi de SMS abusifs |

## Mesures en place et tests qui les vérifient

Les tests de `apps/api/test/security.test.ts` tournent sur l'application complète (base PGlite en mémoire, données de démo).

| Mesure | Où | Test |
|---|---|---|
| Mots de passe Argon2id (19 Mio, t=2), 12 caractères minimum avec majuscules, minuscules, chiffre | `lib/crypto.ts`, `schemas.ts` | `crypto.test.ts` |
| Message identique et temps de calcul identique que le compte existe ou non | `routes/auth.ts`, `verifyPassword` | « refuse un mauvais mot de passe… » |
| Verrouillage 15 min après 5 échecs par adresse | `login_failures` | « verrouille le compte… » |
| Limitation de débit par IP : 10 connexions/min, 5 demandes de réinitialisation/15 min, 5 contacts/h, 300 requêtes/min au total | `@fastify/rate-limit` | « limite les tentatives… par adresse IP » |
| Session : jeton aléatoire 256 bits en cookie HttpOnly, Secure, SameSite=Lax ; seule l'empreinte SHA-256 est stockée ; nouveau jeton à chaque connexion | `plugins/auth.ts` | « pose un cookie… », « déconnexion… » |
| CSRF : jeton lié à la session, exigé en en-tête sur toute écriture ; contrôle de l'en-tête Origin | `plugins/auth.ts` | « refuse une écriture sans… », « …venant d'un autre site » |
| Double authentification TOTP (RFC 6238), secret chiffré AES-256-GCM, 5 essais par défi, codes de secours à usage unique ; obligatoire pour la console | `routes/auth.ts`, `needPlatform` | « exige la double authentification », « un code de secours ne sert qu'une fois », « bloqué après 5 essais », vecteurs RFC dans `crypto.test.ts` |
| Cloisonnement : dépôt qui exige l'organisation ; réponse 404 (pas 403) pour ne pas révéler l'existence d'une ressource | `db/repo.ts`, `need()` | « un membre du GIE ne voit rien… », « ne peut ni modifier ni commander… » |
| Périmètre de l'exploitant : parcelles, capteurs, séries et alertes limités aux parcelles confiées | `services/state.ts` (`memberScope`) | « un exploitant ne voit que ses parcelles… » |
| Pas d'escalade : on n'attribue ni ne retire un rôle supérieur au sien ; on ne change pas son propre rôle ; dernier propriétaire protégé | `canAssignRole`, `routes/work.ts` | « un responsable ne peut pas… », « le dernier propriétaire… » |
| Jetons de réinitialisation (30 min) et d'invitation (7 jours) aléatoires, à usage unique, stockés en empreinte ; toutes les sessions fermées après réinitialisation | `routes/auth.ts` | « mot de passe oublié… », « invitation… » |
| Validation stricte de toutes les entrées (zod), corps limité à 256 Ko, requêtes SQL paramétrées | partout | « valide les entrées », « recherche… », « refuse un corps trop volumineux » |
| Champ piège anti-robot accepté puis ignoré (ne se trahit pas par une erreur) | `/contact` | « le champ piège est ignoré » |
| En-têtes : CSP stricte sans script en ligne, HSTS, nosniff, X-Frame-Options, Referrer-Policy, Permissions-Policy, Cache-Control no-store sur l'API | `app.ts`, `security-headers.ts`, Caddyfile | « pose les en-têtes… » ; les 24 parcours e2e tournent sous la CSP de production |
| MQTT : pas d'anonyme, un identifiant par client, ACL par organisation, TLS pour l'extérieur ; l'API refuse une mesure dont le sujet ne correspond pas à l'organisation du capteur | `infra/mosquitto`, `services/ingest.ts` | « refuse une mesure publiée sous le sujet d'une autre organisation » |
| Exports CSV protégés contre l'injection de formules | `lib/export.ts` | `src/test/security.test.ts` (web) |
| Redirection après connexion limitée aux chemins internes | `safeNext` | idem |
| Journal d'audit : connexions, refus, changements de droits, paiements, mises à jour, alertes ; 12 mois | `audit_log` | — |
| Cache hors ligne de l'API vidé au changement de compte sur un appareil partagé | `lib/auth.tsx` | — |
| Conteneur API en lecture seule, utilisateur non root, `no-new-privileges` ; base non exposée | `infra/docker-compose.yml` | — |

Dépendances de production : `npm audit --omit=dev` → 0 vulnérabilité (31 octobre 2026).

## Reste à faire avant d'ouvrir à de vrais clients

1. **Test d'intrusion externe** sur l'instance de préproduction (les tests automatiques ne remplacent pas un regard extérieur).
2. **Déclaration à la CDP** du traitement (loi 2008-12), avant la collecte.
3. **Contrat Orange SMS** (ou autre opérateur) et numéro expéditeur ; limiter le volume quotidien par organisation côté opérateur.
4. **Sauvegardes** : programmer `infra/scripts/backup.sh`, copier hors du serveur, tester une restauration.
5. **Clés** : générer `ENCRYPTION_KEY` et `BACKUP_PASSPHRASE`, les garder dans un coffre (perdre la première désactive toutes les doubles authentifications).
6. **Fournisseur d'e-mails** si l'on veut doubler les SMS de réinitialisation par e-mail.
7. **Surveillance** : alerte si l'API ne répond plus ou si aucune mesure n'arrive pendant 1 h (UptimeRobot, Healthchecks.io ou équivalent).
8. **Mises à jour** : appliquer chaque mois les correctifs des images Docker et des dépendances.

## Signaler une faille

Procédure publique sur la page `/securite` du site. Contact : `contact@saytumbay.com`, publié aussi dans `/.well-known/security.txt` (RFC 9116, à renouveler avant le 1er novembre 2027).
