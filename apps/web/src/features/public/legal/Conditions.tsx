import { Link } from "react-router";
import { LegalPage, Todo } from "./LegalPage";

export default function Conditions() {
  return (
    <LegalPage
      title="Conditions d’utilisation"
      intro={<p>Les règles d’usage de la plateforme SaytuMbay. Le contrat signé avec votre organisation précise le matériel, le prix et les engagements de service ; en cas de différence, le contrat prévaut.</p>}
      updated="31 octobre 2026"
      sections={[
        {
          id: "objet",
          title: "Objet",
          body: <p>SaytuMbay fournit une plateforme en ligne qui affiche les mesures de capteurs installés sur des parcelles et dans des magasins de stockage, envoie des alertes et produit des rapports. Ces conditions s’appliquent à toute personne qui utilise la plateforme, y compris en mode démonstration.</p>,
        },
        {
          id: "comptes",
          title: "Comptes et accès",
          body: (
            <ul>
              <li>Un compte est personnel. Vous ne partagez pas votre mot de passe et vous activez la double authentification si votre rôle le demande.</li>
              <li>Le propriétaire ou le responsable de l’organisation invite les membres et choisit leur rôle. Il retire l’accès d’une personne qui quitte l’organisation.</li>
              <li>Signalez sans attendre toute connexion que vous ne reconnaissez pas.</li>
            </ul>
          ),
        },
        {
          id: "usage",
          title: "Usage acceptable",
          body: (
            <ul>
              <li>Pas de tentative d’accès aux données d’une autre organisation, ni de contournement des protections.</li>
              <li>Pas d’envoi de contenus illicites dans les champs libres.</li>
              <li>Pas d’usage automatisé abusif de la plateforme. Une interface de programmation peut être ouverte sur demande.</li>
            </ul>
          ),
        },
        {
          id: "service",
          title: "Mesures, alertes et limites",
          body: (
            <>
              <p>Les mesures dépendent du bon état des capteurs, de leur position et de la couverture radio et mobile. Les SMS dépendent des opérateurs téléphoniques. SaytuMbay surveille le parc et signale les capteurs muets, mais ne garantit pas qu’aucune mesure ni alerte ne sera retardée ou perdue.</p>
              <p>Les recommandations (durée d’irrigation, aération, tri) sont des aides à la décision. Elles ne remplacent pas l’observation sur le terrain et la décision de l’exploitant.</p>
              <p>Lorsque des vannes connectées sont installées, les commandes envoyées depuis la plateforme sont journalisées. L’organisation reste responsable des réglages qu’elle choisit.</p>
            </>
          ),
        },
        {
          id: "donnees",
          title: "Données de l’organisation",
          body: (
            <p>
              Les données mesurées ou saisies appartiennent à l’organisation cliente. SaytuMbay les traite uniquement pour fournir le service, et ne les utilise pas à d’autres fins sans accord écrit. Elles peuvent être exportées à tout moment. Voir la <Link to="/confidentialite">politique de confidentialité</Link>.
            </p>
          ),
        },
        {
          id: "demo",
          title: "Mode démonstration",
          body: <p>La démonstration en ligne utilise des données simulées. Elle tourne entièrement dans votre navigateur et ne transmet rien à nos serveurs ; vos actions y restent locales et sont effacées au bout de trois jours ou par le bouton « Réinitialiser ».</p>,
        },
        {
          id: "responsabilite",
          title: "Responsabilité",
          body: (
            <p>
              La responsabilité de SaytuMbay est limitée aux dommages directs prouvés et plafonnée selon les termes du contrat : <Todo>plafond à définir, par exemple les sommes payées sur les 12 derniers mois</Todo>. SaytuMbay n’est pas responsable des pertes de récolte ou de stock dues à des causes extérieures au service.
            </p>
          ),
        },
        {
          id: "fin",
          title: "Fin du service",
          body: <p>À la fin du contrat, l’organisation reçoit un export complet de ses données. Les comptes sont ensuite fermés et les données supprimées selon les durées indiquées dans la politique de confidentialité.</p>,
        },
        {
          id: "droit",
          title: "Droit applicable",
          body: (
            <p>
              Ces conditions sont régies par le droit sénégalais. En cas de litige, une solution amiable est recherchée en priorité ; à défaut, les juridictions de Dakar sont compétentes. <Todo>à valider par un juriste</Todo>
            </p>
          ),
        },
      ]}
    />
  );
}
