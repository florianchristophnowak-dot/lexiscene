import { APP_NAME, APP_VERSION } from '../domain/model';
import { PHASES, STEPS, stepsOfPhase } from '../domain/steps';

const SHORTCUTS: [string, string][] = [
  ['→', 'Nächster Schritt'],
  ['Leertaste', 'Nächster Schritt'],
  ['←', 'Einen Schritt zurück'],
  ['Esc', 'Vollbild verlassen; außerhalb des Vollbilds zurück in die Vorbereitung'],
];

export function HelpView() {
  return (
    <div className="page">
      <div className="stack-tight">
        <h1 className="page__title">Hilfe</h1>
        <p className="muted">
          {APP_NAME} unterscheidet zwei Arbeitszustände: <strong>Vorbereiten</strong> für die Planung und{' '}
          <strong>Unterrichten</strong> für die ablenkungsfreie Präsentation.
        </p>
      </div>

      <section className="panel">
        <div className="panel__header">
          <span className="panel__title">Unterrichtsmodus bedienen</span>
        </div>
        <div className="panel__body stack">
          <ul className="help-list">
            {SHORTCUTS.map(([key, description]) => (
              <li key={key}>
                <span className="kbd">{key}</span>
                <span>{description}</span>
              </li>
            ))}
          </ul>
          <p className="muted text-sm">
            Alle Funktionen sind auch als Schaltflächen vorhanden und für Touch- und Stiftbedienung ausgelegt. Mit
            „Bedeutung“, „Schriftbild“, „Übersetzung“ und „Hilfen“ blenden Sie Informationen einzeln ein und wieder
            aus. Beim Betreten eines Schritts ist bewusst nur das sichtbar, was dieser Schritt braucht.
          </p>
          <p className="muted text-sm">
            Der Unterricht lässt sich jederzeit über „Vorbereiten“ verlassen und später an derselben Stelle
            fortsetzen – die Startseite bietet dann „Unterricht fortsetzen“ an.
          </p>
          <p className="muted text-sm">
            <strong>Zweitbildschirm:</strong> Die gleichnamige Schaltfläche öffnet ein zweites Fenster, das nur die
            Projektion zeigt. Dieses Fenster gehört auf den Beamer; auf dem Gerät der Lehrkraft erscheinen dann
            zusätzlich Modelläußerung, Bedeutung, Methode und Notiz, die die Klasse nicht sieht. Der Browser muss
            Pop-ups für diese Seite erlauben.
          </p>
        </div>
      </section>

      <section className="panel">
        <div className="panel__header">
          <span className="panel__title">Sechs Phasen als Grundstruktur</span>
        </div>
        <div className="panel__body stack">
          <p className="muted text-sm">
            LexiScène folgt dem Modell <strong>Kontext – Klarheit – Muster – Abruf – Gebrauch – Wiederbegegnung</strong>.
            Die Phasen geben die Richtung; welche Schritte darin vorkommen, entscheiden Sie je Sequenz und Einheit.
            Es gibt keinen festen Ablauf, den jede Einführung durchlaufen müsste.
          </p>
          <ol className="help-list">
            {PHASES.map((phase) => (
              <li key={phase.id}>
                <span className="kbd">{phase.position}</span>
                <span>
                  <strong>{phase.label}</strong> — <span className="muted">{phase.purpose}</span>
                  <span className="field__hint" style={{ display: 'block' }}>
                    {stepsOfPhase(phase.id).length > 0
                      ? `Schritte: ${stepsOfPhase(phase.id)
                          .map((step) => step.label)
                          .join(', ')}`
                      : 'Eigener Bereich: Reaktivieren'}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="panel">
        <div className="panel__header">
          <span className="panel__title">Die elf Schritte im Einzelnen</span>
        </div>
        <div className="panel__body stack">
          <ol className="help-list">
            {STEPS.map((step) => (
              <li key={step.id}>
                <span className="kbd">{step.position}</span>
                <span>
                  <strong>{step.label}</strong> — <span className="muted">{step.purpose}</span>
                </span>
              </li>
            ))}
          </ol>
          <p className="muted text-sm">
            Schritte lassen sich pro Sequenz und pro Einheit abschalten und frei umsortieren – per Ziehen oder über die
            Pfeilschaltflächen. Schritte ohne hinterlegtes Material werden automatisch übersprungen. Ob das Klangbild
            vor dem Schriftbild kommt und wann die Schrift erscheint, ist eine Regieentscheidung, keine feste Regel.
          </p>
          <p className="muted text-sm">
            <strong>Bedeutung erschließen</strong> ist kein Pflichtschritt. In den Sequenzeinstellungen wählen Sie, ob
            erschlossen wird: gar nicht, wo der Kontext es hergibt, oder bewusst als Strategietraining. Die Klärung
            folgt in jedem Fall.
          </p>
        </div>
      </section>

      <section className="panel">
        <div className="panel__header">
          <span className="panel__title">Beobachten statt bewerten</span>
        </div>
        <div className="panel__body stack">
          <p className="muted text-sm">
            In Abruf- und Gebrauchsschritten halten Sie mit „sicher“, „mit Hilfe“ oder „noch nicht“ fest, wie die
            <strong> Klasse</strong> reagiert hat – nicht einzelne Lernende. Die Rückmeldung wird der jeweiligen
            Wissensdimension zugeordnet: Bedeutung, Form, Muster oder Gebrauch.
          </p>
          <p className="muted text-sm">
            Daraus entstehen keine Punkte, Noten oder Gesamtlernstände. In der Vorbereitung sehen Sie je Einheit den
            jüngsten Stand der vier Dimensionen und darunter den vollständigen Verlauf. Eine Reaktivierung überschreibt
            einen erreichten Stand nicht.
          </p>
          <p className="muted text-sm">
            Verklickt? Ein zweiter Klick auf eine andere Rückmeldung ersetzt die des laufenden Schritts. Einzelne
            Einträge lassen sich im Verlauf der Einheit entfernen.
          </p>
        </div>
      </section>

      <section className="panel">
        <div className="panel__header">
          <span className="panel__title">Einheiten anlegen</span>
        </div>
        <div className="panel__body stack">
          <p className="muted text-sm">
            <strong>Schnelleingabe:</strong> Ausdruck eintippen und mit der Eingabetaste übernehmen – Einzelheiten
            ergänzen Sie später in der Detailspalte.
          </p>
          <p className="muted text-sm">
            <strong>Aus einer Tabelle:</strong> Text aus einer Tabellenkalkulation einfügen. Tabulator, Semikolon und
            Komma werden erkannt; die Spaltenzuordnung schlägt die App vor und lässt sich vor dem Übernehmen ändern.
          </p>
          <p className="muted text-sm">
            <strong>Eigene Aufnahme:</strong> Im Feld „Audio“ nimmt „Selbst aufnehmen“ die Modelläußerung direkt über
            das Mikrofon auf. Die Aufnahme bleibt auf diesem Gerät.
          </p>
        </div>
      </section>

      <section className="panel">
        <div className="panel__header">
          <span className="panel__title">Offline und Installation</span>
        </div>
        <div className="panel__body stack">
          <p className="muted text-sm">
            In Edge oder Chrome lässt sich {APP_NAME} über das Installationssymbol in der Adressleiste als App
            installieren. Nach dem ersten Laden funktioniert die App ohne Internetverbindung; alle Inhalte liegen in
            der lokalen Browserdatenbank dieses Geräts.
          </p>
          <p className="muted text-sm">
            Sichern Sie Ihre Arbeit regelmäßig über „Daten → Sicherung erstellen“. Nur so lassen sich Inhalte auf ein
            anderes Gerät übertragen.
          </p>
        </div>
      </section>

      <p className="faint text-sm">
        {APP_NAME} · Version {APP_VERSION}
      </p>
    </div>
  );
}
