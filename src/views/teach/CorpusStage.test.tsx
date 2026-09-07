import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CLOSED_CORPUS_REVEAL, createCorpusExample, createCorpusMiniature } from '../../domain/corpus';
import { CorpusStage } from './CorpusStage';

const miniature = () =>
  createCorpusMiniature({
    enabled: true,
    title: 'jouer à oder jouer de?',
    guidingQuestion: 'Was steht nach jouer?',
    examples: [
      createCorpusExample({
        text: 'Nous jouons au tennis le samedi.',
        highlight: 'au tennis',
        category: 'Sport/Spiel',
        teacherNote: 'Erster klarer Fall.',
      }),
      createCorpusExample({
        text: 'Ils jouent aux échecs à la récréation.',
        highlight: 'aux échecs',
        category: 'Sport/Spiel',
        teacherNote: 'à + les → aux.',
      }),
      createCorpusExample({
        text: 'Elle joue du piano tous les jours.',
        highlight: 'du piano',
        category: 'Instrument',
        teacherNote: 'Gegenbeispiel.',
      }),
    ],
    discoveryPrompt: 'Sortiert die Belege in zwei Gruppen.',
    ruleOrFinding: 'jouer à + Sport · jouer de + Instrument',
    transferPrompt: 'Bildet je einen eigenen Satz.',
    sourceNote: 'Selbst formulierte Beispielsätze.',
  });

describe('Korpusminiatur im Unterricht', () => {
  it('zeigt zuerst nur Leitfrage und unmarkierte Belege', () => {
    render(<CorpusStage miniature={miniature()} reveal={CLOSED_CORPUS_REVEAL} teacherView={false} />);

    expect(screen.getByText('Was steht nach jouer?')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Belege' }).querySelectorAll('li')).toHaveLength(3);
    expect(screen.getByText('Nous jouons au tennis le samedi.')).toBeInTheDocument();

    expect(document.querySelectorAll('mark')).toHaveLength(0);
    expect(screen.queryByText(/Gruppe: Sport\/Spiel/)).not.toBeInTheDocument();
    expect(screen.queryByText('Sortiert die Belege in zwei Gruppen.')).not.toBeInTheDocument();
    expect(screen.queryByText('jouer à + Sport · jouer de + Instrument')).not.toBeInTheDocument();
    expect(screen.queryByText('Bildet je einen eigenen Satz.')).not.toBeInTheDocument();
  });

  it('markiert den Fokus semantisch, wenn er aufgedeckt wird', () => {
    render(
      <CorpusStage miniature={miniature()} reveal={{ ...CLOSED_CORPUS_REVEAL, highlight: true }} teacherView={false} />,
    );

    const marks = Array.from(document.querySelectorAll('mark')).map((element) => element.textContent);
    expect(marks).toEqual(['au tennis', 'aux échecs', 'du piano']);
    // Der Beleg selbst bleibt vollständig erhalten.
    const [first] = screen.getByRole('list', { name: 'Belege' }).querySelectorAll('.corpus__text');
    expect(first.textContent).toBe('Nous jouons au tennis le samedi.');
  });

  it('macht die Gruppen zusätzlich als Text sichtbar', () => {
    render(
      <CorpusStage miniature={miniature()} reveal={{ ...CLOSED_CORPUS_REVEAL, groups: true }} teacherView={false} />,
    );

    expect(screen.getAllByText('Gruppe: Sport/Spiel')).toHaveLength(2);
    expect(screen.getByText('Gruppe: Instrument')).toBeInTheDocument();
    expect(screen.getByText('Gruppen: Sport/Spiel · Instrument')).toBeInTheDocument();
    expect(screen.getByText('Sortiert die Belege in zwei Gruppen.')).toBeInTheDocument();
  });

  it('sichert Regel und Transfer getrennt', () => {
    const { rerender } = render(
      <CorpusStage miniature={miniature()} reveal={{ ...CLOSED_CORPUS_REVEAL, rule: true }} teacherView={false} />,
    );
    expect(screen.getByText('jouer à + Sport · jouer de + Instrument')).toBeInTheDocument();
    expect(screen.queryByText('Bildet je einen eigenen Satz.')).not.toBeInTheDocument();

    rerender(
      <CorpusStage miniature={miniature()} reveal={{ ...CLOSED_CORPUS_REVEAL, transfer: true }} teacherView={false} />,
    );
    expect(screen.getByText('Bildet je einen eigenen Satz.')).toBeInTheDocument();
    expect(screen.queryByText('jouer à + Sport · jouer de + Instrument')).not.toBeInTheDocument();
  });

  it('zeigt Notizen und Quellenhinweis nur der Lehrkraft', () => {
    const { rerender } = render(
      <CorpusStage miniature={miniature()} reveal={CLOSED_CORPUS_REVEAL} teacherView={false} />,
    );
    expect(screen.queryByText(/Erster klarer Fall/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Selbst formulierte Beispielsätze/)).not.toBeInTheDocument();

    rerender(<CorpusStage miniature={miniature()} reveal={CLOSED_CORPUS_REVEAL} teacherView />);
    expect(screen.getByText('Für die Lehrkraft: Erster klarer Fall.')).toBeInTheDocument();
  });

  it('übergeht leere Belege', () => {
    const withBlank = createCorpusMiniature({
      enabled: true,
      examples: [createCorpusExample({ text: 'Ein Beleg.' }), createCorpusExample({ text: '   ' })],
    });
    render(<CorpusStage miniature={withBlank} reveal={CLOSED_CORPUS_REVEAL} teacherView={false} />);
    expect(screen.getByRole('list', { name: 'Belege' }).querySelectorAll('li')).toHaveLength(1);
  });
});
