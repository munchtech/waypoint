'use client';
import { useEffect, useMemo, useState } from 'react';
import { ListTree } from 'lucide-react';
import { guideSections } from '../lib/session-notes';
import { guideHeadings } from '../lib/plan-jump';

// The session guide's sections beside the notes: always in view, the one you're reading marked, one click to each.
const openKey = 'waypoint-outline-open';
const wasOpen = () => {
  try {
    return localStorage.getItem(openKey) !== 'no';
  } catch {
    return true;
  }
};
// "Read-alouds (Session 1)" → "Read-alouds": the session is already on screen. A day or place after it stays.
const shortTitle = (title: string) =>
  title.replace(/\s*\(Session \d+(?:, ([^)]+))?\)/, (_, rest?: string) =>
    rest ? ` (${rest})` : '',
  );
export default function PlanOutline({
  plan,
  onJump,
}: {
  plan: string;
  onJump: (title: string) => void;
}) {
  const sections = useMemo(() => guideSections(plan), [plan]),
    [reading, setReading] = useState(''),
    [open, setOpen] = useState(wasOpen);
  useEffect(() => {
    let frame = 0;
    const read = () => {
      frame = 0;
      let at = '';
      for (const h of guideHeadings()) {
        // Just below where a jump leaves a heading.
        if (h.getBoundingClientRect().top > parseFloat(getComputedStyle(h).scrollMarginTop) + 25)
          break;
        const title = h.textContent?.trim() || '';
        if (sections.includes(title)) at = title;
      }
      setReading(at);
    };
    const queue = () => {
      frame ||= requestAnimationFrame(read);
    };
    queue();
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', queue);
      window.removeEventListener('resize', queue);
    };
  }, [sections]);
  if (sections.length < 2) return null;
  return (
    <details
      className="paper plan-outline"
      open={open}
      onToggle={(e) => {
        const next = e.currentTarget.open;
        setOpen(next);
        try {
          localStorage.setItem(openKey, next ? 'yes' : 'no');
        } catch {}
      }}
    >
      <summary>
        <ListTree size={16} aria-hidden="true" />
        In these notes
      </summary>
      <nav aria-label="In these notes">
        {sections.map((s) => {
          const name = shortTitle(s),
            scene = name.match(/^(Scene \d+)[:.]?\s+(.+)$/);
          return (
            <button
              key={s}
              type="button"
              className={scene ? 'outline-scene' : undefined}
              aria-current={s === reading ? 'location' : undefined}
              onClick={() => onJump(s)}
            >
              {scene ? (
                <>
                  <small>{scene[1]}</small> {scene[2]}
                </>
              ) : (
                name
              )}
            </button>
          );
        })}
      </nav>
    </details>
  );
}
