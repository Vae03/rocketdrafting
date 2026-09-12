import { LegalPage } from "@/components/legal-page";
import { ContactForm } from "@/components/contact-form";

export default function KontaktPage() {
  return <LegalPage title="Kontakt">
    <p>Fragen, Feedback, Bug-Reports oder rechtliche Anliegen (z. B. zu verwendeten Team-/Spielernamen)? Füll einfach das Formular aus — wir melden uns bei der angegebenen Adresse zurück.</p>
    <ContactForm />
  </LegalPage>;
}
