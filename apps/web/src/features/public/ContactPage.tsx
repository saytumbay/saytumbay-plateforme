/** « Contact » : « Travaillons ensemble » (producteurs, financeurs, institutions), puis WhatsApp, e-mail et formulaire. */
import { usePageTitle } from "@/components/ui/page";
import { useReveal } from "@/lib/reveal";
import { Contact, Together, useHashScroll } from "./blocks";

export default function ContactPage() {
  usePageTitle("Contact");
  useReveal();
  useHashScroll();
  return (
    <>
      <Together level={1} />
      <Contact />
    </>
  );
}
