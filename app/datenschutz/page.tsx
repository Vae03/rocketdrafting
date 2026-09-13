import { LegalPage } from "@/components/legal-page";

export default function DatenschutzPage() {
  return <LegalPage title="Datenschutzerklärung">
    <h2>1. Verantwortlicher</h2>
    <p>Justin Jensen, Treenering 97, 24852 Eggebek, erreichbar über das <a href="/kontakt">Kontaktformular</a> (siehe Impressum).</p>

    <h2>2. Welche Daten wir verarbeiten</h2>
    <h3>2.1 Lokal in deinem Browser (localStorage)</h3>
    <p>Fast alle Spieldaten werden ausschließlich lokal in deinem Browser gespeichert und niemals an uns übertragen: XP, Level, Münzen, Statistiken für das Badge-System, ausgerüstete Shop-Kosmetika und deine Spracheinstellung. Diese Daten verlassen dein Gerät nicht und werden bei Löschung der Browserdaten unwiderruflich entfernt.</p>
    <h3>2.2 Ranked-Modus (Server/Datenbank)</h3>
    <p>Für den Ranked-1v1-Modus wird eine zufällig generierte, anonyme Spieler-ID in deinem Browser erzeugt und lokal gespeichert. Diese ID sowie dein gewählter Anzeigename, dein aktuelles MMR/Matchmaking-Rating, Sieg-/Niederlagen-Anzahl und eine Zusammenfassung deines zuletzt gespeicherten Rosters werden in unserer Datenbank gespeichert, damit ein Matchmaking gegen andere Spieler und ein Leaderboard möglich sind. Ohne eigene Registrierung ist diese ID nicht direkt mit deiner realen Identität verknüpft.</p>
    <h3>2.3 Konto (falls du dich registrierst)</h3>
    <p>Wenn du ein Profil mit E-Mail und Passwort anlegst, speichern wir deine E-Mail-Adresse, ein sicheres Passwort-Hash (niemals das Passwort im Klartext), deinen Anzeigenamen und optional ein Profilbild sowie deine Freundesliste.</p>
    <h3>2.4 Kontaktformular</h3>
    <p>Wenn du das Kontaktformular nutzt, speichern wir die von dir angegebene E-Mail-Adresse sowie deine Nachricht, um deine Anfrage zu beantworten. Diese Daten werden ausschließlich zur Bearbeitung deiner Anfrage verwendet und zusätzlich zur Benachrichtigung per E-Mail an den Betreiber über den Versanddienstleister Resend (Resend Inc.) weitergeleitet (siehe Abschnitt 4).</p>

    <h2>3. Cookies &amp; Tracking</h2>
    <p>Wir verwenden keine Analyse- oder Tracking-Cookies und keine Werbe-Dienste Dritter. Eventuelle technisch notwendige Session-Cookies dienen ausschließlich dazu, dich nach einem Login eingeloggt zu halten.</p>

    <h2>4. Weitergabe an Dritte</h2>
    <p>Es findet keine Weitergabe deiner Daten an Dritte zu Werbezwecken statt. Historische RLCS-Daten werden von Liquipedia bezogen (siehe Impressum); dabei werden keine personenbezogenen Daten von dir an Liquipedia übermittelt. Nachrichten über das Kontaktformular werden zur Benachrichtigung per E-Mail an den Dienstleister Resend übermittelt, der die E-Mail in unserem Auftrag zustellt.</p>

    <h2>5. Deine Rechte</h2>
    <p>Du hast jederzeit das Recht auf Auskunft, Berichtigung, Löschung und Einschränkung der Verarbeitung deiner bei uns gespeicherten Daten (Art. 15–18 DSGVO). Für Anfragen nutze bitte das <a href="/kontakt">Kontaktformular</a>. Lokal gespeicherte Daten (localStorage) kannst du jederzeit selbst über die Einstellungen deines Browsers löschen.</p>

    <h2>6. Änderungen</h2>
    <p>Diese Datenschutzerklärung kann angepasst werden, wenn sich der Funktionsumfang der App ändert. Die jeweils aktuelle Version gilt.</p>
  </LegalPage>;
}
