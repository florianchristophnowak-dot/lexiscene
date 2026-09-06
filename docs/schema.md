# Datenschema von LexiScène

Version des Schemas: **3** (`schemaVersion: 3`)
Stand: Version 0.3.0 der Anwendung

Dateien der Schemaversionen 1 und 2 werden beim Einlesen vollständig migriert
(siehe Abschnitt 6). Ältere Sicherungen und Exporte bleiben nutzbar.

Alle Daten liegen ausschließlich lokal im Browser (IndexedDB). Dieses Dokument
beschreibt die Struktur, damit Exporte langfristig lesbar bleiben und später in
andere Werkzeuge übernommen werden können.

## 1. Sequenz

```jsonc
{
  "id": "seq_…",              // eindeutige Kennung
  "schemaVersion": 3,
  "title": "Freizeit verabreden",
  "targetLanguage": "fr",     // fr | en | es | it | ru | la (offen erweiterbar)
  "learningGroup": "Klasse 7 · Französisch, 2. Lernjahr",
  "learnerLevel": "mittelstufe",   // anfaenger | mittelstufe | fortgeschritten
  "topic": "Am Wochenende gemeinsam etwas unternehmen",
  "canDoGoal": "Die Lernenden können …",
  "teacherNote": "nur in der Vorbereitung sichtbar",
  "archived": false,
  "steps": {                  // Standarddramaturgie, je Schritt an/aus
    "situation": true, "impuls": true, "audio": true, "vermuten": true,
    "klaeren": true, "form": true, "fokus": true,
    "korpusminiatur": false,  // Angebot: standardmäßig aus (siehe 2c)
    "kontrolle": true,
    "hilfen-ausblenden": true, "abruf": true, "aufgabe": true
  },
  "inferenceMode": "optional", // off | optional | planned – Bedeutung erschließen lassen
  "stepOrder": [              // frei sortierbare Reihenfolge der Schritte
    "situation", "impuls", "audio", "vermuten", "klaeren", "form",
    "fokus", "korpusminiatur", "kontrolle", "hilfen-ausblenden", "abruf", "aufgabe"
  ],
  "lexemes": [ /* siehe 2. */ ],
  "reactivation": {
    "enabled": false,
    "offsetsDays": [1, 3, 7, 14], // frei konfigurierbare relative Abstände
    "anchor": 1788550000000,      // Startpunkt der Rechnung (ms seit 1970) oder null
    "completedRounds": 0,
    "prioritiseUnsure": true,     // unsichere Einheiten zuerst (Heuristik)
    "history": [                  // abgeschlossene Runden, ohne Verrechnung
      { "round": 1, "completedAt": 1788640000000, "secure": 4, "supported": 2, "notYet": 1 }
    ]
  },
  "session": {                 // Stelle, an der der Unterricht unterbrochen wurde
    "lexemeIndex": 2, "stepIndex": 5, "updatedAt": 1788550000000
  },
  "createdAt": 1788550000000,
  "updatedAt": 1788550000000
}
```

## 2. Lexikalische Einheit

Verwaltet werden kommunikativ nutzbare lexiko-grammatische Einheiten, nicht nur
Einzelwörter (`Ça te dit de… ?`, `avoir besoin de qc`).

