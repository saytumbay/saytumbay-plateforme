import { LegalPage, Todo } from "./LegalPage";

export default function Securite() {
  return (
    <LegalPage
      title="Sécurité"
      intro={<p>Les mesures qui protègent les comptes, les données des organisations et le parc de capteurs, et la marche à suivre pour nous signaler une faille.</p>}
      updated="31 octobre 2026"
      sections={[
        {
          id: "comptes",
          title: "Comptes et connexion",
          body: (
            <ul>
              <li>Mots de passe d’au moins 12 caractères, hachés avec Argon2id. Ils ne sont jamais stockés ni journalisés en clair.</li>
              <li>Double authentification par application (TOTP) avec codes de secours à usage unique. Obligatoire pour l’équipe SaytuMbay.</li>
              <li>Blocage temporaire après cinq échecs de connexion ; message identique que le compte existe ou non.</li>
              <li>Sessions dans un cookie HttpOnly, Secure et SameSite, renouvelées à la connexion. Chaque personne peut voir et fermer ses sessions ouvertes.</li>
              <li>Liens de réinitialisation à usage unique, valables 30 minutes.</li>
            </ul>
          ),
        },
        {
          id: "acces",
          title: "Cloisonnement et droits",
          body: (
            <ul>
              <li>Chaque requête est vérifiée côté serveur : appartenance à l’organisation, rôle, et pour un exploitant, parcelles qui lui sont confiées. L’interface masque les actions, le serveur les refuse.</li>
              <li>Les données d’une organisation ne sont jamais visibles d’une autre.</li>
              <li>Les actions sensibles (droits, paiements, mises à jour du parc, alertes) sont inscrites au journal d’audit, conservé 12 mois.</li>
            </ul>
          ),
        },
        {
          id: "web",
          title: "Application web",
          body: (
            <ul>
              <li>HTTPS partout, avec HSTS.</li>
              <li>Politique de sécurité du contenu (CSP) stricte : aucun script en ligne, aucune source tierce non déclarée.</li>
              <li>Protection contre les requêtes intersites (jeton CSRF à double soumission), validation stricte de toutes les entrées, limitation du débit sur les points sensibles.</li>
              <li>Exports CSV protégés contre l’injection de formules dans les tableurs.</li>
            </ul>
          ),
        },
        {
          id: "capteurs",
          title: "Capteurs et transmissions",
          body: (
            <ul>
              <li>Les capteurs LoRaWAN chiffrent leurs messages (AES-128) avec des clés propres à chaque appareil.</li>
              <li>La passerelle et le serveur échangent par MQTT sur TLS, avec un identifiant par client et des droits limités à ses propres sujets.</li>
              <li>Les mises à jour du parc se déploient par étapes (10 % des capteurs d’abord) et chaque capteur garde la version précédente en secours.</li>
            </ul>
          ),
        },
        {
          id: "exploitation",
          title: "Exploitation",
          body: (
            <ul>
              <li>Sauvegardes chiffrées quotidiennes de la base de données, restauration testée régulièrement.</li>
              <li>Mises à jour de sécurité des dépendances suivies en continu.</li>
              <li>En cas de violation de données, les organisations concernées sont prévenues sans délai et la Commission de Protection des Données Personnelles est informée.</li>
            </ul>
          ),
        },
        {
          id: "signaler",
          title: "Signaler une vulnérabilité",
          body: (
            <>
              <p>
                Vous pensez avoir trouvé une faille ? Écrivez à <Todo>adresse e-mail sécurité</Todo> avec une description et les étapes pour la reproduire. Nous accusons réception sous 3 jours ouvrés et vous tenons informé de la correction.
              </p>
              <p>Merci de ne pas accéder aux données d’autrui, de ne pas perturber le service et de nous laisser le temps de corriger avant toute publication. Nous ne poursuivrons pas une recherche menée de bonne foi dans ces limites.</p>
            </>
          ),
        },
      ]}
    />
  );
}
