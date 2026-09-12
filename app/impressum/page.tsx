import { LegalPage } from "@/components/legal-page";

export default function ImpressumPage() {
  return <LegalPage title="Impressum">
    <p>Angaben gemäß § 5 TMG:</p>
    <p>
      Justin Jensen<br />
      Treenering 97<br />
      24852 Eggebek
    </p>
    <h2>Kontakt</h2>
    <p>Über das <a href="/kontakt">Kontaktformular</a>.</p>
    <h2>Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h2>
    <p>Justin Jensen (Anschrift wie oben)</p>
    <h2>Haftungshinweis</h2>
    <p>RocketLeagueDraft ist ein nicht-kommerzielles, privates Hobbyprojekt. Die verwendeten historischen Daten (Teams, Spieler, Platzierungen) stammen von Liquipedia (CC-BY-SA 3.0) und dienen ausschließlich der Illustration; sie stellen keine offizielle Statistik dar. Team- und Spielernamen sind Eigentum der jeweiligen Rechteinhaber und werden nur zur Veranschaulichung historischer Wettbewerbsdaten verwendet. Es besteht keine Verbindung zu Psyonix, Epic Games oder der Rocket League Championship Series.</p>
    <p>Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine Haftung für die Inhalte externer Links. Für den Inhalt der verlinkten Seiten sind ausschließlich deren Betreiber verantwortlich.</p>
  </LegalPage>;
}
