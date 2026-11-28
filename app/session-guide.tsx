'use client';
import { useEffect, useState } from 'react';
import { Check, ClipboardList, Play, Flag, ArrowRight } from 'lucide-react';
import { useDeskContext } from './use-desk';
import { count } from '../lib/plural';

type Step = 'Prep' | 'Run' | 'Wrap up' | 'Next';
const KEY = 'waypoint-prepped';
function readPrepped(): string[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

// The Session area's one path through a game night: prep it, run it, wrap it up, then the next one.
// Each step says where it stands, and one of them carries "Up next" so the DM never has to hunt.
export default function SessionGuide() {
  const { campaign, session, memory, view, setView, modal, setModal, live } = useDeskContext();
  const [prepped, setPrepped] = useState<string[]>(readPrepped);
  const index = campaign.sessions.findIndex((s) => s.id === session.id),
    after = campaign.sessions[index + 1],
    playbook = !!memory.playbook;
  const moments =
    campaign.events.filter((e) => e.sessionId === session.id).length +
    (memory.markers || []).filter((k) => k.sessionId === session.id).length;
  const onPrep = view === 'Foresight',
    isPrepped = prepped.includes(session.id);
  // Opening the Prep page counts as prepping this session (set while rendering, saved after).
  if (onPrep && !prepped.includes(session.id)) setPrepped([...prepped, session.id].slice(-200));
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(prepped));
    } catch {}
  }, [prepped]);
  const current: Step | null =
    modal === 'wrap'
      ? 'Wrap up'
      : onPrep
        ? 'Prep'
        : view === 'Next session'
          ? 'Next'
          : view === 'Session desk'
            ? 'Run'
            : null;
  const upNext: Step = session.done
    ? 'Next'
    : moments
      ? 'Wrap up'
      : isPrepped || current === 'Prep'
        ? 'Run'
        : 'Prep';
  const steps: {
    step: Step;
    icon: typeof Play;
    status: string;
    done: boolean;
    go: () => void;
  }[] = [
    {
      step: 'Prep',
      icon: ClipboardList,
      status: playbook
        ? isPrepped
          ? 'Brief read'
          : 'Read the prep brief'
        : session.plan.trim()
          ? isPrepped
            ? 'Plan checked'
            : 'Check your plan'
          : 'Write your plan',
      done: isPrepped,
      go: () => {
        setModal('');
        setView('Foresight');
      },
    },
    {
      step: 'Run',
      icon: Play,
      status: moments ? count(moments, 'moment') + ' recorded' : live ? 'Live now' : 'Not started',
      done: moments > 0,
      go: () => {
        setModal('');
        setView('Session desk');
      },
    },
    {
      step: 'Wrap up',
      icon: Flag,
      status: session.done ? 'Wrapped up' : moments ? 'When the game ends' : 'After the game',
      done: !!session.done,
      go: () => {
        setView('Session desk');
        setModal('wrap');
      },
    },
    {
      step: 'Next',
      icon: ArrowRight,
      status: after
        ? /^session\s+\d/i.test(after.title)
          ? after.title
          : 'Session ' + (index + 2) + ' · ' + after.title
        : 'Plan the next one',
      done: false,
      go: () => {
        setModal('');
        setView('Next session');
      },
    },
  ];
  return (
    <nav className="session-guide" aria-label="Session steps">
      <ol>
        {steps.map(({ step, icon: Icon, status, done, go }) => (
          <li key={step}>
            <button
              className={[
                current === step ? 'selected' : '',
                upNext === step ? 'up-next' : '',
                done ? 'done' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-current={current === step ? 'step' : undefined}
              onClick={go}
            >
              <span className="guide-mark" aria-hidden="true">
                {done ? <Check size={13} /> : <Icon size={13} />}
              </span>
              <span className="guide-text">
                <strong>{step}</strong>
                <small title={status}>{status}</small>
              </span>
              {upNext === step && current !== step && <span className="guide-next">Up next</span>}
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
