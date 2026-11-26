'use client';
import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { BookMarked, FileDown, FolderOpen } from 'lucide-react';
import BookText from './book-text';
import InlineMarks from './inline-marks';
import type { Campaign } from '../lib/campaign';
import type { Encounter } from '../lib/playbook';
import { pageName } from '../lib/page-name';
import { appFetch, isDesktop } from '../lib/transport';
import {
  bookContents,
  bookFileName,
  bookPartLabels,
  bookParts,
  dmOnlyParts,
  type BookContents,
  type BookCopy,
  type BookPart,
} from '../lib/campaign-book';

const frames = (n: number) =>
  new Promise<void>((done) => {
    const step = (left: number) => (left ? requestAnimationFrame(() => step(left - 1)) : done());
    step(n);
  });
// Formatted text loads its parser on first use; wait until every body in the book has its formatting.
async function formatted(root: HTMLElement | null) {
  for (let i = 0; i < 120 && root?.querySelector('.book-text-plain'); i++) await frames(1);
}

function EncounterBox({ encounter }: { encounter: Encounter }) {
  return (
    <div className="book-encounter">
      <h4>{encounter.title}</h4>
      <ul>
        {encounter.creatures.map((c, i) => (
          <li key={i}>
            {c.count > 1 ? c.count + ' × ' : ''}
            {c.name} <span className="book-meta">CR {c.cr}</span>
            {c.base && c.base.toLowerCase() !== c.name.toLowerCase() && (
              <span className="book-meta"> · uses {c.base}</span>
            )}
          </li>
        ))}
      </ul>
      {encounter.tactics && (
        <p>
          <strong>Tactics.</strong> <InlineMarks text={encounter.tactics} />
        </p>
      )}
      {encounter.exit && (
        <p>
          <strong>Way out.</strong> <InlineMarks text={encounter.exit} />
        </p>
      )}
      {encounter.scale && (
        <p>
          <strong>Scaling.</strong> <InlineMarks text={encounter.scale} />
        </p>
      )}
    </div>
  );
}

