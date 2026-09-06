import {
  corpusCategories,
  splitHighlight,
  usableExamples,
  type CorpusReveal,
} from '../../domain/corpus';
import { corpusProvenanceLabel, type CorpusExample, type CorpusMiniature } from '../../domain/model';

/** Ein Beleg – markiert wird erst, wenn die Lehrkraft den Fokus aufdeckt. */
function ExampleText({ example, marked }: { example: CorpusExample; marked: boolean }) {
  if (!marked || !example.highlight.trim()) return <>{example.text}</>;
  return (
    <>
      {splitHighlight(example.text, example.highlight).map((segment, index) =>
        segment.mark ? <mark key={index}>{segment.text}</mark> : <span key={index}>{segment.text}</span>,
      )}
    </>
  );
}

export interface CorpusStageProps {
  miniature: CorpusMiniature;
  reveal: CorpusReveal;
  /** Lehrkraftansicht: zeigt zusätzlich Notizen und Quellenhinweis. */
  teacherView: boolean;
}

/**
 * Gestufte Präsentation einer Korpusminiatur.
 *
 * Beim Betreten des Schritts sind Markierungen, Gruppen, Regel und Transfer
 * verborgen; die Lehrkraft deckt sie nacheinander auf. Notizen und
 * Quellenhinweis erscheinen ausschließlich in der Lehrkraftansicht.
 */
export function CorpusStage({ miniature, reveal, teacherView }: CorpusStageProps) {
  const examples = usableExamples(miniature);
  const categories = corpusCategories(miniature);
  const showCategories = reveal.groups && categories.length > 0;

  return (
    <div className="corpus">
      {miniature.title ? <p className="corpus__title">{miniature.title}</p> : null}
      {miniature.guidingQuestion ? <p className="teach__prompt">{miniature.guidingQuestion}</p> : null}

      <ol className="corpus__list" aria-label="Belege">
        {examples.map((example) => (
          <li className="corpus__item" key={example.id}>
            <p className="corpus__text">
              <ExampleText example={example} marked={reveal.highlight} />
            </p>
            {showCategories && example.category.trim() ? (
              <p className="corpus__category">Gruppe: {example.category.trim()}</p>
            ) : null}
            {teacherView && example.teacherNote.trim() ? (
              <p className="teach__teacher-note">Für die Lehrkraft: {example.teacherNote}</p>
            ) : null}
          </li>
        ))}
      </ol>

      {showCategories ? <p className="corpus__groups">Gruppen: {categories.join(' · ')}</p> : null}
      {reveal.groups && miniature.discoveryPrompt.trim() ? (
        <p className="teach__prompt">{miniature.discoveryPrompt}</p>
      ) : null}
      {reveal.rule && miniature.ruleOrFinding.trim() ? <p className="corpus__rule">{miniature.ruleOrFinding}</p> : null}
      {reveal.transfer && miniature.transferPrompt.trim() ? (
        <p className="teach__prompt">{miniature.transferPrompt}</p>
      ) : null}

      {teacherView ? (
        <p className="teach__teacher-note">
          Herkunft: {corpusProvenanceLabel(miniature.provenance)}
          {miniature.sourceNote.trim() ? ` · ${miniature.sourceNote.trim()}` : ''}
        </p>
      ) : null}
    </div>
  );
}
