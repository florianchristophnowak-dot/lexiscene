# Datenschema von LexiScène

Version des Schemas: **1** (`schemaVersion: 1`)
Stand: Version 0.1.0 der Anwendung

Alle Daten liegen ausschließlich lokal im Browser (IndexedDB). Dieses Dokument
beschreibt die Struktur, damit Exporte langfristig lesbar bleiben und später in
andere Werkzeuge übernommen werden können.

## 1. Sequenz

```jsonc
{
  "id": "seq_…",              // eindeutige Kennung
  "schemaVersion": 1,
  "title": "Freizeit verabreden",
  "targetLanguage": "fr",     // fr | en | es | it | ru | la (offen erweiterbar)
  "learningGroup": "Klasse 7 · Französisch, 2. Lernjahr",
  "topic": "Am Wochenende gemeinsam etwas unternehmen",
  "canDoGoal": "Die Lernenden können …",
  "teacherNote": "nur in der Vorbereitung sichtbar",
  "archived": false,
  "steps": {                  // Standarddramaturgie, je Schritt an/aus
    "situation": true, "impuls": true, "audio": true, "vermuten": true,
    "klaeren": true, "form": true, "fokus": true, "kontrolle": true,
    "hilfen-ausblenden": true, "abruf": true, "aufgabe": true
  },
  "lexemes": [ /* siehe 2. */ ],
  "reactivation": {
    "enabled": false,
    "offsetsDays": [1, 3, 7, 14], // frei konfigurierbare relative Abstände
    "anchor": 1788550000000,      // Startpunkt der Rechnung (ms seit 1970) oder null
    "completedRounds": 0
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
| `semantisationMethod` | Freitext; der Berater schlägt typgerechte Methoden vor |
| `repertoire` | `kern`, `stuetze`, `erweiterung` |
| `imageId`, `audioId`, `videoId` | Verweise auf lokale Mediendateien |

**Aussprache und Form:** `pronunciationHint`, `prosodyNote`, `ipa`, `morphology`

**Sprachliches Muster:** `valency`, `sentenceFrame`, `collocations`, `wordFamily`, `register`, `culturalNote`

**Bedeutungssicherung:** `example`, `nonExample`, `contrastExample`, `confusionRisk`, `checkTemplateId`, `checkPrompt`

**Differenzierung:** `extraHint`, `simplifiedExplanation`, `translation`, `multilingualComparison`, `extensionTask`

**Unterricht:** `situation`, `communicativeTask`, `stepOverrides` (überschreibt `steps` der Sequenz je Schritt), `skipped`, `status`, `statusUpdatedAt`, `liveNote`

`status` ist einer der Klassenstatus – bewusst keine automatische Bewertung:
`begegnet`, `bedeutung-erkannt`, `bedeutung-erinnert`, `form-abgerufen`,
`im-muster-verwendet`, `kommunikativ-eingesetzt`, `reaktiviert`.

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
  "schemaVersion": 1,
  "app": { "name": "LexiScène", "version": "0.1.0" },
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
verständlichen Meldung abgelehnt.

## 4. Einzelexport einer Sequenz

Der Export einer einzelnen Sequenz (Schaltfläche „Exportieren“) erzeugt ein
Austauschdokument, das die Sequenz zusätzlich als **Unterrichtsphase**
beschreibt:

```jsonc
{
  "format": "lexiscene.sequence",
  "version": 1,
  "schemaVersion": 1,
  "app": { "name": "LexiScène", "version": "0.1.0" },
  "exportedAt": "2026-09-04T20:58:35.519Z",
  "phase": {
    "title": "Freizeit verabreden",
    "canDo": "Die Lernenden können …",
    "targetLanguage": "fr",
    "learningGroup": "Klasse 7 · Französisch, 2. Lernjahr",
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

## 5. Änderungen am Schema

Bei künftigen Änderungen wird `schemaVersion` erhöht und in
`src/domain/schema.ts` eine Migration ergänzt. Ältere Dateien bleiben lesbar;
neuere Dateien werden von älteren Programmversionen abgelehnt statt still
falsch interpretiert.
