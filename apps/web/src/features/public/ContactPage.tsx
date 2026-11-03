/** « Contact » : WhatsApp, e-mail, réseaux sociaux et formulaire. */
import { usePageTitle } from "@/components/ui/page";
import { Contact } from "./blocks";

export default function ContactPage() {
  usePageTitle("Contact");
  return <Contact level={1} />;
}
