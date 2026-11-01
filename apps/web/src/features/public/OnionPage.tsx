/** Page détaillée de SaytuMbay Onion : conservation des stocks d'oignon et de pomme de terre. */
import { usePageTitle } from "@/components/ui/page";
import { useReveal } from "@/lib/reveal";
import { Beyond, CtaBand, Onion, useHashScroll } from "./blocks";

export default function OnionPage() {
  usePageTitle("SaytuMbay Onion");
  useReveal();
  useHashScroll();
  return (
    <>
      <Onion level={1} />
      <Beyond />
      <CtaBand title="Un magasin à surveiller ?" profil="stockage" />
    </>
  );
}
