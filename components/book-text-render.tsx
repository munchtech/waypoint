import { createElement, Fragment, useId, useMemo, type ReactNode } from 'react';
import MarkdownIt from 'markdown-it';
import { CircleHelp } from 'lucide-react';
import { useCreatureOpener, useGo, useMentionRenderer } from './campaign-links';
import { cellCreatures } from '../lib/combat';
type Token = ReturnType<typeof markdown.parse>[number];
import { safeWebLink } from '../lib/safe-web-link';
import { goPlaces, isGoPlace, type GoPlace } from '../lib/go-links';
import { markRollTables, type RollMeta } from '../lib/roll-tables';
import RollableTable, { RollRow } from './roll-table';

// Parse Markdown, but construct React elements ourselves. Raw HTML and arbitrary
// token attributes never enter the DOM, and images never load remote resources.
const markdown = new MarkdownIt({ html: false, linkify: false, breaks: false });
const tags = new Set([
  'p',
  'blockquote',
  'ul',
  'ol',
  'li',
  'strong',
  'em',
  's',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
]);
const slug = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .replace(/\s+/g, '-');
// What a table's column headings mean, for the "?" beside them (the Key people tables in the session guides).
const headNotes: Record<string, string> = {
  'stat block':
    'The creature to use for their numbers if it comes to a fight or a roll. Click a name to open its stat block.',
  starts:
    'Their attitude when the party first meets them. Friendly gives Advantage on Influence checks; Hostile gives Disadvantage. Good play can shift it.',
  influence:
    'The DC when a player tries to talk them into something they are hesitant about: Charisma (Persuasion, Deception or Intimidation), or Wisdom (Animal Handling). It is 15 or their Intelligence score, whichever is higher. If they are willing, no roll; if it goes against their nature, no roll can do it. After a failure the same ask waits a day.',
};
function HeadNote({ label, note }: { label: string; note: string }) {
  const id = useId();
  return (
    <>
      <button
        type="button"
        className="head-note"
        popoverTarget={id}
        aria-label={'What “' + label + '” means'}
        title={note}
      >
        <CircleHelp size={13} />
      </button>
      <span popover="auto" id={id} className="head-note-pop" role="note">
        <strong>{label}</strong> {note}
      </span>
    </>
  );
}
type Marks = { note?: string; creature?: boolean; creatureLead?: boolean };
// A "Stat block" cell ("Noble, two Toughs", "Hushman Sergeant"): each creature name opens its stat block.
function creatureCell(text: string, open: (name: string) => void): ReactNode[] {
  return cellCreatures(text).map(({ part, name }, i) =>
    name ? (
      <button
        type="button"
        key={i}
        className="wiki-mention creature-mention"
        title={'Stat block · ' + name}
        onClick={() => open(name)}
      >
        {part}
      </button>
    ) : (
      part
    ),
  );
}
function plain(tokens: Token[]): string {
  return tokens
    .map((t) => (t.type === 'image' ? t.content : t.children ? plain(t.children) : t.content))
    .join('');
}
// A link to `play:<id>` names a prepared play. Where the page knows its plays (session notes), the link becomes a button that opens
// the play's card in place; elsewhere (the book, the wiki) it reads as plain text.
export type PlayLinks = {
  open: string | null;
  toggle: (id: string) => void;
  render: (id: string) => ReactNode;
};
function render(
  tokens: Token[],
  prefix: string,
  mention: ReturnType<typeof useMentionRenderer>,
  seen: Set<string>,
  plays?: PlayLinks,
  skipMentions = false,
  go?: (place: GoPlace) => void,
  creature?: (name: string) => void,
): ReactNode[] {
  let index = 0;
  function walk(skip = false): ReactNode[] {
    const nodes: ReactNode[] = [];
    while (index < tokens.length) {
      const key = index,
        token = tokens[index++];
      if (token.nesting === -1) break;
      const children =
        token.nesting === 1
          ? walk(skip || token.type === 'link_open' || token.type === 'heading_open')
          : token.children
            ? render(token.children, prefix, mention, seen, plays, skip, go, creature)
            : [];
      if (token.hidden) {
        nodes.push(<Fragment key={key}>{children}</Fragment>);
        continue;
      }
      const meta = token.meta as Marks | null;
      if (token.type === 'inline') {
        const cell = meta?.creature && creature && !skip;
        nodes.push(
          <Fragment key={key}>
            {cell ? creatureCell(plain(token.children || []), creature) : children}
            {meta?.note && <HeadNote label={plain(token.children || [])} note={meta.note} />}
          </Fragment>,
        );
        continue;
      }
      if (token.type === 'text') {
        const value = token.content.replace(/^\[ \] /, '☐ ').replace(/^\[[xX]\] /, '☑ ');
        // After "**2024 stat block:**" the creature's name opens its stat block; the rest reads as usual.
        const lead =
          meta?.creatureLead && creature && !skip
            ? value.match(/^(\s*)(\p{Lu}[\p{L}' -]*?)(?=\s*\(|[.,;]|$)/u)
            : null;
        nodes.push(
          skip ? (
            value
          ) : lead ? (
            <Fragment key={key}>
              {lead[1]}
              {creatureCell(lead[2], creature!)}
              {mention(value.slice(lead[0].length), seen)}
            </Fragment>
          ) : (
            mention(value, seen)
          ),
        );
        continue;
      }
      if (token.type === 'softbreak') {
        nodes.push(' ');
        continue;
      }
      if (token.type === 'hardbreak') {
        nodes.push(<br key={key} />);
        continue;
      }
      if (token.type === 'code_inline') {
        nodes.push(<code key={key}>{token.content}</code>);
        continue;
      }
      if (token.type === 'fence' || token.type === 'code_block') {
        nodes.push(
          <pre key={key}>
            <code>{token.content.replace(/\n$/, '')}</code>
          </pre>,
        );
        continue;
      }
      if (token.type === 'hr') {
        nodes.push(<hr key={key} />);
        continue;
      }
      if (token.type === 'link_open' && String(token.attrGet('href') || '').startsWith('play:')) {
        const id = String(token.attrGet('href')).slice(5),
          open = plays?.open === id;
        nodes.push(
          plays ? (
            <Fragment key={key}>
              <button
                type="button"
                className={'play-link' + (open ? ' open' : '')}
                aria-expanded={open}
                onClick={() => plays.toggle(id)}
              >
                {children}
              </button>
              {open && plays.render(id)}
            </Fragment>
          ) : (
            <Fragment key={key}>{children}</Fragment>
          ),
        );
        continue;
      }
      // A link to `go:<place>` opens that part of the app (see lib/go-links); without a handler it reads as plain text.
      if (token.type === 'link_open' && String(token.attrGet('href') || '').startsWith('go:')) {
        const place = String(token.attrGet('href')).slice(3);
        nodes.push(
          go && isGoPlace(place) ? (
            <button
              type="button"
              key={key}
              className="go-link"
              title={'Open ' + goPlaces[place]}
              onClick={() => go(place)}
            >
              {children}
            </button>
          ) : (
            <Fragment key={key}>{children}</Fragment>
          ),
        );
        continue;
      }
      if (token.type === 'link_open' || token.type === 'image') {
        const href = String(token.attrGet(token.type === 'image' ? 'src' : 'href') || '');
        const label = token.type === 'image' ? token.content || 'Image' : children;
        const web = safeWebLink(href);
        let anchor = '';
        if (href.startsWith('#')) {
          try {
            anchor = prefix + decodeURIComponent(href.slice(1));
          } catch {}
        }
        nodes.push(
          web ? (
            <a
              key={key}
              href={web}
              target="_blank"
              rel="noopener noreferrer"
              title={web + ' (opens in browser)'}
            >
              {label}
            </a>
          ) : anchor ? (
            <a
              key={key}
              href={'#' + anchor}
              onClick={(event) => {
                event.preventDefault();
                const target = document.getElementById(anchor);
                target?.scrollIntoView({ block: 'start' });
                target?.focus({ preventScroll: true });
              }}
            >
              {label}
            </a>
          ) : (
            <span key={key} title={'Unsupported link: ' + href}>
              {label}
            </span>
          ),
        );
        continue;
      }
      if (token.type === 'heading_open') {
        const level = Math.min(6, Number(token.tag.slice(1)) + 2);
        nodes.push(
          createElement('h' + level, { key, id: token.attrGet('id'), tabIndex: -1 }, children),
        );
        continue;
      }
      if (tags.has(token.tag)) {
        const props: Record<string, unknown> = { key };
        if (token.tag === 'ol' && token.attrGet('start'))
          props.start = Number(token.attrGet('start'));
        if (token.tag === 'td' || token.tag === 'th') {
          const alignment = String(token.attrGet('style') || '').match(
            /^text-align:(left|center|right)$/,
          )?.[1];
          if (alignment) props.style = { textAlign: alignment };
        }
        // A die table or die list (lib/roll-tables) gets a Roll button, and its rows mark the one rolled.
        const roll = token.meta as RollMeta | null;
        if ((token.tag === 'tr' || token.tag === 'li') && typeof roll?.row === 'number') {
          nodes.push(
            <RollRow key={key} as={token.tag} row={roll.row}>
              {children}
            </RollRow>,
          );
          continue;
        }
        let element: ReactNode = createElement(token.tag, props, children);
        if (token.tag === 'table')
          element = (
            <div className="book-table" key={key}>
              {element}
            </div>
          );
        nodes.push(
          roll?.roll ? (
            <RollableTable key={key} table={roll.roll}>
              {element}
            </RollableTable>
          ) : (
            element
          ),
        );
      } else
        nodes.push(
          <Fragment key={key}>
            {token.content}
            {children}
          </Fragment>,
        );
    }
    return nodes;
  }
  return walk(skipMentions);
}
// `linkEvery` links every mention of a wiki page instead of only the first, for text read at the table (session notes).
export default function BookText({
  text,
  plays,
  excludePageId,
  linkEvery = false,
}: {
  text: string;
  plays?: PlayLinks;
  excludePageId?: string;
  linkEvery?: boolean;
}) {
  const prefix = useId() + '-';
  const mention = useMentionRenderer(excludePageId, linkEvery),
    go = useGo(),
    creature = useCreatureOpener();
  const tokens = useMemo(() => {
    const tokens = markdown.parse(text, {}),
      counts = new Map<string, number>();
    for (let i = 0; i < tokens.length; i++)
      if (tokens[i].type === 'heading_open') {
        const name = slug(plain(tokens[i + 1]?.children || [])) || 'section',
          count = counts.get(name) || 0;
        counts.set(name, count + 1);
        tokens[i].attrSet('id', prefix + name + (count ? '-' + count : ''));
      }
    // Table columns: a "Stat block" column's cells link their creatures, and the headings in `headNotes` get a "?".
    let columns: string[] = [],
      column = 0;
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i],
        inline = tokens[i + 1];
      if (token.type === 'thead_open') columns = [];
      if (token.type === 'tr_open') column = 0;
      if (token.type === 'th_open' && inline?.type === 'inline') {
        const head = plain(inline.children || [])
          .trim()
          .toLowerCase();
        columns.push(head);
        if (headNotes[head]) inline.meta = { note: headNotes[head] };
      }
      if (token.type === 'td_open') {
        if (columns[column] === 'stat block' && inline?.type === 'inline')
          inline.meta = { creature: true };
        column++;
      }
      const kids = token.type === 'inline' ? token.children || [] : [];
      for (let j = 0; j + 3 < kids.length; j++)
        if (
          kids[j].type === 'strong_open' &&
          /stat block:?$/i.test(kids[j + 1].content) &&
          kids[j + 2].type === 'strong_close' &&
          kids[j + 3].type === 'text'
        )
          kids[j + 3].meta = { creatureLead: true };
    }
    markRollTables(tokens);
    return tokens;
  }, [text, prefix]);
  return (
    <div className="book-text">
      {render(tokens, prefix, mention, new Set(), plays, false, go, creature)}
    </div>
  );
}
