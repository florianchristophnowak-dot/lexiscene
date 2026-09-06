import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { createDemoSequence } from '../domain/demo';
import { DEFAULT_SETTINGS } from '../domain/model';
import { renderWithStore } from '../test/renderWithStore';
import { HelpView } from './HelpView';
import { TeachView } from './TeachView';

/**
 * Die Bediensprache betrifft die Lehrkraftoberfläche; die Impulse für die
 * Klasse folgen weiterhin der Zielsprache der Sequenz.
 */
describe('Französische Lehrkraftoberfläche', () => {
  it('übersetzt Hilfe, Phasen und Schritte', () => {
    renderWithStore(<HelpView />, [], {
      state: { settings: { ...DEFAULT_SETTINGS, uiLanguage: 'fr' } },
    });

    expect(screen.getByRole('heading', { name: 'Aide' })).toBeInTheDocument();
    expect(screen.getByText('Six phases comme structure')).toBeInTheDocument();
    expect(screen.getByText('Vérifier le sens (CCQ)')).toBeInTheDocument();
    expect(screen.getByText('Contrôle de restitution')).toBeInTheDocument();
    // Kein deutscher Rest in der Oberfläche.
    expect(screen.queryByText('Hilfe')).not.toBeInTheDocument();
    expect(screen.queryByText(/Sechs Phasen/)).not.toBeInTheDocument();
  });

  it('übersetzt den Unterrichtsmodus, ohne die Zielsprache zu berühren', () => {
    const sequence = createDemoSequence();
    renderWithStore(<TeachView sequenceId={sequence.id} />, [sequence], {
      state: { settings: { ...DEFAULT_SETTINGS, uiLanguage: 'fr' } },
    });

    expect(screen.getByText('Phase 1 : Mise en situation')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Suivant →' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sens' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Bedeutung' })).not.toBeInTheDocument();
  });

  it('folgt auf Wunsch der Sprache der Sequenz', () => {
    const sequence = createDemoSequence();
    renderWithStore(<TeachView sequenceId={sequence.id} />, [sequence], {
      state: {
        settings: { ...DEFAULT_SETTINGS, uiLanguage: 'sequence', lastSequenceId: sequence.id },
      },
    });
    // Die Beispielsequenz ist französisch – und Französisch ist vollständig übersetzt.
    expect(screen.getByText('Phase 1 : Mise en situation')).toBeInTheDocument();
  });
});
