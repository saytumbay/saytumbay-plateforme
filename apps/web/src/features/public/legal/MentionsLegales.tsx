import { Link } from "react-router";
import { LegalPage, Todo } from "./LegalPage";

export default function MentionsLegales() {
  return (
    <LegalPage
      title="Mentions légales"
      updated="31 octobre 2026"
      sections={[
        {
          id: "editeur",
          title: "Éditeur du site",
          body: (
            <>
              <p>
                Le site saytumbay.com et la plateforme SaytuMbay sont édités par <strong>SaytuMbay</strong>, <Todo>forme juridique, par exemple SAS</Todo> au capital de <Todo>montant</Todo> FCFA.
              </p>
              <ul>
                <li>
                  Siège social : <Todo>adresse complète</Todo>, Dakar, Sénégal
                </li>
                <li>
                  RCCM : <Todo>numéro du registre du commerce</Todo>
                </li>
                <li>
                  NINEA : <Todo>numéro d’identification nationale</Todo>
                </li>
                <li>Téléphone et WhatsApp : +221 77 833 57 81</li>
                <li>Téléphone de Tidiane Sow, directeur général : +221 77 088 94 08</li>
                <li>
                  E-mail : <Todo>adresse de contact</Todo>
                </li>
              </ul>
            </>
          ),
        },
        {
          id: "publication",
          title: "Direction de la publication",
          body: (
            <p>
              Directeur de la publication : <Todo>nom du représentant légal, par exemple Tidiane Sow, directeur général</Todo>.
            </p>
          ),
        },
        {
          id: "hebergement",
          title: "Hébergement",
          body: (
            <>
              <p>
                Hébergeur du site : <Todo>raison sociale, adresse et téléphone de l’hébergeur retenu au déploiement</Todo>.
              </p>
              <p>
                Le nom de domaine saytumbay.com est enregistré auprès de Hostinger. Si les données sont hébergées hors du Sénégal, le transfert est encadré conformément à la loi n°&nbsp;2008-12 (voir la <Link to="/confidentialite">politique de confidentialité</Link>).
              </p>
            </>
          ),
        },
        {
          id: "propriete",
          title: "Propriété intellectuelle",
          body: (
            <p>
              Le nom SaytuMbay, le logo, les textes, illustrations et le logiciel de la plateforme sont la propriété de SaytuMbay ou de ses partenaires. Toute reproduction sans autorisation écrite est interdite. Les données saisies ou mesurées pour une organisation cliente restent la propriété de cette organisation.
            </p>
          ),
        },
        {
          id: "donnees",
          title: "Données personnelles",
          body: (
            <p>
              Le traitement des données personnelles est décrit dans la <Link to="/confidentialite">politique de confidentialité</Link>. Il fait l’objet d’une déclaration auprès de la Commission de Protection des Données Personnelles (CDP) du Sénégal : <Todo>numéro de récépissé de la CDP</Todo>.
            </p>
          ),
        },
        {
          id: "credits",
          title: "Crédits",
          body: (
            <ul>
              <li>Fonds de carte : Esri World Imagery et contributeurs OpenStreetMap.</li>
              <li>Polices : Sora et Atkinson Hyperlegible Next, sous licence SIL Open Font License.</li>
              <li>Icônes : Lucide, sous licence ISC.</li>
            </ul>
          ),
        },
      ]}
    />
  );
}
