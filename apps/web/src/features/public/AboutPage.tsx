/** « À propos » : qui nous sommes (le nom, la mission), où nous en sommes, l'équipe, la FAQ. Le problème chiffré reste sur l'accueil. */
import { usePageTitle } from "@/components/ui/page";
import { useReveal } from "@/lib/reveal";
import { Faq, Mission, PageHeader, Status, Team, useHashScroll } from "./blocks";

export default function AboutPage() {
  usePageTitle("À propos");
  useReveal();
  useHashScroll();
  return (
    <>
      <PageHeader
        id="histoire-titre"
        label="À propos"
        title="SaytuMbay, « veiller sur l’agriculture » en wolof."
        text="C’est notre nom, et c’est notre métier."
        photo="champChoux"
        position="50% 60%"
        alt="Un champ de choux au Sénégal, en rangs, au bord d’une haie."
      />
      <Mission />
      <Status />
      <Team />
      <Faq />
    </>
  );
}