// The printable book: a cover, a contents list, then one chapter per part. Only shown while printing.
export function BookPages({ book }: { book: BookContents }) {
  const dm = book.copy === 'DM';
  return (
    <div className="campaign-book" data-copy={book.copy}>
      <section className="book-cover">
        <p className="book-kicker">{book.subtitle}</p>
        <h1>{book.title}</h1>
        {book.overview?.tone && <p className="book-tone">{book.overview.tone}</p>}
        <p className="book-made">
          Prepared {new Date().toLocaleDateString(undefined, { dateStyle: 'long' })}
        </p>
      </section>
      {book.chapters.length > 1 && (
        <nav className="book-contents" aria-label="Contents">
          <h2>Contents</h2>
          <ol>
            {book.chapters.map((c) => (
              <li key={c.id}>{c.title}</li>
            ))}
          </ol>
        </nav>
      )}
      {book.overview && (
        <section className="book-chapter">
          <h1>Campaign overview</h1>
          {book.overview.premise && (
            <>
              <h2>Premise</h2>
              <BookText text={book.overview.premise} />
            </>
          )}
          {(book.overview.party || book.overview.roster.length > 0) && <h2>The party</h2>}
          {book.overview.party && <BookText text={book.overview.party} />}
          {book.overview.roster.length > 0 && (
            <table className="book-roster">
              <thead>
                <tr>
                  <th>Character</th>
                  <th>Player</th>
                  <th>Level</th>
                </tr>
              </thead>
              <tbody>
                {book.overview.roster.map((r, i) => (
                  <tr key={i}>
                    <td>{r.name}</td>
                    <td>{r.player}</td>
                    <td>{r.level}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {book.overview.arc && (
            <>
              <h2>The arc</h2>
              <BookText text={book.overview.arc} />
            </>
          )}
          {(book.overview.boundaries || book.overview.twist) && (
            <aside className="book-sidebar">
              {book.overview.boundaries && (
                <p>
                  <strong>Table boundaries.</strong> {book.overview.boundaries}
                </p>
              )}
              {book.overview.twist && (
                <p>
                  <strong>Twists.</strong> {book.overview.twist}
                </p>
              )}
            </aside>
          )}
        </section>
      )}
      {book.sessions.length > 0 && (
        <section className="book-chapter">
          <h1>Sessions</h1>
          {book.sessions.map(({ session, number, encounters, brief }) => (
            <article className="book-session" key={session.id}>
              <p className="book-kicker">Session {number}</p>
              <h2>{session.title}</h2>
              {session.summary && <p className="book-lede">{session.summary}</p>}
              {brief && (brief.pressure || brief.endOn || brief.npcs || brief.checklist.length) ? (
                <aside className="book-sidebar">
                  {brief.pressure && (
                    <p>
                      <strong>Pressure.</strong> {brief.pressure}
                    </p>
                  )}
                  {brief.npcs && (
                    <p>
                      <strong>People.</strong> {brief.npcs}
                    </p>
                  )}
                  {brief.endOn && (
                    <p>
                      <strong>End on.</strong> {brief.endOn}
                    </p>
                  )}
                  {brief.checklist.length > 0 && (
                    <ul>
                      {brief.checklist.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  )}
                </aside>
              ) : null}
              {session.plan && <BookText text={session.plan} />}
              {session.branches.length > 0 && (
                <>
                  <h3>If the party…</h3>
                  {session.branches.map((b) => (
                    <div className="book-play" key={b.id}>
                      <h4>{b.title}</h4>
                      <p className="book-meta">
                        {b.style}
                        {b.likelihood && ' · ' + b.likelihood}
                      </p>
                      {b.readAloud && (
                        <blockquote className="book-read-aloud">
                          <InlineMarks text={b.readAloud} />
                        </blockquote>
                      )}
                      {b.response && (
                        <p>
                          <strong>Running it.</strong> <InlineMarks text={b.response} />
                        </p>
                      )}
                      {b.consequence && (
                        <p>
                          <strong>What follows.</strong> <InlineMarks text={b.consequence} />
                        </p>
                      )}
                      {b.fallback && (
                        <p>
                          <strong>If it stalls.</strong> <InlineMarks text={b.fallback} />
                        </p>
                      )}
                    </div>
                  ))}
                </>
              )}
              {encounters.length > 0 && (
                <>
                  <h3>Encounters</h3>
                  {encounters.map((e) => (
                    <EncounterBox encounter={e} key={e.id} />
                  ))}
                </>
              )}
            </article>
          ))}
        </section>
      )}
      {book.wiki.length > 0 && (
        <section className="book-chapter">
          <h1>{dm ? 'People, places and lore' : 'What the party knows'}</h1>
          {book.wiki.map((group) => (
            <div className="book-wiki-group" key={group.kind}>
              <h2>{group.title}</h2>
              {group.pages.map((p) => (
                <article className="book-entry" key={p.id}>
                  <h3>{pageName(p)}</h3>
                  <p className="book-meta">
                    {p.status === 'Confirmed' ? '' : p.status}
                    {dm && (p.status === 'Confirmed' ? '' : ' · ') + p.visibility}
                  </p>
                  <BookText text={p.body} excludePageId={p.id} />
                </article>
              ))}
            </div>
          ))}
        </section>
      )}
      {(book.encounters.length > 0 || book.statblocks.length > 0) && (
        <section className="book-chapter">
          <h1>Appendix: encounters and stat blocks</h1>
          {book.encounters.length > 0 && (
            <>
              <h2>Encounters</h2>
              {book.encounters.map((e) => (
                <EncounterBox encounter={e} key={e.id} />
              ))}
            </>
          )}
          {book.statblocks.length > 0 && (
            <>
              <h2>Stat blocks</h2>
              {book.statblocks.map((s) => (
                <article className="book-statblock" key={s.id}>
                  <h3>{s.name}</h3>
                  <p className="book-meta">
                    CR {s.cr}
                    {s.base && ' · built on ' + s.base}
                  </p>
                  <BookText text={s.body} />
                </article>
              ))}
            </>
          )}
        </section>
      )}
      {book.cards.length > 0 && (
        <section className="book-chapter">
          <h1>Appendix: table cards</h1>
          {book.cards.map((card) => (
            <article className="book-entry" key={card.id}>
              <h3>{card.title}</h3>
              {card.kind && <p className="book-meta">{card.kind}</p>}
              {card.readAloud && (
                <blockquote className="book-read-aloud">
                  <InlineMarks text={card.readAloud} />
                </blockquote>
              )}
              {card.body && <BookText text={card.body} />}
              {card.consequence && (
                <p>
                  <strong>What follows.</strong> <InlineMarks text={card.consequence} />
                </p>
              )}
            </article>
          ))}
        </section>
      )}
      {book.handouts.length > 0 && (
        <section className="book-chapter">
          <h1>Handouts</h1>
          {book.handouts.map((h) => (
            <article className="book-handout" key={h.id}>
              <h2>{h.title}</h2>
              <BookText text={h.body} />
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

// Save the campaign as a PDF laid out like a published adventure, for the DM or as a players' guide.
export default function CampaignBookPanel({ campaign }: { campaign: Campaign }) {
  const [copy, setCopy] = useState<BookCopy>('DM'),
    [parts, setParts] = useState<BookPart[]>([...bookParts]),
    [printing, setPrinting] = useState<BookContents | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [saved, setSaved] = useState('');
  const book = useMemo(() => bookContents(campaign, copy, parts), [campaign, copy, parts]);
  const offered = bookParts.filter((part) => copy === 'DM' || !dmOnlyParts.includes(part));
  const counts = [
    book.sessions.length &&
      book.sessions.length + (book.sessions.length === 1 ? ' session' : ' sessions'),
    book.wiki.length && book.wiki.reduce((n, g) => n + g.pages.length, 0) + ' wiki pages',
    book.statblocks.length && book.statblocks.length + ' stat blocks',
    book.handouts.length && book.handouts.length + ' handouts',
  ].filter(Boolean);
  async function save() {
    setBusy(true);
    setMessage('');
    setSaved('');
    await import('./book-text-render');
    setPrinting(book);
    await frames(2);
    await formatted(document.querySelector<HTMLElement>('.campaign-book'));
    await document.fonts?.ready;
    const title = document.title;
    document.title = book.title + ' · ' + book.subtitle;
    document.body.classList.add('print-book');
    try {
      if (isDesktop()) {
        const response = await appFetch('/api/campaign-book', {
          method: 'POST',
          body: JSON.stringify({ fileName: bookFileName(campaign.name, copy) }),
        });
        const result = (await response.json()) as {
          saved?: boolean;
          path?: string;
          error?: string;
        };
        if (!response.ok) throw Error(result.error || 'The book could not be saved.');
        if (result.saved && result.path) {
          setSaved(result.path);
          setMessage('Saved to ' + result.path);
        }
      } else window.print();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'The book could not be saved.');
    } finally {
      document.body.classList.remove('print-book');
      document.title = title;
      setPrinting(null);
      setBusy(false);
    }
  }
  return (
    <section className="paper campaign-book-panel">
      <h3>
        <BookMarked size={17} /> Campaign book
      </h3>
      <p className="muted">
        Save the campaign as a PDF laid out like a published adventure. The players’ guide holds
        only pages the party knows and your handouts.
      </p>
      <div className="book-options">
        <fieldset>
          <legend>Copy</legend>
          {(['DM', 'Players'] as BookCopy[]).map((c) => (
            <label key={c}>
              <input
                type="radio"
                name="book-copy"
                checked={copy === c}
                onChange={() => setCopy(c)}
              />
              {c === 'DM' ? 'DM’s book' : 'Players’ guide'}
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend>Include</legend>
          {offered.map((part) => (
            <label key={part}>
              <input
                type="checkbox"
                checked={parts.includes(part)}
                onChange={(e) =>
                  setParts((now) =>
                    e.target.checked ? [...now, part] : now.filter((p) => p !== part),
                  )
                }
              />
              {bookPartLabels[part]}
            </label>
          ))}
        </fieldset>
      </div>
      <div className="book-actions">
        <button
          className="button primary"
          onClick={() => void save()}
          disabled={busy || !book.chapters.length}
        >
          <FileDown size={15} />
          {busy ? 'Laying out the book…' : isDesktop() ? 'Save PDF' : 'Print'}
        </button>
        <span className="muted">
          {book.chapters.length ? counts.join(' · ') : 'Nothing to print with these choices.'}
        </span>
      </div>
      {message && (
        <p className="book-message" role="status">
          {message}
          {saved && (
            <button
              className="text-button"
              onClick={() =>
                void appFetch('/api/campaign-book/open', {
                  method: 'POST',
                  body: JSON.stringify({ path: saved }),
                })
              }
            >
              <FolderOpen size={13} /> Open
            </button>
          )}
        </p>
      )}
      {printing && createPortal(<BookPages book={printing} />, document.body)}
    </section>
  );
}
