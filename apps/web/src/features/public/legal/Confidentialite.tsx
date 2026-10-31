import { Link } from "react-router";
import { LegalPage, Todo } from "./LegalPage";

export default function Confidentialite() {
  return (
    <LegalPage
      title="Politique de confidentialité"
      intro={
        <p>
          Ce que SaytuMbay collecte, pourquoi, combien de temps, et comment exercer vos droits. Ce texte suit la loi sénégalaise n°&nbsp;2008-12 du 25 janvier 2008 sur la protection des données à caractère personnel.
        </p>
      }
      updated="31 octobre 2026"
      sections={[
        {
          id: "responsable",
          title: "Responsable du traitement",
          body: (
            <p>
              SaytuMbay, <Todo>forme juridique et adresse du siège</Todo>, Dakar, Sénégal. Pour toute question sur vos données : <Todo>adresse e-mail dédiée</Todo> ou WhatsApp au +221 77 833 57 81.
            </p>
          ),
        },
        {
          id: "donnees",
          title: "Données collectées",
          body: (
            <>
              <h3>Comptes de la plateforme</h3>
              <ul>
                <li>Nom, prénom, adresse e-mail, numéro de téléphone, langue.</li>
                <li>Organisation, rôle (propriétaire, responsable, exploitant, technicien, lecture seule) et parcelles suivies.</li>
                <li>Préférences de notification (SMS, e-mail, application).</li>
                <li>Sécurité : mot de passe sous forme d’empreinte (jamais en clair), secret de double authentification chiffré, historique de connexion (date, appareil, adresse IP).</li>
              </ul>
              <h3>Données agricoles et de stockage</h3>
              <ul>
                <li>Mesures des capteurs : humidité, température et salinité du sol ; température, humidité, CO₂ et gaz dans les magasins ; niveau de batterie et qualité du signal.</li>
                <li>Contours des parcelles, cultures, irrigations, lots, contrôles visuels et photos, tâches et alertes.</li>
              </ul>
              <p>Ces données concernent d’abord l’exploitation. Elles deviennent personnelles lorsqu’elles sont rattachées à une personne identifiable, par exemple l’exploitant responsable d’une parcelle.</p>
              <h3>Demandes de contact</h3>
              <p>Nom, organisation, téléphone, type d’organisation, localité et message, transmis avec votre accord via le formulaire du site.</p>
            </>
          ),
        },
        {
          id: "finalites",
          title: "Finalités et bases légales",
          body: (
            <table>
              <thead>
                <tr>
                  <th scope="col">Finalité</th>
                  <th scope="col">Base légale</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Fournir le service : mesures, tableaux de bord, alertes, rapports</td>
                  <td>Exécution du contrat avec l’organisation cliente</td>
                </tr>
                <tr>
                  <td>Envoyer les alertes par SMS au responsable désigné</td>
                  <td>Exécution du contrat</td>
                </tr>
                <tr>
                  <td>Sécuriser les comptes, tenir le journal d’audit, prévenir les abus</td>
                  <td>Intérêt légitime de SaytuMbay et de ses clients</td>
                </tr>
                <tr>
                  <td>Facturer et tenir la comptabilité</td>
                  <td>Obligation légale</td>
                </tr>
                <tr>
                  <td>Répondre à une demande de démonstration</td>
                  <td>Consentement, recueilli dans le formulaire</td>
                </tr>
              </tbody>
            </table>
          ),
        },
        {
          id: "durees",
          title: "Durées de conservation",
          body: (
            <ul>
              <li>Comptes : pendant toute la durée du contrat, puis suppression dans les 30 jours après la fin du contrat ou une demande de suppression.</li>
              <li>Mesures et données agricoles : pendant la durée du contrat. Un export complet est remis à l’organisation à la fin du contrat, puis les données sont supprimées sous 90 jours.</li>
              <li>Journal d’audit et historique de connexion : 12 mois.</li>
              <li>Factures : 10 ans, conformément au droit comptable OHADA.</li>
              <li>Demandes de contact sans suite : 12 mois.</li>
            </ul>
          ),
        },
        {
          id: "destinataires",
          title: "Qui accède aux données",
          body: (
            <>
              <ul>
                <li>Les membres de votre organisation, selon leur rôle : un exploitant ne voit que ses parcelles, un lecteur ne modifie rien.</li>
                <li>L’équipe SaytuMbay habilitée (support, administration), uniquement pour le support, la maintenance et la facturation. Chaque accès est inscrit au journal d’audit.</li>
                <li>
                  Nos sous-traitants techniques, tenus à la confidentialité : hébergeur <Todo>nom</Todo>, opérateur d’envoi des SMS <Todo>par exemple Orange Sénégal</Todo>, service d’envoi d’e-mails <Todo>nom</Todo>.
                </li>
              </ul>
              <p>SaytuMbay ne vend pas vos données et ne les utilise pas à des fins publicitaires.</p>
            </>
          ),
        },
        {
          id: "transferts",
          title: "Transferts hors du Sénégal",
          body: (
            <p>
              Si l’hébergement ou un sous-traitant se situe hors du Sénégal, le transfert n’a lieu que vers un pays assurant un niveau de protection suffisant ou après autorisation de la Commission de Protection des Données Personnelles, comme le prévoit la loi n°&nbsp;2008-12. Localisation de l’hébergement : <Todo>pays du centre de données</Todo>.
            </p>
          ),
        },
        {
          id: "securite",
          title: "Sécurité",
          body: (
            <p>
              Connexions chiffrées (HTTPS), mots de passe hachés avec Argon2id, double authentification, blocage après plusieurs échecs de connexion, cloisonnement strict entre organisations, journal d’audit et sauvegardes chiffrées. Le détail est sur la page <Link to="/securite">Sécurité</Link>.
            </p>
          ),
        },
        {
          id: "droits",
          title: "Vos droits",
          body: (
            <>
              <p>Vous pouvez demander l’accès à vos données, leur rectification, leur suppression, ou vous opposer à leur traitement pour un motif légitime. Depuis votre espace, la rubrique Paramètres, onglet « Mes données », permet aussi d’exporter vos informations.</p>
              <p>
                Écrivez à <Todo>adresse e-mail dédiée</Todo> en précisant votre nom et votre organisation. Nous répondons sous 30 jours au plus. En cas de désaccord, vous pouvez saisir la Commission de Protection des Données Personnelles du Sénégal (
                <a href="https://www.cdp.sn" target="_blank" rel="noopener noreferrer">
                  cdp.sn
                </a>
                ).
              </p>
            </>
          ),
        },
        {
          id: "cookies",
          title: "Cookies",
          body: (
            <p>
              Le site n’utilise que les cookies nécessaires à la connexion et à la sécurité, sans mesure d’audience ni publicité. Voir la page <Link to="/cookies">Cookies</Link>.
            </p>
          ),
        },
      ]}
    />
  );
}
