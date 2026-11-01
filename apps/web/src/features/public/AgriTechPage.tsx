/** Page détaillée de SaytuMbay AgriTech : fonctions, journée type, installation existante. */
import { usePageTitle } from "@/components/ui/page";
import { useReveal } from "@/lib/reveal";
import { AgriTech, CtaBand, Equipment, InAction, useHashScroll } from "./blocks";

export default function AgriTechPage() {
  usePageTitle("SaytuMbay AgriTech");
  useReveal();
  useHashScroll();
  return (
    <>
      <AgriTech level={1} />
      <InAction />
      <Equipment />
      <CtaBand title="Une parcelle à équiper ?" profil="exploitation" />
    </>
  );
}
