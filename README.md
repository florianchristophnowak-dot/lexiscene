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
| 2 Klarheit | Die Bedeutung eindeutig sichern – erschlossen oder direkt geklärt. |
| 3 Muster | Klangbild, Schriftbild und Musteranker verfügbar machen. |
| 4 Abruf | Prüfen und üben, was ohne Hilfen abrufbar ist. |
| 5 Gebrauch | Die Einheit in eigenem Sprachhandeln verwenden. |
| 6 Wiederbegegnung | Später erneut aktivieren – im Bereich „Reaktivieren“. |

Die Phasen sind die Grundstruktur, kein Pflichtprogramm. Darunter liegen elf
Mikro-Schritte, die sich je Sequenz und je Einheit an- und abschalten und frei
umsortieren lassen. Schritte ohne hinterlegtes Material entfallen automatisch.

Einige Entscheidungen bleiben bewusst offen, weil sie vom Wort, vom Ziel und von
der Lerngruppe abhängen:

* **Bedeutung erschließen lassen** ist kein Pflichtschritt. Pro Sequenz wählen
  Sie zwischen „nicht vorgesehen“, „wo es sich anbietet“ und „als
  Strategietraining geplant“. Angeboten wird der Schritt nur, wenn ein Kontext
  vorliegt, der die Bedeutung hergibt – und die Klärung folgt immer.
* **Klangbild vor Schriftbild** und der Zeitpunkt des Schriftbilds sind
  Regieentscheidungen, keine allgemeinen Regeln.
* **Eine knappe Übersetzung** ist eine legitime Klärungshilfe und jederzeit
  einblendbar.

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
  nicht einzelnen Lernenden.
* **Lösung** hält im Abruf die Antwort zurück, bis die Denkzeit vorbei ist.
* **Notiz** hält eine spontane Beobachtung zur Einheit fest.
* **Überspringen** nimmt eine Einheit aus dem laufenden Durchgang.
* **Vorbereiten** verlässt den Unterricht; die Stelle bleibt erhalten und die
  Startseite bietet danach „Unterricht fortsetzen“ an.

Die Standarddramaturgie umfasst elf Schritte (Situation, Impuls, Hören,
Vermuten, Klären, Form zeigen, Aussprache und Muster, Verständniskontrolle,
Hilfen ausblenden, freier Abruf, Mini-Aufgabe). Sie lässt sich pro Sequenz und
pro Einheit abschalten **und frei umsortieren**; Schritte ohne hinterlegtes
Material entfallen automatisch.

### Zweitbildschirm

Die Schaltfläche **Zweitbildschirm** öffnet ein zweites Fenster, das nur die
Projektion zeigt – ohne Bedienelemente und ohne Hinweise für die Lehrkraft.
Dieses Fenster ziehen Sie auf den Beamer oder das zweite Display und schalten es
dort in den Vollbildmodus. Auf dem Gerät der Lehrkraft erscheint dann zusätzlich
ein Feld mit Modelläußerung, Bedeutung, Methode, Stolperstellen und Ihrer Notiz,
das die Klasse nicht sieht. Beide Fenster laufen lokal im selben Browserprofil
und tauschen nur die aktuelle Position aus; der Browser muss Pop-ups für die
Seite erlauben.

### Reaktivierung im Unterricht

Unter *Reaktivieren → Impulse im Unterricht zeigen* laufen die Impulse in
derselben ablenkungsfreien Vollbildansicht: Pfeiltasten blättern, die Leertaste
deckt zuerst die Lösung auf und geht dann weiter, je Impuls halten Sie „sicher“,
„mit Hilfe“ oder „noch nicht“ fest. Eine Runde zählt erst als durchgeführt, wenn
sie am Ende mit **Runde abschließen** beendet wird; Datum und Ergebnisse landen
im Verlauf. Auf Wunsch stehen Einheiten, die zuletzt unsicher waren, in der
nächsten Runde vorn – eine transparente didaktische Heuristik, kein
Lernalgorithmus. Für die Abstände gibt es kein einzig richtiges Intervall.

## Einheiten anlegen

* **Schnelleingabe:** Ausdruck und optional die Kernbedeutung eintippen, mit
  Eingabetaste oder „Hinzufügen“ übernehmen.
* **Für den Erstkontakt:** Ganz oben in der Detailspalte stehen die Angaben, die
  die erste Begegnung tragen: Ausdruck, Kernbedeutung, kommunikative Funktion,
  Modelläußerung, **Musteranker**, lexikalischer Typ und Lernziel (rezeptiv oder
  produktiv). Alles Weitere ist Vertiefung in aufklappbaren Bereichen – die App
  verlangt keine enzyklopädische Vollständigkeit.
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
│               Abrufvorlagen, Beobachtungen, Reaktivierung, Bereitschaft, Import, Demo
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
