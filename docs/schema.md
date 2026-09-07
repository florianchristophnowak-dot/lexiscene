# Datenschema von LexiScène

Version des Schemas: **5** (`schemaVersion: 5`)
Stand: Version 0.5.0 der Anwendung

Dateien der Schemaversionen 1 bis 4 werden beim Einlesen vollständig migriert
(siehe Abschnitt 6). Ältere Sicherungen und Exporte bleiben nutzbar.

Alle Daten liegen ausschließlich lokal im Browser (IndexedDB). Dieses Dokument
beschreibt die Struktur, damit Exporte langfristig lesbar bleiben und später in
andere Werkzeuge übernommen werden können.

## 1. Sequenz

```jsonc
{
  "id": "seq_…",              // eindeutige Kennung
  "schemaVersion": 5,
  "title": "Freizeit verabreden",
  "targetLanguage": "fr",     // fr | en | es | it | ru | la (offen erweiterbar)
  "learningGroup": "Klasse 7 · Französisch, 2. Lernjahr",
  "learnerLevel": "mittelstufe",   // anfaenger | mittelstufe | fortgeschritten
  "topic": "Am Wochenende gemeinsam etwas unternehmen",
  "canDoGoal": "Die Lernenden können …",
  "taskType": "rollenspiel",   // gespraech | rollenspiel | diskussion | hoertext | lesetext | lied | sonstige
  "targetTask": "Zu zweit einen Samstagnachmittag verabreden.",
  "teacherNote": "nur in der Vorbereitung sichtbar",
  "archived": false,
  "steps": {                  // Standarddramaturgie, je Schritt an/aus
    "situation": true, "impuls": true, "audio": true, "vermuten": true,
    "klaeren": true,
    "ccq": true,              // Bedeutung prüfen; entfällt ohne brauchbare Frage
    "wort-elizitieren": true, // Wort herauslocken; entfällt ohne Ausdruck
    "form": true, "fokus": true,
    "chunk": true,            // Kollokation ergänzen; entfällt ohne Wendung
    "korpusminiatur": false,  // Angebot: standardmäßig aus (siehe 2c)
    "kontrolle": true,        // Abrufkontrolle (früher „Verständniskontrolle“)
    "hilfen-ausblenden": true, "abruf": true,
    "wiederholung": true,     // kumulativ; erst ab der zweiten Einheit
    "aufgabe": true
  },
  "inferenceMode": "optional", // off | optional | planned – Bedeutung erschließen lassen
  "stepOrder": [              // frei sortierbare Reihenfolge der Schritte
    "situation", "impuls", "vermuten", "klaeren", "ccq", "wort-elizitieren",
    "audio", "form", "fokus", "chunk", "korpusminiatur", "kontrolle",
    "hilfen-ausblenden", "abruf", "wiederholung", "aufgabe"
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
| `selectionReason` | Warum diese Einheit? Bezug zur Zielaufgabe – nur für die Lehrkraft |
| `connotation` | `unbestimmt`, `neutral`, `positiv`, `negativ`, `formell`, `umgangssprachlich`, `emotional` |
| `wordClass` | `unbestimmt`, `nomen`, `verb`, `adjektiv`, `adverb`, `wendung`, `sonstige` |
| `elicitingTechniques` | gewählte Techniken (siehe 2e), Kennungen in Katalogreihenfolge |
| `elicitingContext` | vorbereiteter Kontext oder Impuls – nur für die Lehrkraft |
| `wordCue` | Anlaut oder erste Buchstaben; leer = die App kürzt den Ausdruck |
| `keyCollocation` | zentrale Wendung, die bei der Einführung ergänzt wird |
| `classContributions` | im Unterricht aufgenommene Beiträge der Lerngruppe |
| `imageId`, `audioId`, `videoId` | Verweise auf lokale Mediendateien |

**Aussprache und Form:** `pronunciationHint`, `prosodyNote`, `ipa`, `morphology`

**Sprachliches Muster:** `valency`, `collocations`, `wordFamily`, `register`, `culturalNote`

**Bedeutungssicherung:** `example`, `nonExample`, `contrastExample`, `confusionRisk`, `ccqs` (siehe 2d), `checkTemplateId`, `checkTemplateIdSecondary`, `checkPrompt`

`checkTemplateId`, `checkTemplateIdSecondary` und `checkPrompt` gehören seit
Schema 4 ausschließlich zur **Abrufkontrolle**; Vorlagen, die das Konzept prüfen,
stehen in `ccqs`.

`checkTemplateIdSecondary` hält die Aufgabe in der Gegenrichtung fest. Bleibt das
Feld leer, schlägt die App selbst eine passende Vorlage vor; gespeichert wird nur
eine ausdrückliche Wahl. Das Feld ist additiv – Dateien ohne dieses Feld bleiben
gültig, die Schemaversion ändert sich dadurch nicht.

**Differenzierung:** `extraHint`, `simplifiedExplanation`, `translation`, `multilingualComparison`, `extensionTask`

**Sprachlich getrennte Inhalte:**

| Feld | Sprache | Sichtbar für |
| --- | --- | --- |
| `coreMeaning` | Bediensprache | nur Lehrkraft (interne Bedeutung) |
| `targetExplanation` | Zielsprache | Klasse |
| `translation` | Erstsprache | Klasse, sofern der Sprachmodus es zulässt |
| `targetPrompt` | Zielsprache | Klasse (Unterrichtsimpuls) |
| `ccqs[].question` | Zielsprache | Klasse |
| `keyCollocation` | Zielsprache | Klasse |
| `wordCue` | Zielsprache | Klasse (im Schritt „Wort herauslocken“) |
| `classContributions` | Zielsprache | Klasse |
| `elicitingContext` | Bediensprache | nur Lehrkraft |
| `selectionReason` | Bediensprache | nur Lehrkraft |
| `teacherNote` | Bediensprache | nur Lehrkraft |

Alle sechs Felder sind Freitext und werden **nie automatisch übersetzt oder
überschrieben**. Die Entscheidung, was projiziert wird, trifft nicht die
einzelne Ansicht, sondern `src/domain/stage.ts`.

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

Die sechzehn Schritte sind sechs Phasen zugeordnet:

| Phase | Schritte |
| --- | --- |
| 1 Kontext | `situation`, `impuls` |
| 2 Klarheit | `vermuten`, `klaeren`, `ccq` |
| 3 Muster | `wort-elizitieren`, `audio`, `form`, `fokus`, `chunk`, `korpusminiatur` |
| 4 Abruf | `kontrolle`, `hilfen-ausblenden`, `abruf`, `wiederholung` |
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

## 2d. Bedeutungsfragen (`ccqs`)

Concept Checking Questions prüfen das Konzept, nicht die Form. Sie liegen als
sortierte Liste an der Einheit; die Reihenfolge im Array ist die Reihenfolge im
Unterricht.

```jsonc
"ccqs": [
  {
    "id": "ccq_…",
    "templateId": "beispiel-nichtbeispiel", // leer erlaubt (eigene Frage)
    "question": "Est-ce que je propose ou est-ce que je refuse ?",
    "expectedAnswer": "Tu proposes.",   // nur auf dem Lehrkraftbildschirm
    "options": ["proposer", "refuser"], // darf der Klasse gezeigt werden
    "feature": "funktion",              // geprüftes Bedeutungsmerkmal
    "format": "a-b",                    // Antwortformat
    "misconception": "wird als Frage nach Erlaubnis gelesen",
    "alternativeClarification": "Mini-Dialog mit zwei Reaktionen",
    "language": "fr",                   // Sprachcode der Frage
    "target": "meaning"                 // meaning | use
  }
]
```

| Feld | Werte |
| --- | --- |
| `feature` | `kernbedeutung`, `begriffsgrenze`, `beispiel`, `person`, `zeit`, `absicht`, `wertung`, `modalitaet`, `register`, `funktion`, `sonstiges` |
| `format` | `ja-nein`, `a-b`, `kurzantwort`, `beispiel-nichtbeispiel`, `auswahl-bild`, `zeigen`, `sortieren` |
| `target` | `meaning` (Rückmeldung zur Dimension Bedeutung) oder `use` (Gebrauch) |

Ist `question` leer, zeigt der Unterricht den zielsprachlichen Fragerahmen der
Vorlage. Der Schritt `ccq` wird nur angeboten, wenn mindestens eine Frage einen
Text oder eine Vorlage mit Fragerahmen trägt. Fragen entstehen nie automatisch:
Vorlagen und Fragestämme liefern Gerüste, formuliert wird von Hand.

## 2e. Techniken zum Herauslocken (`elicitingTechniques`)

Zehn Kennungen, gespeichert in der Reihenfolge des Katalogs; unbekannte und
doppelte Einträge fallen beim Einlesen weg.

| Kennung | Besonders geeignet für |
| --- | --- |
| `mimik` | Handlungen und sichtbare Eigenschaften |
| `bild` | konkrete Gegenstände, Handlungen und Situationen |
| `zeichnung` | schnell darstellbare Konzepte |
| `realie` | Gegenstände, die sich mitbringen lassen |
| `pantomime` | Gegenstände, die nicht verfügbar sind |
| `synonym` | wenn ein verwandtes Wort schon bekannt ist |
| `antonym` | eindeutig kontrastierbare Begriffe |
| `beispiele` | Oberbegriffe und Kategorien |
| `kontext` | abstrakte oder nuancierte Bedeutungen |
| `definition` | was sich nicht sinnvoll zeigen lässt |

Die Empfehlung (`recommendElicitingTechniques`) ergibt sich aus dem Profil der
Einheit – lexikalischer Typ, Bildhaftigkeit, Lernniveau – und wird nur angezeigt.
Gespeichert wird ausschließlich, was die Lehrkraft auswählt.

Die Stufen der Aussprachearbeit (`model`, `chorus`, `groups`, `individual`,
`listen`) und die Stufen beim Herauslocken (`hidden`, `cue`, `full`) sind reine
Regiezustände. Sie gehören zum laufenden Unterricht, werden an das
Projektionsfenster gesendet und **nicht** gespeichert.

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
  "schemaVersion": 5,
  "app": { "name": "LexiScène", "version": "0.5.0" },
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
  "schemaVersion": 5,
  "app": { "name": "LexiScène", "version": "0.5.0" },
  "exportedAt": "2026-09-04T20:58:35.519Z",
  "locale": "de",              // Sprache, in der Bezeichnung und Zweck der Schritte beschrieben sind
  "phase": {
    "title": "Freizeit verabreden",
    "canDo": "Die Lernenden können …",
    "taskType": "rollenspiel",
    "task": "Zu zweit einen Samstagnachmittag verabreden.",
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

### Schema 1 → 5

| Schema 1 | Schema 5 |
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

### Schema 2 → 5

| Schema 2 | Schema 5 |
| --- | --- |
| kein `corpus` | leere, **deaktivierte** Korpusminiatur |
| kein `steps.korpusminiatur` | `false` – kein zusätzlicher Unterrichtsschritt |
| `stepOrder` ohne `korpusminiatur` | Schritt wird hinter `fokus` eingefügt |

Bestehende Sequenzen erhalten den neuen Schritt also **nicht ungefragt**: Er ist
abgeschaltet, bis die Lehrkraft ihn für eine Sequenz oder – üblicher – für eine
einzelne Einheit einschaltet (`stepOverrides.korpusminiatur`).

### Schema 3 → 4

Fünf frühere Kontrollvorlagen prüfen das Konzept und nicht die Form. Sie ziehen
in den CCQ-Bereich um, damit die Abrufkontrolle wirklich nur noch den Abruf
prüft.

| Schema 3 | Schema 4 |
| --- | --- |
| `checkTemplateId` ∈ {`welches-bild`, `welche-situation`, `beispiel-nichtbeispiel`, `welche-bedeutung`, `sprechhandlung`} | wird zu einem Eintrag in `ccqs`; `checkTemplateId` wird geleert |
| `checkPrompt` zu einer dieser Vorlagen | wandert als `question` mit; `checkPrompt` wird geleert |
| `checkTemplateIdSecondary` mit einer dieser Vorlagen | wird zu einem weiteren Eintrag in `ccqs` |
| andere `checkTemplateId` | bleibt unverändert Abrufkontrolle |
| kein `ccqs` | leere Liste |
| kein `targetExplanation`, `targetPrompt`, `teacherNote` | leere Felder |
| kein `steps.ccq` | `true` – der Schritt entfällt automatisch, solange keine Frage vorliegt |
| `stepOrder` ohne `ccq` | Schritt wird unmittelbar hinter `klaeren` eingefügt |

Die Sprache übernommener Fragen ist die `targetLanguage` der Sequenz. Die
Migration ist idempotent: Ein zweiter Durchlauf ändert nichts mehr, weil die
Abruffelder danach leer sind.

Uneindeutige Fälle – etwa eine eigene Frageformulierung zu einer Abrufvorlage –
werden **nicht** angetastet. Die Vorbereitung bietet dafür
*Abrufaufgabe als CCQ übernehmen* an; die Entscheidung bleibt bei der Lehrkraft.

Freitexte, Medienverweise, Schrittauswahl, Schrittreihenfolge, Beobachtungen,
Sitzungsstand und Reaktivierungsplan bleiben unverändert erhalten. Sequenzen
ohne gespeicherte Reihenfolge erhalten die an den Phasen ausgerichtete
Standardreihenfolge; fehlende Schritte werden an ihrer Standardposition
ergänzt, nicht am Ende angehängt.

### Schema 4 → 5

Die Planung beginnt jetzt bei der Aufgabe, und die Routine bekommt drei
Schritte. Nichts davon greift in vorhandene Inhalte ein.

| Schema 4 | Schema 5 |
| --- | --- |
| kein `taskType` / `targetTask` | `sonstige` und leerer Text – die Aufgabe wird nicht erfunden |
| kein `selectionReason`, `elicitingContext`, `wordCue`, `keyCollocation` | leere Felder |
| kein `elicitingTechniques` | leere Liste – es wird nichts vorbelegt |
| kein `connotation` / `wordClass` | `unbestimmt` |
| kein `classContributions` | leere Liste |
| kein `steps.wort-elizitieren`, `steps.chunk`, `steps.wiederholung` | `true`; die Schritte entfallen automatisch, solange kein Material vorliegt |
| `stepOrder` ohne die drei Schritte | eingefügt an ihrer Standardposition: hinter `ccq`, hinter `fokus`, hinter `abruf` |

Eigene Reihenfolgen bleiben erhalten: Ergänzt wird jeweils hinter dem nächsten
vorhandenen Vorgänger der Standardreihenfolge. Der Einzelexport beschreibt die
Aufgabe zusätzlich im `phase`-Block (`taskType`, `task`).

## 6a. Örtliche Einstellungen

Die Einstellungen der Lehrkraft gehören nicht zum Austauschformat: Sie liegen im
Objektspeicher `settings` derselben lokalen Datenbank und werden weder gesichert
noch exportiert, damit ein eingespieltes Backup die Bedienung des Geräts nicht
umstellt. Für Sprache und Unterricht sind zwei Felder maßgeblich:

| Feld | Werte | Bedeutung |
| --- | --- | --- |
| `uiLanguage` | `de`, `fr`, `sequence` | Bediensprache der Lehrkraftoberfläche; `sequence` folgt der `targetLanguage` der geöffneten Sequenz, sofern deren Katalog vollständig ist |
| `teachingLanguageMode` | `reserve` (Standard), `strict`, `flexible` | wie viel Erstsprache die Projektion zeigen darf |

Angeboten werden nur Sprachen mit vollständigem Katalog (`UI_LOCALES` in
`src/i18n/index.ts`); ein Test prüft die Vollständigkeit, und der Typ des
französischen Katalogs macht eine Lücke bereits beim Übersetzen zum Fehler.

## 7. Änderungen am Schema

Bei künftigen Änderungen wird `schemaVersion` erhöht und in
`src/domain/schema.ts` eine Migration ergänzt. Ältere Dateien bleiben lesbar;
neuere Dateien werden von älteren Programmversionen abgelehnt statt still
falsch interpretiert.
