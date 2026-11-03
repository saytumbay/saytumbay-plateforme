/** « Contact » : WhatsApp, e-mail et formulaire, puis « Travaillons ensemble » (producteurs, financeurs, institutions). */
import { usePageTitle } from "@/components/ui/page";
import { useReveal } from "@/lib/reveal";
import { Contact, Together, useHashScroll } from "./blocks";

export default function ContactPage() {
  usePageTitle("Contact");
  useReveal();
  useHashScroll();
  return (
    <>
      <Contact level={1} />
      <Together />
    </>
  );
}
