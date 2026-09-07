import { analyseLexeme } from '../../domain/profile';
import type { Lexeme } from '../../domain/model';
import { useT, useTid } from '../../i18n/context';

/**
 * Wortprofil: die sieben Dimensionen auf einen Blick.
 *
 * Die Liste sagt nur, wozu schon etwas eingetragen ist. Sie bewertet nichts,
 * verlangt keine Vollständigkeit und blockiert nichts – die Leitfrage steht
 * dabei, damit klar ist, worum es in der Dimension überhaupt geht.
 */
export function ProfilePanel({ lexeme }: { lexeme: Lexeme }) {
  const t = useT();
  const tid = useTid();

  const entries = analyseLexeme(lexeme);
  const open = entries.filter((entry) => !entry.filled);

  return (
    <div className="stack-tight">
      <p className="field__hint">{t('profile.hint')}</p>

      <ul className="profile-list">
        {entries.map((entry) => (
          <li className={entry.filled ? 'profile-item profile-item--filled' : 'profile-item'} key={entry.id}>
            <span className="profile-item__mark" aria-hidden="true">
              {entry.filled ? '●' : '○'}
            </span>
            <span>
              <span className="profile-item__name">{tid('profile.dimension', entry.id)}</span>
              <span className="field__hint profile-item__question">{tid('profile.question', entry.id)}</span>
            </span>
          </li>
        ))}
      </ul>

      <p className="field__hint">
        {open.length === 0
          ? t('profile.complete')
          : t('profile.open', { list: open.map((entry) => tid('profile.dimension', entry.id)).join(', ') })}
      </p>
    </div>
  );
}