| Feld | Bedeutung |
| --- | --- |
| `id` | eindeutige Kennung (`lex_…`) |
| `expression` | Ausdruck oder Chunk |
| `coreMeaning` | Kernbedeutung in Alltagssprache |
| `communicativeFunction` | kommunikative Funktion, z. B. „einen Vorschlag machen“ |
| `modelUtterance` | Modelläußerung im Kontext |
| `lexicalType` | `gegenstand`, `handlung`, `eigenschaft`, `gefuehl`, `abstrakt`, `sprechakt`, `kollokation`, `polysem`, `falscher-freund`, `sonstige` |
| `learningGoal` | `receptive` oder `productive` |
| `sentenceFrame` | Musteranker (Feldname aus Kompatibilitätsgründen unverändert) |
| `imageability` | `hoch`, `mittel`, `gering` – Eingabe für den Methodenberater |
| `inferenceSuitability` | `ungeeignet`, `bedingt`, `geeignet` |
| `transferRisk` | `gering`, `mittel`, `hoch` |
| `confusionGroup` | frei gewählte Bezeichnung einer Verwechslungsgruppe |
| `semantisationMethod` | Freitext; der Berater schlägt typgerechte Methoden vor |
| `repertoire` | `kern`, `stuetze`, `erweiterung` |
| `imageId`, `audioId`, `videoId` | Verweise auf lokale Mediendateien |

**Aussprache und Form:** `pronunciationHint`, `prosodyNote`, `ipa`, `morphology`

**Sprachliches Muster:** `valency`, `collocations`, `wordFamily`, `register`, `culturalNote`

**Bedeutungssicherung:** `example`, `nonExample`, `contrastExample`, `confusionRisk`, `checkTemplateId`, `checkTemplateIdSecondary`, `checkPrompt`

`checkTemplateIdSecondary` hält die Aufgabe in der Gegenrichtung fest. Bleibt das
Feld leer, schlägt die App selbst eine passende Vorlage vor; gespeichert wird nur
eine ausdrückliche Wahl. Das Feld ist additiv – Dateien ohne dieses Feld bleiben
gültig, die Schemaversion ändert sich dadurch nicht.

**Differenzierung:** `extraHint`, `simplifiedExplanation`, `translation`, `multilingualComparison`, `extensionTask`

**Korpusminiatur:** `corpus` (siehe 2c)

**Unterricht:** `situation`, `communicativeTask`, `stepOverrides` (überschreibt `steps` der Sequenz je Schritt), `stepOrderOverride` (eigene Schrittreihenfolge; `null` = Reihenfolge der Sequenz), `skipped`, `observations`, `liveNote`

## 2a. Beobachtungen (`observations`)

An die Stelle des früheren linearen Klassenstatus treten Ereignisse. Sie
beziehen sich auf die Lerngruppe, nicht auf einzelne Lernende, und werden nicht
zu Punktwerten verrechnet.

```jsonc
{
  "id": "obs_…",
  "at": 1788640000000,
  "dimension": "pattern",      // meaning | form | pattern | use | null
  "result": "supported",       // secure | supported | not-yet | null
  "source": "reactivation",    // introduction | reactivation
  "impulseKind": "chunk-ergaenzen", // optional
  "round": 2                        // optional
}
```

`dimension` und `result` sind `null`, wenn nur ein Ereignis festgehalten wird,
aus dem sich keine Kompetenz ableiten lässt – etwa eine frühere Reaktivierung.

## 2b. Phasen

Die zwölf Schritte sind sechs Phasen zugeordnet:

| Phase | Schritte |
| --- | --- |
| 1 Kontext | `situation`, `impuls` |
| 2 Klarheit | `vermuten`, `klaeren` |
| 3 Muster | `audio`, `form`, `fokus`, `korpusminiatur` |
| 4 Abruf | `kontrolle`, `hilfen-ausblenden`, `abruf` |
| 5 Gebrauch | `aufgabe` |
| 6 Wiederbegegnung | Reaktivierungsbereich (keine Schritte im Unterrichtsmodus) |

Die Zuordnung steht im Code (`src/domain/steps.ts`) und wird nicht in der Datei
gespeichert; gespeichert werden nur Auswahl und Reihenfolge der Schritte.

Ebenfalls im Code liegt das Sichtbarkeitsprofil je Phase (`PHASE_VISIBILITY`):
Es legt fest, was die Klasse beim Betreten eines Schritts zuerst sieht. Einzelne
Schritte weichen begründet ab – „Bedeutung erschließen“ zeigt die Bedeutung
nicht, „Hören“ hält das Schriftbild zurück, „Aussprache und Muster“ stellt
Musteranker und Lautung nach vorn. Im Unterricht ist alles umschaltbar.

