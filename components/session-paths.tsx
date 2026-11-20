'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import type { Campaign, Session } from '../lib/campaign';
import { memoryOf } from '../lib/memory';
import { isPossible, rankPlays, searchPlays, type Play } from '../lib/playbook';
import PlayCard from './play-card';

type Props = {
  campaign: Campaign;
  session: Session;
  expanded: string | null;
  onExpand: (id: string | null) => void;
  onPlayed: (play: Play, sessionId?: string) => void;
  onQuick: (play: Play, sessionId?: string) => void;
  onAdapt: (prompt: string) => void;
  targetId?: string;
};
// A collapsible group that renders its cards only while open, so hundreds of plays cost nothing until asked for.
function Group({
  title,
  size,
  open: startOpen,
  children,
}: {
  title: string;
  size: number;
  open: boolean;
  children: () => ReactNode;
}) {
  // Follows the parent's choice when it changes (a new current scene), and the reader's clicks in between.
  const [open, setOpen] = useState(startOpen),
    [given, setGiven] = useState(startOpen);
  if (given !== startOpen) {
    setGiven(startOpen);
    setOpen(startOpen);
  }
  return (
    <details
      className="scene-group"
      open={open}
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary>
        <span>{title}</span>
        <small>{size === 1 ? '1 path' : size + ' paths'}</small>
      </summary>
      {open && children()}
    </details>
  );
}
// The scene the table is in, kept per session on this computer.
const sceneKey = (sessionId: string) => 'waypoint-scene:' + sessionId;
function savedScene(sessionId: string) {
  try {
    return localStorage.getItem(sceneKey(sessionId)) || '';
  } catch {
    return '';
  }
}
export default function SessionPaths({
  campaign,
  session,
  expanded,
  onExpand,
  onPlayed,
  onQuick,
  onAdapt,
  targetId,
}: Props) {
  const pb = memoryOf(campaign).playbook;
  const [query, setQuery] = useState(''),
    [scope, setScope] = useState(() =>
      targetId && (pb?.anytime || []).some((p) => p.id === targetId) ? 'Anytime' : 'This session',
    ),
    [showBlocked, setShowBlocked] = useState(true),
    [now, setNow] = useState(() => ({ sessionId: session.id, scene: savedScene(session.id) }));
  const list = useRef<HTMLDivElement>(null);
  const current = now.sessionId === session.id ? now.scene : savedScene(session.id);
  const chooseScene = (scene: string) => {
    setNow({ sessionId: session.id, scene });
    try {
      if (scene) localStorage.setItem(sceneKey(session.id), scene);
      else localStorage.removeItem(sceneKey(session.id));
    } catch {}
  };
  const scoped =
    scope === 'Anytime'
      ? pb?.anytime || []
      : scope === 'All sessions'
        ? [...campaign.sessions.flatMap((s) => s.branches), ...(pb?.anytime || [])]
        : session.branches;
  const ordered = query.trim()
    ? searchPlays(query, scoped)
    : pb
      ? rankPlays(campaign, pb, scoped).map((r) => r.play)
      : scoped;
  const plays = ordered.filter((p) => showBlocked || !pb || isPossible(pb, p));
  // Scenes in the order the session plan runs them; plays without a scene come last.
  const byPlan = (a: string, b: string) => {
    const at = (scene: string) =>
      scene && session.plan.includes('### ' + scene)
        ? session.plan.indexOf('### ' + scene)
        : Infinity;
    return at(a) - at(b);
  };
  const sessionScenes = [...new Set(session.branches.map((p) => p.scene || ''))]
    .filter(Boolean)
    .sort(byPlan);
  // "Now" narrows this session's paths to the scene the table is in; the other scenes stay one click away.
  const nowScene =
    scope === 'This session' && !query.trim() && sessionScenes.includes(current) ? current : '';
  const scenes = [...new Set(plays.map((p) => p.scene || ''))].sort((a, b) =>
    nowScene ? Number(b === nowScene) - Number(a === nowScene) || byPlan(a, b) : byPlan(a, b),
  );
  const step = (by: number) => {
    const i = sessionScenes.indexOf(nowScene);
    chooseScene(sessionScenes[Math.min(sessionScenes.length - 1, Math.max(0, i + by))]);
  };
  // Which session each play belongs to, for labels, recording and the grouped "All sessions" list.
  const owner = new Map(
    campaign.sessions.flatMap((x) => x.branches.map((p) => [p.id, x.id] as const)),
  );
  const wide = scope === 'All sessions' && !query.trim();
  const card = (play: Play) => {
    const at = campaign.sessions.find((x) => x.id === owner.get(play.id));
    return (
      <div key={play.id} data-play-id={play.id}>
        <PlayCard
          play={play}
          pb={pb}
          label={scope === 'This session' || wide ? undefined : at?.title || 'Anytime'}
          open={expanded === play.id}
          recorded={campaign.events.some((e) => e.branchId === play.id)}
          onToggle={() => onExpand(expanded === play.id ? null : play.id)}
          onPlayed={(p) => onPlayed(p, at?.id)}
          onQuick={(p) => onQuick(p, at?.id)}
          onAdapt={() =>
            onAdapt(
              `Help me respond to this possible choice: ${play.title}.
Prepared response: ${play.response}
Players actually said or did: 
Treat this as hypothetical until I record an outcome.`,
            )
          }
        />
      </div>
    );
  };
  useEffect(() => {
    if (!targetId) return;
    const card = [...(list.current?.querySelectorAll<HTMLElement>('[data-play-id]') || [])].find(
      (el) => el.dataset.playId === targetId,
    );
    requestAnimationFrame(() => {
      card?.scrollIntoView({ block: 'center' });
      card?.querySelector<HTMLButtonElement>('.branch-head')?.focus({ preventScroll: true });
    });
  }, [targetId]);
  return (
    <div className="session-paths" ref={list}>
      <div className="path-search">
        <label>
          <Search size={16} />
          <input
            aria-label="Search prepared paths"
            placeholder="A choice, character, spell, or response…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            maxLength={200}
          />
        </label>
        <select aria-label="Which plays" value={scope} onChange={(e) => setScope(e.target.value)}>
          {['This session', ...(pb ? ['Anytime'] : []), 'All sessions'].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        {pb && (
          <label className="check-label">
            <input
              type="checkbox"
              checked={showBlocked}
              onChange={(e) => setShowBlocked(e.target.checked)}
            />
            Include blocked paths
          </label>
        )}
      </div>
      {scope === 'This session' && sessionScenes.length > 1 && (
        <div className="scene-now" role="group" aria-label="Scene the table is in">
          <span className="eyebrow">NOW</span>
          <button
            className="icon-button"
            aria-label="Previous scene"
            disabled={!nowScene || sessionScenes.indexOf(nowScene) === 0}
            onClick={() => step(-1)}
          >
            <ChevronLeft size={16} />
          </button>
          <select
            aria-label="Current scene"
            value={nowScene}
            disabled={!!query.trim()}
            onChange={(e) => chooseScene(e.target.value)}
          >
            <option value="">Every scene</option>
            {sessionScenes.map((sc) => (
              <option key={sc} value={sc}>
                {sc}
              </option>
            ))}
          </select>
          <button
            className="icon-button"
            aria-label="Next scene"
            disabled={nowScene === sessionScenes[sessionScenes.length - 1]}
            onClick={() => (nowScene ? step(1) : chooseScene(sessionScenes[0]))}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
      <p className="tiny muted" role="status">
        {plays.length} prepared {plays.length === 1 ? 'path' : 'paths'}
        {nowScene
          ? ' · ' + plays.filter((p) => (p.scene || '') === nowScene).length + ' in this scene'
          : ''}
      </p>
      {!plays.length && (
        <div className="empty">
          <p>
            {query
              ? 'No prepared paths match. Try a name or a shorter phrase.'
              : 'Add session notes, then prepare paths.'}
          </p>
        </div>
      )}
      {wide
        ? // Every session's paths: one group per session, the current one open, the rest drawn when opened.
          [...campaign.sessions.map((x) => x.id), 'anytime']
            .map((id) => ({
              id,
              title:
                id === 'anytime'
                  ? 'Anytime'
                  : campaign.sessions.find((x) => x.id === id)?.title || 'Session',
              items: plays.filter((p) => (owner.get(p.id) || 'anytime') === id),
            }))
            .filter((g) => g.items.length)
            .map((g) => (
              <Group
                key={g.id}
                title={g.title}
                size={g.items.length}
                open={g.id === session.id || g.items.some((p) => p.id === targetId)}
              >
                {() => g.items.map(card)}
              </Group>
            ))
        : scenes.map((scene) => {
            const items = plays.filter((p) => (p.scene || '') === scene);
            if (!scene)
              return (
                <div className="branches" key="ungrouped">
                  {items.map(card)}
                </div>
              );
            return (
              <Group
                key={scene}
                title={scene}
                size={items.length}
                open={!nowScene || scene === nowScene || items.some((p) => p.id === targetId)}
              >
                {() => items.map(card)}
              </Group>
            );
          })}
    </div>
  );
}
