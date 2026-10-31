# Données

## Modèle

| Table | Contenu | Clé de cloisonnement |
|---|---|---|
| `organizations` | Coopératives, GIE, exploitations ; offre, modules, statut | — |
| `users` | Personnes : nom, e-mail, téléphone, empreinte du mot de passe, secret TOTP chiffré | via `memberships` |
| `memberships` | Rôle d'une personne dans une organisation, parcelles confiées, préférences de notification | `org_id` |
| `sessions`, `login_challenges`, `password_resets`, `invites`, `recovery_codes` | Empreintes de jetons, expirations | `user_id` |
| `measurements` | Mesures horodatées par capteur et par grandeur | via le capteur |
| `alerts` | Alertes ouvertes, prises en charge, résolues ; SMS envoyés | `org_id` |
| `sites`, `parcels`, `devices`, `pumps`, `valves`, `irrigation_*` | AgriTech (tables documents JSONB) | `org_id` |
| `warehouses`, `lots`, `inspections` | Onion (tables documents) | `org_id` |
| `tasks` | Tâches de l'équipe | `org_id` |
| `invoices`, `subscriptions`, `cost_lines`, `firmware_releases`, `rollouts` | Console | `org_id` ou `platform` |
| `audit_log`, `sms_log`, `contact_messages` | Traçabilité, envois, demandes du site | — |

Schéma complet : `apps/api/src/db/schema.ts` ; migration SQL : `apps/api/drizzle/`.
Après une modification du schéma : `npm run db:generate -w @saytumbay/api`, puis relire le SQL produit.

## Durées de conservation (appliquées ou à appliquer)

| Donnée | Durée | Mécanisme |
|---|---|---|
| Sessions expirées, défis, liens de réinitialisation | supprimés dès expiration | tâche d'entretien toutes les 6 h |
| Journal d'audit | 12 mois | tâche d'entretien |
| Comptes | durée du contrat + 30 jours | procédure de fin de contrat (à outiller) |
| Mesures et données agricoles | durée du contrat, export remis, suppression sous 90 jours | idem |
| Factures | 10 ans (droit comptable OHADA) | — |
| Demandes de contact sans suite | 12 mois | à automatiser |

## Loi 2008-12 : correspondance

| Exigence | Où |
|---|---|
| Information des personnes | `/confidentialite` |
| Finalités et bases légales | `/confidentialite`, section « Finalités » |
| Sécurité et confidentialité | `docs/SECURITE.md`, `/securite` |
| Droits d'accès, de rectification, d'opposition, de suppression | Paramètres > « Mes données » (export, demande de suppression) ; adresse à fournir |
| Transferts hors du Sénégal | à décider avec l'hébergeur (voir docs/A-VALIDER.md) |
| Déclaration préalable à la CDP | à faire avant la mise en service |

Les textes du site s'appuient sur la loi n° 2008-12 du 25 janvier 2008. Ils doivent être relus par un juriste avant publication.

## Démo

Toutes les personnes, organisations et mesures de la démo sont fictives (`packages/shared/src/demo/seed.ts`). La démo navigateur ne transmet rien : son état reste dans le stockage local, effacé après 3 jours.