## 2c. Korpusminiatur (`corpus`)

Eine kleine, von der Lehrkraft kuratierte Belegsammlung. Sie ist **immer
optional**; alle Felder außer `enabled` und den Kennungen dürfen leer sein. Es
gibt keine Verbindung zu Onlinekorpora – auch `sourceNote` ist reiner Text und
wird niemals abgerufen.

```jsonc
{
  "enabled": true,
  "title": "jouer à oder jouer de?",
  "guidingQuestion": "Was steht nach jouer …?",  // Beobachtungsauftrag
  "focus": "pattern",        // pattern | collocation | meaning | register
  "examples": [
    {
      "id": "beleg_…",
      "text": "Nous jouons au tennis le samedi.", // vollständiger Beleg
      "highlight": "au tennis",                   // exakt zu markierende Stelle
      "category": "Sport/Spiel",                  // optionale Lösungsgruppe
      "teacherNote": "Erster klarer Fall."        // nur für die Lehrkraft
    }
  ],
  "discoveryPrompt": "Sortiert die Belege in zwei Gruppen.",
  "ruleOrFinding": "jouer à + Sport/Spiel · jouer de + Instrument",
  "transferPrompt": "Bildet je einen eigenen Satz mit beiden Mustern.",
  "provenance": "teacher-created",  // corpus | teacher-created | mixed
  "sourceNote": "Selbst formulierte Beispielsätze."
}
```

* `highlight` wird als **exakte Zeichenfolge** im Beleg gesucht; alle Vorkommen
  werden markiert. Akzente, Apostrophe und Groß-/Kleinschreibung zählen mit.
  Kommt die Zeichenfolge nicht vor, meldet das die Vorbereitung – der Beleg
  selbst wird nie verändert.
* `teacherNote` und `sourceNote` erscheinen ausschließlich in der
  Lehrkraftansicht, niemals im Projektionsfenster.
* Der Unterrichtsschritt `korpusminiatur` wird nur angeboten, wenn `enabled`
  gesetzt ist und mindestens **drei** Belege einen nicht leeren `text` haben.

## 3. Sicherungsdatei (ZIP)

```
lexiscene-sicherung-JJJJ-MM-TT.zip
├── manifest.json          Format, Version, Sequenzen, Medienverzeichnis
├── LIESMICH.txt           Kurzhinweis für Menschen
└── media/<id>.<endung>    Bild-, Audio- und Videodateien
```

`manifest.json`:

```jsonc
{
  "format": "lexiscene-backup",
  "version": 1,
  "schemaVersion": 3,
  "app": { "name": "LexiScène", "version": "0.3.0" },
  "createdAt": "2026-09-04T20:57:08.614Z",
  "sequences": [ /* vollständige Sequenzen */ ],
  "media": [
    { "id": "media_…", "name": "bild.png", "mimeType": "image/png",
      "kind": "image", "size": 2730, "createdAt": 1788555427446,
      "file": "media/media_….png" }
  ]
}
```

Beim Einlesen gilt: Unbekannte Felder werden ignoriert, fehlende Felder mit
Standardwerten gefüllt, ein höherer `schemaVersion`-Wert wird mit einer
verständlichen Meldung abgelehnt. Reihenfolgeangaben (`stepOrder`,
`stepOrderOverride`) werden bereinigt: Unbekanntes und Doppeltes fällt weg,
fehlende Schritte werden in der Standardreihenfolge ergänzt.

## 4. Einzelexport einer Sequenz

Der Export einer einzelnen Sequenz (Schaltfläche „Exportieren“) erzeugt ein
Austauschdokument, das die Sequenz zusätzlich als **Unterrichtsphase**
beschreibt:

