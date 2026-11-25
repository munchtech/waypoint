'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CornerUpLeft, Pause, Play, PenLine, Printer, RotateCcw, Timer } from 'lucide-react';
import BookText from './book-text';

// The bar pinned above a session plan while you run it: record what no play covers, a session clock that reads the plan's own
// timeline ("| 0:20 to 0:50 | Scene 1 … |") to say where a session usually is by now, and a print button for the plan's table card.
// 1.44: Bring it back (the scene's line for when a joke runs on, and who has had the least spotlight), a spotlight count per
// character, and a break hint near the middle of the planned time (docs/actual-play-study.md).
import {
  breakDue,
  breakNote,
  bringBacks,
  clockText,
  guideSections,
  leastSpotlit,
  pace,
  rowScene,
  tableCard,
  timeline,
} from '../lib/session-notes';
type Clock = { start: number | null; banked: number; broke?: boolean };
type Character = { id: string; name: string };
const load = <T,>(key: string, ok: (v: unknown) => v is T, empty: T): T => {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(key) || 'null');
    if (ok(v)) return v;
  } catch {}
  return empty;
};
const isClock = (v: unknown): v is Clock =>
  !!v && typeof v === 'object' && typeof (v as Clock).banked === 'number';
const isCounts = (v: unknown): v is Record<string, number> =>
  !!v && typeof v === 'object' && Object.values(v).every((n) => typeof n === 'number');
const store = (key: string, v: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {}
};
const genericBack =
  'Move the world, not the players: a sound, a change of light, someone arrives. Use it once.';
