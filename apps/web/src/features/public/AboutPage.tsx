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
        photo="visiteNiague"
        position="50% 60%"
        alt="Une agricultrice examine ses cultures dans un champ à Niague."
      />
      <Context />
      <Status />
      <Team />
      <Faq />
    </>
  );
}