```jsonc
{
  "format": "lexiscene.sequence",
  "version": 1,
  "schemaVersion": 3,
  "app": { "name": "LexiScène", "version": "0.3.0" },
  "exportedAt": "2026-09-04T20:58:35.519Z",
  "phase": {
    "title": "Freizeit verabreden",
    "canDo": "Die Lernenden können …",
    "targetLanguage": "fr",
    "learningGroup": "Klasse 7 · Französisch, 2. Lernjahr",
  "learnerLevel": "mittelstufe",   // anfaenger | mittelstufe | fortgeschritten
    "lexemeCount": 7,
    "steps": [{ "position": 1, "id": "situation", "label": "Situation", "purpose": "…" }]
  },
  "sequence": { /* vollständige Sequenz nach Abschnitt 1 */ }
}
```

### Hinweis zu Prép-ybara

Der `phase`-Block ist bewusst rein beschreibend gehalten und bildet genau die
Angaben ab, die eine Unterrichtsplanung für eine Phase benötigt (Titel, Ziel,
Lerngruppe, Umfang, Ablauf). Solange kein tatsächliches Prép-ybara-Datenformat
vorliegt, wird **keine** Schnittstelle erfunden: Die Übernahme erfolgt über diese
dokumentierte JSON-Datei. Sobald das Zielformat bekannt ist, genügt eine
Abbildung von `phase` auf dessen Phasenobjekt.

## 6. Migration älterer Dateien

`normalizeSequence` überführt ältere Dateien vollständig.

### Schema 1 → 3

| Schema 1 | Schema 3 |
| --- | --- |
| `steps.vermuten: true` | `inferenceMode: "optional"` (Schritt bleibt möglich) |
| `steps.vermuten: false` | `inferenceMode: "off"` |
| `status: "bedeutung-erkannt"` | Beobachtung Bedeutung / mit Hilfe |
| `status: "bedeutung-erinnert"` | Beobachtung Bedeutung / sicher |
| `status: "form-abgerufen"` | Beobachtung Form / sicher |
| `status: "im-muster-verwendet"` | Beobachtung Muster / sicher |
| `status: "kommunikativ-eingesetzt"` | Beobachtung Gebrauch / sicher |
| `status: "begegnet"` | Ereignis ohne Kompetenzaussage |
| `status: "reaktiviert"` | Reaktivierungsereignis ohne Kompetenzaussage |
| kein `learningGoal` | aus `repertoire` abgeleitet (Kern → produktiv) |
| kein Profil | Startwerte aus dem lexikalischen Typ |
| `reactivation` ohne Verlauf | `history: []`, `prioritiseUnsure: true` |

### Schema 2 → 3

| Schema 2 | Schema 3 |
| --- | --- |
| kein `corpus` | leere, **deaktivierte** Korpusminiatur |
| kein `steps.korpusminiatur` | `false` – kein zusätzlicher Unterrichtsschritt |
| `stepOrder` ohne `korpusminiatur` | Schritt wird hinter `fokus` eingefügt |

Bestehende Sequenzen erhalten den neuen Schritt also **nicht ungefragt**: Er ist
abgeschaltet, bis die Lehrkraft ihn für eine Sequenz oder – üblicher – für eine
einzelne Einheit einschaltet (`stepOverrides.korpusminiatur`).

Freitexte, Medienverweise, Schrittauswahl, Schrittreihenfolge, Beobachtungen,
Sitzungsstand und Reaktivierungsplan bleiben unverändert erhalten. Sequenzen
ohne gespeicherte Reihenfolge erhalten die an den Phasen ausgerichtete
Standardreihenfolge; fehlende Schritte werden an ihrer Standardposition
ergänzt, nicht am Ende angehängt.

## 7. Änderungen am Schema

Bei künftigen Änderungen wird `schemaVersion` erhöht und in
`src/domain/schema.ts` eine Migration ergänzt. Ältere Dateien bleiben lesbar;
neuere Dateien werden von älteren Programmversionen abgelehnt statt still
falsch interpretiert.