const genericBreak = 'about halfway, after a decision or a reveal. Never mid-fight.';
export default function NotesBar({
  sessionId,
  plan,
  roster = [],
  focus,
  onJump,
  onRecord,
}: {
  sessionId: string;
  plan: string;
  roster?: Character[];
  // The scene last jumped to, from here or from the outline beside the notes.
  focus: string;
  onJump: (title: string) => void;
  onRecord: () => void;
}) {
  const key = 'waypoint-clock:' + sessionId,
    spotKey = 'waypoint-spotlight:' + sessionId,
    [clock, setClock] = useState<Clock>(() => load(key, isClock, { start: null, banked: 0 })),
    [counts, setCounts] = useState<Record<string, number>>(() => load(spotKey, isCounts, {})),
    [now, setNow] = useState(() => Date.now()),
    [printing, setPrinting] = useState(false),
    [backOpen, setBackOpen] = useState(false);
  const sections = guideSections(plan),
    rows = timeline(plan),
    card = tableCard(plan),
    backs = bringBacks(plan),
    breakLine = breakNote(plan),
    running = clock.start !== null,
    min = (clock.banked + (running ? now - clock.start! : 0)) / 60000,
    where = running || clock.banked ? pace(rows, min) : null,
    timed = running || clock.banked > 0,
    showBreak = timed && !clock.broke && breakDue(rows, min);
  // The scene in hand: the last one you jumped to, or the one the clock says you're usually in by now.
  const paced = rows.find((r) => min >= r.from && min < r.to),
    pacedScene = timed && paced ? rowScene(paced.what) : null,
    current =
      backs.find((b) => b.scene === focus) ||
      (pacedScene !== null
        ? backs.find((b) => b.scene.startsWith('Scene ' + pacedScene + ':'))
        : undefined),
    quiet = leastSpotlit(roster, counts);
  // A jump lands its heading just below the bar, however many rows the bar has wrapped to.
  const bar = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = bar.current,
      root = document.documentElement.style;
    if (!el) return;
    const measure = () => root.setProperty('--notes-bar', el.offsetHeight + 'px');
    measure();
    const watch = new ResizeObserver(measure);
    watch.observe(el);
    return () => {
      watch.disconnect();
      root.removeProperty('--notes-bar');
    };
  }, []);
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(t);
  }, [running]);
  const save = (c: Clock) => {
    setClock(c);
    setNow(Date.now());
    store(key, c);
  };
  const spot = (id: string, by: number) => {
    const next = { ...counts, [id]: Math.max(0, (counts[id] || 0) + by) };
    setCounts(next);
    store(spotKey, next);
  };
  function print() {
    setPrinting(true);
    requestAnimationFrame(() => {
      document.body.classList.add('print-card');
      const done = () => {
        document.body.classList.remove('print-card');
        setPrinting(false);
        window.removeEventListener('afterprint', done);
      };
      window.addEventListener('afterprint', done);
      window.print();
    });
  }
  return (
    <div ref={bar} className="notes-bar no-print" role="toolbar" aria-label="Running this session">
      {sections.length > 0 && (
        <select
          className="scene-jump"
          aria-label="Jump to a scene"
          value=""
          onChange={(e) => {
            if (e.target.value) onJump(e.target.value);
          }}
        >
          <option value="">Jump to…</option>
          {sections.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      )}
      <button
        className="button small"
        onClick={onRecord}
        title="Write one line about something no play covers. It goes in the chronicle, and next week it can become a play."
      >
        <PenLine size={14} />
        Record what happened
      </button>
      <button
        className="button small"
        aria-expanded={backOpen}
        onClick={() => setBackOpen((o) => !o)}
        title="When a joke runs on and the scene stalls: one move in the fiction, and who has had the least spotlight."
      >
        <CornerUpLeft size={14} />
        Bring it back
      </button>
      {card && (
        <button className="button small" onClick={print}>
          <Printer size={14} />
          Print table card
        </button>
      )}
      {backOpen && (
        <div className="bring-back" role="region" aria-label="Bring it back">
          <p>
            {current ? (
              <>
                <small>{current.scene}</small> {current.line}
              </>
            ) : (
              genericBack
            )}
          </p>
          {quiet.length > 0 && quiet.length < roster.length && (
            <p>
              <small>Least spotlight tonight</small> {quiet.map((r) => r.name).join(', ')}. Ask what{' '}
              {quiet.length > 1 ? 'they’re' : quiet[0].name + ' is'} doing.
            </p>
          )}
          <p className="muted tiny">
            Most jokes end on their own. Laugh first; use this once, and never to tell anyone off.
          </p>
          {backs.length > 1 && (
            <details>
              <summary>Every scene</summary>
              <ul>
                {backs.map((b) => (
                  <li key={b.scene + b.line}>
                    <small>{b.scene}</small> {b.line}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
      {roster.length > 0 && (
        <div className="spotlight-count" role="group" aria-label="Spotlight tonight">
          <small>Spotlight</small>
          {roster.map((r) => (
            <button
              key={r.id}
              type="button"
              title="Tap when this character takes the scene. Right-click to take one back."
              aria-label={`${r.name}: ${counts[r.id] || 0}. Add one`}
              onClick={() => spot(r.id, 1)}
              onContextMenu={(e) => {
                e.preventDefault();
                spot(r.id, -1);
              }}
            >
              {r.name} <strong>{counts[r.id] || 0}</strong>
            </button>
          ))}
        </div>
      )}
      {rows.length > 0 && (
        <div className={'session-clock' + (where?.over ? ' over' : '')}>
          <Timer size={14} aria-hidden="true" />
          <strong aria-label="Session time">{clockText(min)}</strong>
          {running ? (
            <button
              className="text-button"
              onClick={() =>
                save({ ...clock, start: null, banked: clock.banked + Date.now() - clock.start! })
              }
            >
              <Pause size={13} />
              Pause
            </button>
          ) : (
            <button
              className="text-button"
              onClick={() => save({ ...clock, start: Date.now(), banked: clock.banked })}
            >
              <Play size={13} />
              {clock.banked ? 'Resume' : 'Start the clock'}
            </button>
          )}
          {timed && (
            <button
              className="text-button"
              aria-label="Reset the clock"
              onClick={() => save({ start: null, banked: 0 })}
            >
              <RotateCcw size={13} />
            </button>
          )}
          {where && (
            <span className="pace" role="status">
              <small>Usually by now</small> {where.now}
              {where.next && (
                <>
                  <small> · Next</small> {where.next}
                </>
              )}
            </span>
          )}
          {showBreak && (
            <span className="break-hint">
              <small>Break</small> {breakLine || genericBreak}{' '}
              <button className="text-button" onClick={() => save({ ...clock, broke: true })}>
                We took it
              </button>
            </span>
          )}
        </div>
      )}
      {printing && (
        <div className="table-card-print">
          <BookText text={card} />
        </div>
      )}
    </div>
  );
}
