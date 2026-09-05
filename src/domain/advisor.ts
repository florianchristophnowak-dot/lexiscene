/**
 * Regelbasierter Semantisierungsberater.
 *
 * Die Vorschläge sind unverbindlich: Sie werden angeboten und begründet, aber
 * niemals automatisch gesetzt. Es findet keine Online-Abfrage statt.
 */
import type { LexicalType } from './model';

export interface MethodSuggestion {
  method: string;
  rationale: string;
}

const RULES: Record<LexicalType, MethodSuggestion[]> = {
  gegenstand: [
    { method: 'Bild oder Realie zeigen', rationale: 'Der Gegenstand ist unmittelbar wahrnehmbar; eine Übersetzung wäre ein Umweg.' },
    { method: 'Zeigegeste im Raum', rationale: 'Verknüpft die Form direkt mit der Sache im Klassenzimmer.' },
    { method: 'Reihe gleichartiger Objekte', rationale: 'Grenzt den Begriffsumfang ein und verhindert Übergeneralisierung.' },
  ],
  handlung: [
    { method: 'Kurzes Video oder Animation', rationale: 'Bewegung wird im Ablauf sichtbar, nicht nur im Standbild.' },
    { method: 'Pantomime durch die Lehrkraft', rationale: 'Schnell, ohne Material, und bindet die Aufmerksamkeit.' },
    { method: 'Handlung mit Lernenden ausführen lassen', rationale: 'Körperliche Beteiligung stützt das Behalten.' },
  ],
  eigenschaft: [
    { method: 'Kontrastpaar zeigen', rationale: 'Eigenschaften werden über den Gegensatz eindeutig fassbar.' },
    { method: 'Skala oder Reihung', rationale: 'Macht Abstufungen sichtbar (z. B. lauwarm – warm – heiß).' },
    { method: 'Vergleich zweier Bilder', rationale: 'Zwingt zur Fokussierung auf genau das Merkmal.' },
  ],
  gefuehl: [
    { method: 'Situation erzählen und mitspielen', rationale: 'Gefühle sind an Situationen gebunden, nicht an Objekte.' },
    { method: 'Gesichtsausdruck und Stimme', rationale: 'Mimik und Prosodie tragen die Bedeutung mit.' },
    { method: 'Kontrast zu einem anderen Gefühl', rationale: 'Grenzt ähnliche Gefühlswörter voneinander ab.' },
  ],
  abstrakt: [
    { method: 'Mikrokontext anbieten', rationale: 'Ein knapper, klarer Kontext trägt die Bedeutung besser als eine Definition.' },
    { method: 'Beispiel und Nichtbeispiel', rationale: 'Zieht die Begriffsgrenze aktiv nach.' },
    { method: 'Gezielte Übersetzung als Absicherung', rationale: 'Bei abstrakten Begriffen ist die Übersetzung ökonomisch und legitim.' },
  ],
  sprechakt: [
    { method: 'Mini-Dialog mit Reaktion', rationale: 'Ein Chunk wird über seine Funktion im Gespräch verständlich.' },
    { method: 'Situation mit klarem Bedarf inszenieren', rationale: 'Die Lernenden erleben, wofür die Wendung gebraucht wird.' },
    { method: 'Reaktionen sammeln lassen', rationale: 'Macht das Paar aus Vorschlag und Antwort sichtbar.' },
  ],
  kollokation: [
    { method: 'Satzrahmen an der Tafel', rationale: 'Zeigt die Leerstellen, die gefüllt werden müssen.' },
    { method: 'Bausteinmuster mit Varianten', rationale: 'Macht die feste Verbindung als Einheit erkennbar.' },
    { method: 'Falsche Verbindung kontrastieren', rationale: 'Verhindert wörtliche Übertragungen aus der Erstsprache.' },
  ],
  polysem: [
    { method: 'Zwei kontrastierende Kontexte', rationale: 'Die Bedeutungen werden nur im Kontrast unterscheidbar.' },
    { method: 'Zuordnungsaufgabe zu Situationen', rationale: 'Prüft, welche Lesart gemeint ist.' },
    { method: 'Bedeutungen getrennt einführen', rationale: 'Vermeidet Überlagerung beider Lesarten im Erstzugriff.' },
  ],
  'falscher-freund': [
    { method: 'Sprachvergleich explizit machen', rationale: 'Die Interferenz wird bewusst benannt statt verschwiegen.' },
    { method: 'Richtige und falsche Verwendung gegenüberstellen', rationale: 'Zeigt die Fehlerquelle an einem konkreten Beispiel.' },
    { method: 'Merksatz zur Abgrenzung', rationale: 'Stützt den Abruf in der typischen Fehlersituation.' },
  ],
  sonstige: [
    { method: 'Mikrokontext anbieten', rationale: 'Kontext ist der robusteste Zugang, wenn kein Typ eindeutig passt.' },
    { method: 'Beispiel und Nichtbeispiel', rationale: 'Klärt die Grenzen der Verwendung.' },
  ],
};

export function suggestMethods(type: LexicalType): MethodSuggestion[] {
  return RULES[type] ?? RULES.sonstige;
}

/** Alle bekannten Methoden für die Auswahlliste in der Vorbereitung. */
export const SEMANTISATION_METHODS: readonly string[] = Array.from(
  new Set(Object.values(RULES).flatMap((entries) => entries.map((entry) => entry.method))),
).sort((a, b) => a.localeCompare(b, 'de'));
