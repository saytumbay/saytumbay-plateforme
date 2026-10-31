import { LegalPage } from "./LegalPage";

export default function Cookies() {
  return (
    <LegalPage
      title="Cookies et stockage local"
      intro={<p>Le site n’utilise ni mesure d’audience, ni publicité, ni traceur tiers. Il n’y a donc pas de bandeau de consentement : seuls des éléments strictement nécessaires sont déposés.</p>}
      updated="31 octobre 2026"
      draft={false}
      sections={[
        {
          id: "cookies",
          title: "Cookies déposés par la plateforme",
          body: (
            <table>
              <thead>
                <tr>
                  <th scope="col">Nom</th>
                  <th scope="col">Rôle</th>
                  <th scope="col">Durée</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <code>sb_session</code>
                  </td>
                  <td>Garde votre session ouverte. Illisible par les scripts de la page (HttpOnly), envoyé uniquement en HTTPS.</td>
                  <td>Jusqu’à la fermeture du navigateur, ou 30 jours si vous cochez « Rester connecté »</td>
                </tr>
                <tr>
                  <td>
                    <code>sb_csrf</code>
                  </td>
                  <td>Protège vos actions contre les requêtes envoyées à votre insu depuis un autre site.</td>
                  <td>Même durée que la session</td>
                </tr>
              </tbody>
            </table>
          ),
        },
        {
          id: "local",
          title: "Stockage local du navigateur",
          body: (
            <table>
              <thead>
                <tr>
                  <th scope="col">Clé</th>
                  <th scope="col">Rôle</th>
                  <th scope="col">Durée</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <code>saytumbay:theme</code>
                  </td>
                  <td>Mémorise le thème choisi : clair, sombre ou celui du système.</td>
                  <td>Jusqu’à ce que vous le changiez</td>
                </tr>
                <tr>
                  <td>
                    <code>saytumbay:demo:v1</code>
                  </td>
                  <td>Garde l’état de la démonstration (données simulées, vos actions de test).</td>
                  <td>3 jours, ou jusqu’au bouton « Réinitialiser »</td>
                </tr>
              </tbody>
            </table>
          ),
        },
        {
          id: "hors-ligne",
          title: "Fonctionnement hors ligne",
          body: <p>L’application peut s’installer sur un téléphone. Elle garde alors en cache ses fichiers et les dernières données consultées, pour rester lisible quand le réseau coupe. Ce cache se vide en désinstallant l’application ou en effaçant les données du site dans le navigateur.</p>,
        },
        {
          id: "tiers",
          title: "Contenus tiers",
          body: <p>Les fonds de carte sont chargés depuis Esri et OpenStreetMap lorsque vous ouvrez une carte. Ces services reçoivent votre adresse IP pour fournir les images, sans cookie déposé par SaytuMbay.</p>,
        },
      ]}
    />
  );
}
