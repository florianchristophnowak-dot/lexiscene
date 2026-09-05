# LexiScène

**Semantisierungsregie für die Wortschatzeinführung im Fremdsprachenunterricht.**

LexiScène ist kein Vokabeltrainer, sondern ein Werkzeug für die Lehrkraft: Es
verwaltet kommunikativ nutzbare lexiko-grammatische Einheiten – etwa
`Ça te dit de… ?`, `avoir besoin de qc` oder `Je préfère…` – und führt im
Unterricht schrittweise vom kommunikativen Bedarf über die Bedeutungserschließung
und Formklärung zum ersten eigenen Sprachhandeln.

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
* **Status setzen** vermerkt den Klassenstatus der Einheit (von „begegnet“ bis
  „kommunikativ eingesetzt“) – ohne Noten und ohne Punkte.
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
deckt zuerst die Lösung auf und geht dann weiter, „Als reaktiviert vermerken“
setzt den Klassenstatus.

## Einheiten anlegen

* **Schnelleingabe:** Ausdruck und optional die Kernbedeutung eintippen, mit
  Eingabetaste oder „Hinzufügen“ übernehmen.
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
├── domain/     Modell, Schema, Dramaturgie, Berater, Kontrollen, Reaktivierung, Import, Demo
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
* Keine Leistungsstatistiken, Ranglisten oder Streaks. Der Klassenstatus wird
  bewusst von der Lehrkraft gesetzt.
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
