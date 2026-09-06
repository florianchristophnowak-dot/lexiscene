# LexiScène

**Semantisierungsregie für die Wortschatzeinführung im Fremdsprachenunterricht.**

LexiScène ist kein Vokabeltrainer, sondern ein Werkzeug für die Lehrkraft: Es
verwaltet kommunikativ nutzbare lexiko-grammatische Einheiten – etwa
`Ça te dit de… ?`, `avoir besoin de qc` oder `Je préfère…` – und unterstützt die
Regie von der ersten Begegnung bis zum eigenen Sprachhandeln.

## Das Modell

**Kontext – Klarheit – Muster – Abruf – Gebrauch – Wiederbegegnung**

| Phase | Worum es geht |
| --- | --- |
| 1 Kontext | Situation und kommunikativen Bedarf aufbauen, bevor Sprache angeboten wird. |
| 2 Klarheit | Die Bedeutung eindeutig sichern – erschlossen oder direkt geklärt – und anschließend mit Bedeutungsfragen (CCQs) prüfen. |
| 3 Muster | Klangbild, Schriftbild, Musteranker – auf Wunsch mit einer Korpusminiatur. |
| 4 Abruf | Prüfen und üben, was ohne Hilfen abrufbar ist. |
| 5 Gebrauch | Die Einheit in eigenem Sprachhandeln verwenden. |
| 6 Wiederbegegnung | Später erneut aktivieren – im Bereich „Reaktivieren“. |

Die Phasen sind die Grundstruktur, kein Pflichtprogramm. Darunter liegen
dreizehn Mikro-Schritte, die sich je Sequenz und je Einheit an- und abschalten
und frei umsortieren lassen. Schritte ohne hinterlegtes Material entfallen
automatisch.

Jede Phase bringt ein Sichtbarkeitsprofil mit: Es bestimmt, was die Klasse beim
Betreten eines Schritts zuerst sieht — in „Kontext“ nichts, in „Klarheit“ die
Bedeutung, in „Muster“ zusätzlich das Schriftbild, in „Abruf“ wieder nichts. Die
Vorbereitung zeigt die Profile; im Unterricht ist alles umschaltbar.

Einige Entscheidungen bleiben bewusst offen, weil sie vom Wort, vom Ziel und von
der Lerngruppe abhängen:

* **Bedeutung erschließen lassen** ist kein Pflichtschritt. Pro Sequenz wählen
  Sie zwischen „nicht vorgesehen“, „wo es sich anbietet“ und „als
  Strategietraining geplant“. Angeboten wird der Schritt nur, wenn ein Kontext
  vorliegt, der die Bedeutung hergibt – und die Klärung folgt immer.
* **Klangbild vor Schriftbild** und der Zeitpunkt des Schriftbilds sind
  Regieentscheidungen, keine allgemeinen Regeln.
* **Eine knappe Übersetzung** ist eine legitime Klärungshilfe und jederzeit
  einblendbar. Wie leicht sie erreichbar ist, entscheidet der Sprachmodus des
  Unterrichts (siehe *Zielsprachlich unterrichten*).
* **Bedeutung prüfen und Abruf prüfen** sind zwei verschiedene Dinge. Die
  Bedeutungsfragen (CCQs) prüfen das Konzept, die Abrufkontrolle prüft Wieder­
  erkennen, Erinnern und Bilden der Form.

Die App läuft vollständig lokal: kein Backend, keine Cloud, kein Konto, keine
Analyse- oder Trackingdienste, keine KI-Funktionen und keine Abfragen im Netz.

---

## Installation

