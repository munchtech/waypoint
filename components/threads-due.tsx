'use client';
import { Sparkles } from 'lucide-react';
import type { Campaign, Session } from '../lib/campaign';
import { memoryOf } from '../lib/memory';
import { count } from '../lib/plural';
import { THREAD_GAP, threadsDue } from '../lib/threads';

// Prep reminder: characters whose own story hasn't moved in THREAD_GAP played sessions (lib/threads.ts).
export default function ThreadsDue({ campaign, session }: { campaign: Campaign; session: Session }) {
  const due = threadsDue(campaign, memoryOf(campaign).roster, session.id);
  if (!due.length) return null;
  return (
    <div className="recap-draft threads-due">
      <h3>
        <Sparkles size={15} />
        Their own story
      </h3>
      <p className="tiny muted">
        {due.length === 1 ? 'This character has' : 'These characters have'} gone {THREAD_GAP} or more
        played sessions without a personal beat. Give one a scene tonight that touches what they want,
        then add the beat under Party &amp; preferences → Roster.
      </p>
      <ul>
        {due.map((s) => (
          <li key={s.member.id}>
            <strong>{s.member.name}</strong>
            {s.goal ? ' wants ' + s.goal.replace(/[.\s]+$/, '') : ' has no goal written yet'} ·{' '}
            {s.last ? count(s.without, 'session') + ' since the last beat' : 'no beat yet'}
          </li>
        ))}
      </ul>
    </div>
  );
}
