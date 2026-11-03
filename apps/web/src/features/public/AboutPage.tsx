/** « À propos » : le problème, où nous en sommes, l'équipe, la FAQ. */
import { usePageTitle } from "@/components/ui/page";
import { useReveal } from "@/lib/reveal";
import { Context, Faq, PageHeader, Status, Team, useHashScroll } from "./blocks";

export default function AboutPage() {
  usePageTitle("À propos");
  useReveal();
  useHashScroll();
  return (
    <>
      <PageHeader
        id="histoire-titre"
        label="À propos"
        title="Voir la perte avant qu’elle arrive."
        text="D’où vient SaytuMbay, et où nous en sommes aujourd’hui."
        photo="rangees"
        position="50% 45%"
        alt="Rangées d’oignons dans une parcelle au Sénégal."
      />
      <Context />
      <Status />
      <Team />
      <Faq />
    </>
  );
}