Voraussetzung: [Node.js](https://nodejs.org/) ab Version 20.

```bash
npm install
```

Als App installieren (nach dem ersten Start im Browser): In Edge oder Chrome
erscheint in der Adressleiste ein Installationssymbol. Danach startet LexiScène
in einem eigenen Fenster und funktioniert offline.

## Entwicklungsstart

```bash
npm run dev        # Entwicklungsserver auf http://localhost:5173
npm run lint       # ESLint
npm run test       # Vitest (Unit- und Komponententests)
npm run check      # Lint + Tests + Produktionsbuild in einem Lauf
```

## Produktions-Build

```bash
npm run build      # erzeugt Icons, prüft Typen und baut nach dist/
npm run preview    # liefert dist/ lokal aus (http://localhost:4173)
```

Der Ordner `dist/` enthält die vollständige App. Sie kann von jedem einfachen
Webserver ausgeliefert werden – auch aus einem Unterverzeichnis, da der Build
relative Pfade verwendet. Ein Server ist nötig, weil Service Worker und
IndexedDB unter `file://` nicht zur Verfügung stehen.

## Offline-Nutzung

Beim Produktionsbuild wird ein eigener Service Worker erzeugt (`dist/sw.js`),
der beim Installieren alle Programmdateien ablegt – ohne Workbox oder andere
Fremdbibliothek. Nach dem ersten Laden funktioniert LexiScène vollständig ohne
Internetverbindung. Es werden ausschließlich Anfragen an die eigene Herkunft
behandelt; externe Server werden nie kontaktiert, es sind keine Schriften oder
CDN-Dateien eingebunden.

Im Entwicklungsmodus (`npm run dev`) ist der Service Worker bewusst nicht aktiv.

## Speicherort und Datenschutzprinzip

* Alle Sequenzen, Medien und Einstellungen liegen in der lokalen
  Browserdatenbank (**IndexedDB**, Datenbank `lexiscene`) – gebunden an Gerät,
  Browser und Profil.
* Bilder, Audio- und Videodateien werden als Blob in derselben Datenbank
  gespeichert und stehen nach einem Neustart unverändert zur Verfügung.
* Es gibt keine Übertragung an Dritte, keine Konten, keine Telemetrie.
* Unter **Daten → Dauerhaften Speicher anfordern** kann der Browser gebeten
  werden, die Ablage nicht automatisch zu verwerfen.
* Werden Browserdaten gelöscht („Cookies und Websitedaten“), sind auch die
  Inhalte von LexiScène gelöscht. Deshalb regelmäßig sichern.

## Sicherung und Wiederherstellung

**Sicherung:** *Daten → Sicherung erstellen (ZIP)*. Die Datei enthält alle
Sequenzen als JSON-Manifest sowie sämtliche Mediendateien:

```
lexiscene-sicherung-JJJJ-MM-TT.zip
├── manifest.json
├── LIESMICH.txt
└── media/…
```

**Wiederherstellung:** *Daten → Sicherung einspielen …*. Der gesamte lokale
Bestand wird nach einer Sicherheitsabfrage ersetzt – vorher selbst sichern.

**Einzelne Sequenzen** lassen sich in der Vorbereitung über *Exportieren* als
JSON weitergeben und unter *Daten* wieder importieren. Das Format ist in
[`docs/schema.md`](docs/schema.md) dokumentiert und versioniert.

## Bedienung des Unterrichtsmodus

Der Unterrichtsmodus ist eine ablenkungsfreie Vollbildansicht. Sichtbar sind nur
Schrittnummer und -bezeichnung, ein dezenter Fortschrittsbalken, der aktuelle
Impuls sowie die Bedienleiste.

| Taste | Wirkung |
| --- | --- |
| `→` oder `Leertaste` | nächster Schritt |
| `←` | einen Schritt zurück |
| `Esc` | Vollbild verlassen; außerhalb des Vollbilds zurück in die Vorbereitung |

Alles ist auch als Schaltfläche vorhanden (Touch- und Stiftbedienung, Bedienziele
mindestens 44 × 44 Pixel):

* **Bedeutung / Schriftbild / Übersetzung / Hilfen** blenden Informationen
  einzeln ein und aus. Jeder Schritt startet mit der für ihn vorgesehenen
  Sichtbarkeit – zu Beginn sind weder Schriftbild noch Bedeutung zu sehen.
* **Audio abspielen** gibt eine hinterlegte Aufnahme wieder; das Schriftbild
  bleibt bis zum Schritt „Form zeigen“ verborgen.
* **Rückmeldung der Klasse** – „sicher“, „mit Hilfe“ oder „noch nicht“ – erfassen
  Sie in Abruf- und Gebrauchsschritten. Sie wird der Wissensdimension zugeordnet
  (Bedeutung, Form, Muster, Gebrauch) und als Ereignis gespeichert. Es entstehen
  keine Punkte, Noten oder Gesamtlernstände, und die Beobachtung gilt der Klasse,
  nicht einzelnen Lernenden. Ein Fehlgriff lässt sich sofort korrigieren: Ein
  zweiter Klick ersetzt die Rückmeldung dieses Schritts, statt eine weitere
  anzulegen. In der Vorbereitung zeigt jede Einheit ihren vollständigen Verlauf,
  aus dem sich einzelne Einträge entfernen lassen.
* **Gegenrichtung** blendet in der Abrufkontrolle die zweite Aufgabe ein –
  entweder die ausdrücklich gewählte oder den Vorschlag der App.
* **Vorherige / Nächste Frage, Antwort zeigen, Alternative Klärung zeigen,
  Zurück zur Klärung** führen durch die Bedeutungsfragen (siehe unten).
* **Erstsprache** blendet die Übersetzung ein. Die Schaltfläche erscheint nur,
  wenn der Sprachmodus des Unterrichts sie zulässt.
* **Fokus markieren / Gruppen zeigen / Regel zeigen / Transfer zeigen** decken
  im Schritt „Korpusminiatur“ eine Stufe nach der anderen auf.
* **Lösung** hält im Abruf die Antwort zurück, bis die Denkzeit vorbei ist.
* **Notiz** hält eine spontane Beobachtung zur Einheit fest.
* **Überspringen** nimmt eine Einheit aus dem laufenden Durchgang.
* **Vorbereiten** verlässt den Unterricht; die Stelle bleibt erhalten und die
  Startseite bietet danach „Unterricht fortsetzen“ an.

Die Standarddramaturgie umfasst dreizehn Schritte (Situation, Impuls, Hören,
Vermuten, Bedeutung klären, **Bedeutung prüfen (CCQs)**, Form zeigen, Aussprache
und Muster, Korpusminiatur, Abrufkontrolle, Hilfen ausblenden, freier Abruf,
Mini-Aufgabe). Sie lässt
sich pro Sequenz und pro Einheit abschalten **und frei umsortieren**; Schritte
ohne hinterlegtes Material entfallen automatisch. Die Korpusminiatur ist ein
Angebot und bleibt abgeschaltet, bis Sie sie einschalten.

### Zweitbildschirm

Die Schaltfläche **Zweitbildschirm** öffnet ein zweites Fenster, das nur die
Projektion zeigt – ohne Bedienelemente und ohne Hinweise für die Lehrkraft.
Dieses Fenster ziehen Sie auf den Beamer oder das zweite Display und schalten es
dort in den Vollbildmodus. Auf dem Gerät der Lehrkraft erscheint dann zusätzlich
ein Feld mit Modelläußerung, Bedeutung, Methode, Stolperstellen und Ihrer Notiz,
das die Klasse nicht sieht. Beide Fenster laufen lokal im selben Browserprofil
und tauschen nur die aktuelle Position aus; der Browser muss Pop-ups für die
Seite erlauben.

### Bedeutungsfragen (CCQs)

Eine **Concept Checking Question** prüft, ob das Konzept angekommen ist – nicht,
ob jemand die Form schon abrufen kann. Sie steht deshalb in der Phase
**Klarheit** unmittelbar hinter „Bedeutung klären“ und ist von der
**Abrufkontrolle** in der Phase „Abruf“ getrennt.

**Vorbereiten** (Detailspalte, Bereich *Bedeutungssicherung*):

* **Frage hinzufügen** legt eine leere Frage an. **Aus Vorlage** und
  **Fragestamm** setzen ein Gerüst beziehungsweise einen zielsprachlichen
  Fragestamm ein. Beides ist bearbeitbar; LexiScène formuliert nie selbst eine
  inhaltliche Frage über Ihre Einheit.
* Je Frage: erwartete Kurzantwort, Antwortformat (Ja/Nein, A oder B,
  Kurzantwort, Beispiel/Nichtbeispiel, Bildauswahl, Zeigen, Sortieren),
  geprüftes Bedeutungsmerkmal, Antwortoptionen, gezielt angesprochene
  Fehlvorstellung, alternative Klärung, Sprache und Ziel (Bedeutung oder
  Gebrauch).
* Fragen lassen sich duplizieren, entfernen und per Ziehen oder über die
  Pfeilschaltflächen umsortieren; **Vorschau** zeigt genau das, was die Klasse
  sehen wird.
* **Abrufaufgabe als CCQ übernehmen** holt eine früher im Abruffeld hinterlegte
  Bedeutungsfrage nachträglich herüber, wenn die Migration den Fall nicht
  eindeutig entscheiden konnte.
* Dezente Hinweise melden typische Schwächen – „Habt ihr das verstanden?“,
  fehlende erwartete Antwort, sehr lange Frage, durchweg gleiche Ja-Antwort,
  Prüfung der Form statt der Bedeutung. Sie blockieren nichts.

**Im Unterricht** zeigt die Projektion nur Frage beziehungsweise Impuls,
Antwortoptionen, hinterlegte Bilder und eine kurze zielsprachliche
Arbeitsanweisung. Erwartete Antwort, geprüftes Merkmal, mögliche Fehlvorstellung
und Lehrkraftnotiz bleiben auf dem Gerät der Lehrkraft. Mehrere Fragen laufen
nacheinander; **Zurück zur Klärung** springt zum Klärungsschritt, danach lässt
sich die Frage erneut stellen. Die Rückmeldung „sicher / mit Hilfe / noch nicht“
geht in die Dimension **Bedeutung**, bei Fragen zum Gebrauch in **Gebrauch** –
ohne Punkte, Noten oder Einzeldaten.

Der Schritt ist eingeschaltet, entfällt aber automatisch, solange keine
brauchbare Frage vorliegt.

### Korpusminiaturen

Eine **Korpusminiatur** ist eine kleine, selbst kuratierte Sammlung von etwa
fünf bis zehn Belegen, an denen sich ein wiederkehrendes Muster zeigen lässt –
eine Kollokation, eine Valenz, eine Präposition, ein Bedeutungsunterschied oder
ein Registermerkmal. Sie zeigt bewusst **wenige ausgewählte Belege statt einer
ungefilterten Trefferliste**. Alle Belege tragen Sie selbst ein oder fügen sie
zeilenweise ein: LexiScène ruft nichts ab und ist mit keinem Onlinekorpus
verbunden; auch ein Quellenhinweis wird nur als Text auf dem Gerät gespeichert.

**Vorbereiten** (Detailspalte, Bereich *Korpusminiatur – Muster entdecken
(optional)*):

* Funktion für die Einheit einschalten, Titel, Leitfrage und Schwerpunkt
  festlegen.
* Belege einzeln hinzufügen oder mehrere Zeilen auf einmal einfügen – eine
  Zeile wird ein Beleg, leere Zeilen entfallen, vorhandene Belege bleiben
  erhalten.
* Je Beleg eine zu markierende Textstelle und optional eine Lösungsgruppe
  („Sport/Spiel“, „Instrument“) angeben; Notizen sieht nur die Lehrkraft.
  Die Markierung wird Zeichen für Zeichen verglichen – Akzent, Apostroph und
  Groß-/Kleinschreibung zählen mit. Wird sie nicht gefunden, sagt die
  Vorbereitung das; der Beleg selbst wird nie verändert.
* Belege lassen sich duplizieren, entfernen und per Ziehen oder über die
  Pfeilschaltflächen umsortieren.
* Regel beziehungsweise Musteranker, Transferaufgabe, Herkunft und
  Quellenhinweis ergänzen; **Vorschau** zeigt die Bühne wie im Unterricht.

**Im Unterricht** wird die Miniatur gestuft aufgedeckt: zuerst Leitfrage und
unmarkierte Belege, dann über die Schaltflächen **Fokus markieren**, **Gruppen
zeigen**, **Regel zeigen** und **Transfer zeigen**. Angeboten wird nur, wofür
tatsächlich etwas hinterlegt ist. Lehrkraftnotizen und Quellenhinweis
erscheinen ausschließlich auf dem Gerät der Lehrkraft, nie in der Projektion.

Der Schritt gehört zur Phase **Muster** und steht standardmäßig hinter
„Aussprache und Muster“. Er ist ein Angebot: In neuen wie in bestehenden
Sequenzen bleibt er abgeschaltet und wird gezielt für die Einheit eingeschaltet,
für die eine Miniatur vorbereitet ist. Angeboten wird er ab drei Belegen.

Die Funktion ersetzt weder eine eindeutige Bedeutungsklärung noch den aktiven
Abruf und die spätere Verwendung. Ob ein Muster entdeckt oder erklärt wird,
bleibt eine Regieentscheidung; die beobachtete Regel wird anschließend
ausdrücklich bestätigt.

### Reaktivierung im Unterricht

Unter *Reaktivieren → Impulse im Unterricht zeigen* laufen die Impulse in
derselben ablenkungsfreien Vollbildansicht: Pfeiltasten blättern, die Leertaste
deckt zuerst die Lösung auf und geht dann weiter, je Impuls halten Sie „sicher“,
„mit Hilfe“ oder „noch nicht“ fest. Eine Runde zählt erst als durchgeführt, wenn
sie am Ende mit **Runde abschließen** beendet wird; Datum und Ergebnisse landen
im Verlauf. Auf Wunsch stehen Einheiten, die zuletzt unsicher waren, in der
nächsten Runde vorn – eine transparente didaktische Heuristik, kein
Lernalgorithmus. Für die Abstände gibt es kein einzig richtiges Intervall.

## Zielsprachlich unterrichten

Unter *Daten → Einstellungen* stehen zwei getrennte Entscheidungen:

* **Bediensprache** – *Deutsch*, *Français* oder *Der Sprache der aktuellen
  Sequenz folgen*. Angeboten werden nur Sprachen mit vollständiger Übersetzung;
  eine gemischtsprachige Oberfläche kann so nicht entstehen. Die Zielsprache der
  Sequenz bleibt davon unberührt.
* **Sprachmodus des Unterrichts** – bestimmt, wie viel Erstsprache die Klasse zu
  sehen bekommt:

| Modus | Wirkung |
| --- | --- |
| Zielsprachlich mit Reserve *(Standard)* | Projektion zielsprachlich; die erstsprachliche Hilfe liegt bereit und wird bewusst freigegeben. |
| Streng zielsprachlich | Erstsprachliche Inhalte erscheinen nie in der Projektion; Übersetzungen bleiben interne Lehrkraftinformation. |
| Flexibel mehrsprachig | Die Lehrkraft entscheidet Schritt für Schritt, was projiziert wird – auch die interne Bedeutung. |

Die Felder einer Einheit sind dafür sprachlich getrennt: **interne Bedeutung**
(nur Lehrkraft), **zielsprachliche Erklärung** für die Lernenden,
**Übersetzung** in die Erstsprache, **zielsprachlicher Unterrichtsimpuls**,
**zielsprachliche Bedeutungsfragen** und **Lehrkraftnotiz**. Was in der
Projektion landet, entscheidet nicht die einzelne Ansicht, sondern ein zentrales
Bühnenmodell (`src/domain/stage.ts`); Lehrkraftinformationen können dadurch
nicht versehentlich in die Klasse gelangen.

Die zielsprachlichen Arbeitsanweisungen für die Lernenden liegen für
Französisch, Englisch, Spanisch, Italienisch, Russisch und Latein vor und folgen
der Zielsprache der Sequenz, nicht der Bediensprache.

## Einheiten anlegen

* **Schnelleingabe:** Ausdruck und optional die Kernbedeutung eintippen, mit
  Eingabetaste oder „Hinzufügen“ übernehmen.
* **Für den Erstkontakt:** Ganz oben in der Detailspalte stehen die Angaben, die
  die erste Begegnung tragen: Ausdruck, Kernbedeutung, kommunikative Funktion,
  Modelläußerung, **Musteranker**, lexikalischer Typ und Lernziel (rezeptiv oder
  produktiv). Alles Weitere ist Vertiefung in aufklappbaren Bereichen – die App
  verlangt keine enzyklopädische Vollständigkeit.
* **Abrufaufgaben in beiden Richtungen:** Zur Hauptaufgabe lässt sich eine zweite
  in der Gegenrichtung wählen (Form → Bedeutung und Bedeutung oder Situation →
  Form). Bleibt sie leer, schlägt die App selbst eine vor.
* **Musteranker:** der Rahmen, in dem die Einheit steht, etwa
  `avoir peur de + nom/infinitif`, `jouer à + Sportart` oder
  `prendre une décision`. Bei produktiv geplanten Kerneinheiten weist die App auf
  einen fehlenden Anker hin, ohne das Unterrichten zu blockieren.
* **Serienimport:** Unter *Mehrere Einheiten aus einer Tabelle übernehmen* Text
  aus einer Tabellenkalkulation oder Liste einfügen – Tabulator, Semikolon und
  Komma werden erkannt. Überschriften und Spaltenzuordnung schlägt die App vor,
  beides lässt sich vor dem Übernehmen ändern. Eine Vorschau zeigt, was
  ankommt; Zeilen ohne Ausdruck werden übersprungen.
* **Eigene Audioaufnahme:** Im Feld „Audio“ nimmt *Selbst aufnehmen* die
  Modelläußerung direkt über das Mikrofon auf (Aufnahme läuft sichtbar mit,
  „Verwerfen“ bricht ab). Die Aufnahme landet unverändert in der lokalen
  Datenbank – sie verlässt das Gerät nicht.

## Aufbau des Projekts

```
src/
├── domain/     Modell, Schema und Migration, Phasen und Schritte, Berater,
│               Bedeutungsfragen (ccq.ts), Bühnenmodell (stage.ts),
│               Abrufvorlagen, Beobachtungen, Korpusminiaturen, Reaktivierung,
│               Bereitschaft, Import, Demo
├── i18n/       Sprachkataloge (de, fr, Teilkataloge), Lernendenimpulse,
│               Auflösung der Oberflächensprache, React-Anbindung
├── storage/    IndexedDB, Repository, ZIP-Codec, Sicherung
├── app/        Zustand, Router, Medien-URLs, Aufnahme, Projektionskopplung
├── ui/         Basiskomponenten (Schaltflächen, Felder, Dialoge, Hinweise)
├── views/      Startseite, Vorbereiten, Unterrichten, Projektion, Reaktivieren, Daten, Hilfe
└── styles/     Gestaltungsgrundlage (Tokens), Layout, Unterrichtsmodus
```

## Bekannte Grenzen des MVP

* Keine Schülerkonten, keine Cloud-Synchronisierung, keine Live-Quizfunktionen.
* Keine KI-Funktionen, keine Spracherkennung, keine Online-Bildersuche – Medien
  werden aus eigenen Dateien hinterlegt oder selbst aufgenommen.
* Keine maschinelle Übersetzung. Die Oberfläche liegt in Deutsch und Französisch
  vor; eigene Inhalte werden nie automatisch übersetzt oder überschrieben.
* Bedeutungsfragen entstehen nicht automatisch. Die Vorlagen liefern Gerüste und
  Fragestämme, die Formulierung bleibt bei der Lehrkraft.
* Korpusminiaturen sind selbst kuratierte Belegsammlungen. Es gibt keine
  Anbindung an Onlinekorpora, keine Suche, keine Häufigkeitsangaben und keine
  automatische Auswahl von Belegen; LexiScène wird dadurch keine
  Korpussoftware.
* Keine Leistungsstatistiken, Ranglisten oder Streaks. Beobachtungen setzt die
  Lehrkraft bewusst selbst; sie werden nicht verrechnet.
* Der Bereitschaftscheck prüft nur, was eingetragen wurde – er analysiert keine
  Inhalte und schlägt keine Formulierungen vor.
* Reaktivierungsrunden werden manuell als durchgeführt markiert; es gibt keine
  automatische Erinnerung außerhalb der App.
* Datenaustausch zwischen Geräten läuft ausschließlich über Sicherungsdateien.
* Der Zweitbildschirm setzt zwei Fenster desselben Browserprofils voraus; eine
  Übertragung auf ein anderes Gerät ist nicht vorgesehen.
* Eine direkte Prép-ybara-Integration ist nicht enthalten, solange dessen
  Datenformat nicht vorliegt – der Export ist darauf vorbereitet.
* Geprüft mit aktuellen Versionen von Edge und Chrome; andere Browser sind
  nicht ausgeschlossen, aber nicht Ziel dieser Fassung.

## Lizenz

MIT – siehe [LICENSE](LICENSE).
