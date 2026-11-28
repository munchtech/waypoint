'use client';
import { Fragment, useEffect, useMemo, useState } from 'react';
import {
  Compass,
  Printer,
  Copy,
  Pin,
  Search,
  Undo2,
  Plus,
  Check,
  Lock,
  AlertTriangle,
  BookOpen,
  Download,
  Upload,
  FolderOpen,
  Sparkles,
  Minus,
  CornerDownRight,
  Globe,
  Send,
  Feather,
  ArrowRight,
} from 'lucide-react';
import PlayCard from './play-card';
import BookText from './book-text';
import EncounterCard from './encounter-card';
import { appFetch, isDesktop } from '../lib/transport';
import { plainPreview } from '../lib/plain-text';
import { count } from '../lib/plural';
import { referenceOf, type RuleEntry, type RuleReference } from '../lib/rules';
import { memoryOf, type Memory } from '../lib/memory';
import type { Campaign, Session } from '../lib/campaign';
import {
  applyUpdate,
  planUpdate,
  packMatches,
  updatePackSchema,
  type UpdatePack,
} from '../lib/update-pack';
import { dueAfter } from '../lib/player-site';
import { lastWeLeftOff, recapEmpty, recapText } from '../lib/recap';
import LastTime from './last-time';
import { guideSections } from '../lib/session-notes';
import { sendToWiki } from './player-site';
import {
  clockAlerts,
  dependents,
  difficulty,
  echoes,
  encounterXP,
  flagLabel,
  forecast,
  likelihoodWeight,
  partyLevels,
  rankPlays,
  sessionTag,
  setFlag,
  stateOf,
  undoEntry,
  valueLabel,
  type Encounter,
  type Play,
  type Playbook,
} from '../lib/playbook';

type Tab = 'Prep brief' | 'World state' | 'Forecast';
type Props = {
  campaign: Campaign;
  session: Session;
  update: (fn: (c: Campaign) => Campaign) => void;
  onPlayed: (play: Play, sessionId?: string) => void;
  onQuick?: (play: Play, sessionId?: string) => void;
  onNavigate: (view: string) => void;
  onPinRule: (ref: RuleReference) => void;
  notify: (m: string) => void;
  fail: (m: string) => void;
  onPaths: (id?: string) => void;
  // Opens the session plan editor; the Prep page without a playbook works from the plan.
  onEditPlan?: () => void;
  tabRequest?: { tab: string; n: number } | null;
};
const general = [
  'Re-read this chapter and its most likely plays',
  'Choose one faction move to show this session (World state, clocks)',
  'Pick one rumour the party can overhear',
  'Know the voice, want and one secret of the three NPCs most likely to appear',
  'Check the memory ledger: who has paid what, and what is still owed',
  'Decide how you will end: on a question, not a resolution',
];
const sessionLabel = sessionTag;
async function rule<T>(path: string, body: unknown) {
  const r = await appFetch('/api/rules/' + path, { method: 'POST', body: JSON.stringify(body) });
  const data = (await r.json()) as T & { error?: string };
  if (!r.ok) throw new Error(data.error || 'The rules library could not be reached.');
  return data;
}
// Finds a 2024 entry by exact name, preferring the 2024 books, so a brief's rule names and an encounter's base creature open the real text.
async function findRule(name: string, kind?: string) {
  const r = await rule<{ entries: RuleEntry[] }>('search', {
    query: name,
    edition: '2024',
    kind: kind || 'All',
  });
  const exact = r.entries.filter((e) => e.name.toLowerCase() === name.toLowerCase());
  const pick = exact.find((e) => /^X/.test(e.source)) || exact[0];
  if (!pick) throw new Error('“' + name + '” is not in your rules library.');
  return rule<RuleEntry>('entry', { id: pick.id });
}

function UpdateReview({
  campaign,
  pack,
  onDone,
  update,
  notify,
  fail,
}: {
  campaign: Campaign;
  pack: UpdatePack;
  onDone: () => void;
  update: Props['update'];
  notify: Props['notify'];
  fail: Props['fail'];
}) {
  const plan = planUpdate(campaign, pack),
    [chosen, setChosen] = useState(
      () => new Set(plan.filter((p) => p.status === 'ready').map((p) => p.id)),
    ),
    [busy, setBusy] = useState(false);
  const groups = [...new Set(plan.map((p) => p.group))],
    ready = plan.filter((p) => p.status === 'ready' && chosen.has(p.id)).length;
  async function install() {
    setBusy(true);
    try {
      if (isDesktop()) {
        const r = await appFetch('/api/restore-points/keep', { method: 'POST', body: '{}' });
        if (!r.ok)
          throw new Error(
            'Waypoint could not keep a restore point, so nothing was changed. Export a backup and try again.',
          );
      }
      const next = applyUpdate(campaign, pack, chosen);
      update(() => next);
      notify(
        count(ready, 'change') +
          ' installed from ' +
          pack.title +
          '.' +
          (isDesktop() ? ' A restore point was kept first.' : ''),
      );
      onDone();
    } catch (e) {
      fail(e instanceof Error ? e.message : 'The update could not be installed.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="paper update-review" aria-labelledby="update-title">
      <span className="eyebrow">CAMPAIGN UPDATE · REVIEW BEFORE INSTALLING</span>
      <h2 id="update-title">{pack.title}</h2>
      <BookText text={pack.summary} />
      {groups.map((g) => {
        const items = plan.filter((p) => p.group === g);
        return (
          <fieldset key={g} className="update-group">
            <legend>
              {g} <small>{items.filter((i) => i.status === 'ready').length} ready</small>
            </legend>
            {items.map((i) => (
              <label key={i.id} className={'check-label update-item status-' + i.status}>
                <input
                  type="checkbox"
                  disabled={i.status !== 'ready'}
                  checked={i.status === 'ready' && chosen.has(i.id)}
                  onChange={(e) =>
                    setChosen((s) => {
                      const n = new Set(s);
                      if (e.target.checked) n.add(i.id);
                      else n.delete(i.id);
                      return n;
                    })
                  }
                />
                <span>
                  <strong>{i.label}</strong>
                  <small>
                    {i.status === 'applied'
                      ? 'Already in your campaign. '
                      : i.status === 'conflict'
                        ? 'Skipped: your text has changed here, so this edit can’t be placed. '
                        : ''}
                    {i.detail}
                  </small>
                </span>
              </label>
            ))}
          </fieldset>
        );
      })}
      <div className="modal-actions">
        <button className="button" onClick={onDone}>
          Not now
        </button>
        <button className="button primary" disabled={busy || !ready} onClick={() => void install()}>
          <Download size={15} />
          {busy ? 'Installing…' : 'Install ' + count(ready, 'change')}
        </button>
      </div>
      <p className="tiny muted">
        Waypoint keeps a restore point first. Your own notes, map kits, world state and chronicle
        are preserved; replaced wiki text moves to each page’s revision history.
      </p>
    </section>
  );
}

export default function Foresight({
  campaign,
  session,
  update,
  onPlayed,
  onQuick,
  onNavigate,
  onPinRule,
  notify,
  fail,
  onPaths,
  onEditPlan,
  tabRequest,
}: Props) {
  // A `go:world-state` link in session notes opens Foresight on that tab (the app remounts Foresight for each request).
  const requested = (t?: string): t is Tab =>
    !!t && (['Prep brief', 'World state', 'Forecast'] as string[]).includes(t);
  const want = tabRequest?.tab,
    m = memoryOf(campaign),
    pb = m.playbook,
    [tab, setTab] = useState<Tab>(() => (requested(want) ? want : 'Prep brief'));
  const [pack, setPack] = useState<UpdatePack | null>(null),
    [available, setAvailable] = useState<UpdatePack | null>(null),
    [reviewing, setReviewing] = useState(false);
  const mutate = (fn: (m: Memory) => Memory) => update((c) => ({ ...c, memory: fn(memoryOf(c)) }));
  const mutatePb = (fn: (p: Playbook) => Playbook) =>
    mutate((mem) => (mem.playbook ? { ...mem, playbook: fn(mem.playbook) } : mem));
  // The desktop app reads update packs from files: those it ships with and any in the packs folder. A pack is offered
  // only to the campaign it was written for, and only while it has something new. It is read once per campaign.
  const campaignId = campaign.id,
    campaignName = campaign.name;
  useEffect(() => {
    if (!isDesktop()) return;
    let live = true;
    void (async () => {
      const r = await appFetch('/api/packs');
      if (!r.ok) return;
      const { packs } = (await r.json()) as { packs: { id: string; match: UpdatePack['match'] }[] };
      const match = packs.find((p) => packMatches({ id: campaignId, name: campaignName }, p));
      if (!match || !live) return;
      const full = await appFetch('/api/packs/read', {
        method: 'POST',
        body: JSON.stringify({ id: match.id }),
      });
      const parsed = full.ok ? updatePackSchema.safeParse(await full.json()) : null;
      if (live && parsed?.success) setAvailable(parsed.data);
    })().catch(() => {});
    return () => {
      live = false;
    };
  }, [campaignId, campaignName]);
  const offer = useMemo(
    () =>
      available &&
      packMatches(campaign, available) &&
      planUpdate(campaign, available).some((p) => p.status === 'ready')
        ? available
        : null,
    [available, campaign],
  );
  async function importPack(file?: File) {
    if (!file) return;
    try {
      if (file.size > 8000000) throw new Error('Choose an update pack smaller than 8 MB.');
      const parsed = updatePackSchema.safeParse(JSON.parse(await file.text()));
      if (!parsed.success) throw new Error('This file is not a Waypoint update pack.');
      setPack(parsed.data);
      setReviewing(true);
    } catch (e) {
      fail(e instanceof Error ? e.message : 'The update pack could not be read.');
    }
  }
  const importer = (
    <>
      <label className="button">
        <Upload size={15} />
        Import an update pack
        <input
          type="file"
          accept=".json,application/json"
          hidden
          onChange={(e) => {
            void importPack(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </label>
      {isDesktop() && (
        <button
          className="button"
          title="An update pack saved in this folder is offered to its campaign the next time Foresight opens."
          onClick={() => void appFetch('/api/packs/open-folder', { method: 'POST', body: '{}' })}
        >
          <FolderOpen size={15} />
          Open packs folder
        </button>
      )}
    </>
  );
  if (reviewing && (pack || offer))
    return (
      <UpdateReview
        campaign={campaign}
        pack={(pack || offer)!}
        update={update}
        notify={notify}
        fail={fail}
        onDone={() => {
          setReviewing(false);
          setPack(null);
        }}
      />
    );
  const offerBox = offer && (
    <div className="info-box update-offer">
      <Sparkles size={18} />
      <p>
        <strong>{offer.title} is ready to install.</strong> {plainPreview(offer.summary, 240)}
      </p>
      <button className="button primary" onClick={() => setReviewing(true)}>
        Review the update
      </button>
    </div>
  );
  if (!pb) {
    // Without a playbook, Prep works from the DM's own plan: last time, the scenes, then run it.
    const guide = guideSections(session.plan),
      scenes = guide.length
        ? guide
        : [...session.plan.matchAll(/^(?:#{2,3} (.+)|\*\*(Scene \d+[^*]*?)\.?\*\*)\s*$/gm)]
            .map((m) => (m[1] || m[2]).trim())
            .slice(0, 12),
      at = campaign.sessions.findIndex((x) => x.id === session.id) + 1;
    return (
      <div className="foresight">
        {offerBox}
        <section className="paper prep-page">
          <span className="eyebrow">PREP · SESSION {at}</span>
          <h2>{session.title}</h2>
          <LastTime campaign={campaign} session={session} notify={notify} fail={fail} />
          <h3>Your plan</h3>
          {scenes.length ? (
            <ol className="prep-scenes">
              {scenes.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ol>
          ) : session.plan.trim() ? (
            <p className="muted">
              Your plan has no scene headings yet. Add a few to jump between them at the table.
            </p>
          ) : (
            <p className="muted">
              No plan yet. Jot down the opening scene, two or three things that could happen, and
              how you might end.
            </p>
          )}
          <div className="flow-actions">
            {onEditPlan && (
              <button className="button" onClick={onEditPlan}>
                <Feather size={15} /> {session.plan.trim() ? 'Edit session plan' : 'Write the plan'}
              </button>
            )}
            <button className="button primary" onClick={() => onNavigate('Session desk')}>
              Run the session <ArrowRight size={15} />
            </button>
          </div>
        </section>
        <section className="paper foresight-intro">
          <h3>Using a published adventure?</h3>
          <p className="muted">
            Add its update pack to get a prep brief for every session: the plays it is likely to
            bring, the rules they use and what each choice changes later.
          </p>
          <div className="book-actions">{importer}</div>
        </section>
      </div>
    );
  }

  const s = stateOf(pb),
    brief = pb.briefs.find((b) => b.sessionId === session.id),
    levels = partyLevels(m.roster, brief),
    index = campaign.sessions.findIndex((x) => x.id === session.id);
  const ranked = rankPlays(campaign, pb, session.branches),
    likely = ranked.filter((r) => r.possible).slice(0, 5),
    blockedCount = ranked.filter((r) => !r.possible).length;
  // The 2024 DMG's hour of prep: prepare what will probably happen, skim what might, and know where the wildcards are.
  const tiers = [
    { weight: 3, label: 'Prepare fully', hint: 'what will probably happen' },
    { weight: 2, label: 'Skim', hint: 'what might' },
    { weight: 1, label: 'Know where to find', hint: 'the wildcards' },
  ]
    .map((t) => ({
      ...t,
      plays: ranked.filter((r) => r.possible && likelihoodWeight(r.play.likelihood) === t.weight),
    }))
    .filter((t) => t.plays.length);
  const encounters = [
    ...(brief?.encounters || [])
      .map((id) => pb.encounters.find((e) => e.id === id))
      .filter((e): e is Encounter => !!e),
    ...pb.encounters.filter((e) => e.sessionId === session.id && !brief?.encounters.includes(e.id)),
  ];
  const relevant = [
    ...new Set(
      session.branches.flatMap((b) => [...(b.when || []), ...(b.effects || [])].map((c) => c.flag)),
    ),
  ].filter((f) => pb.flags.some((x) => x.id === f));
  const alerts = clockAlerts(pb),
    checks = pb.checks?.[session.id] || [],
    recorded = new Set(campaign.events.map((e) => e.branchId)),
    coming = echoes(campaign, pb).filter((e) => e.sessionId === session.id);
  // What the last session changed in the world, so the brief starts from where the table left off.
  const wikiDue = dueAfter(campaign, session.id);
  const prev = index > 0 ? campaign.sessions[index - 1] : undefined,
    lastTime = prev
      ? pb.log
          .filter((l) => !l.undone && l.sessionId === prev.id)
          .flatMap((l) => l.changes)
          .reverse()
      : [];
  // A spoken recap to open the session with, drafted from what the table recorded last time (lib/recap.ts).
  const recap = prev ? lastWeLeftOff(campaign, prev.id) : null,
    recapShown = recap && !recapEmpty(recap) ? recap : null;
  const toggleCheck = (n: number) =>
    mutatePb((p) => ({
      ...p,
      checks: {
        ...p.checks,
        [session.id]: checks.includes(n) ? checks.filter((x) => x !== n) : [...checks, n],
      },
    }));
  const npcs = (brief?.npcs || '')
    .split(',')
    .map((n) => n.trim())
    .filter(Boolean)
    .map((name) => {
      const key = name
        .toLowerCase()
        .replace(/\(.*?\)/g, '')
        .replace(
          /^(hushman|pilot-mistress|reckoner|master|brother|sister|captain|ser|lady|thane|chancellor)\s+/,
          '',
        )
        .trim();
      const page = m.pages.find((p) =>
        p.kind === 'NPC' || p.kind === 'Character'
          ? (p.title + ' ' + p.aliases).toLowerCase().includes(key)
          : false,
      );
      return { name, page };
    });
  async function pinRules() {
    let pinned = 0;
    for (const name of (brief?.rules || []).slice(0, 6)) {
      try {
        onPinRule(referenceOf(await findRule(name)));
        pinned++;
      } catch {}
    }
    notify(
      pinned
        ? count(pinned, 'rule') + ' pinned to this session.'
        : 'None of tonight’s rules were found in your library.',
    );
  }
  function briefText() {
    return [
      `# ${session.title}`,
      recapShown ? recapText(recapShown) : '',
      brief ? `Pressure: ${brief.pressure}` : '',
      coming.length
        ? `Coming back tonight:\n${coming.map((e) => `- ${e.text} (${sessionLabel(campaign, e.from)}: ${e.play.title})`).join('\n')}`
        : '',
      `Most likely tonight:\n${likely.map((r) => `- ${r.play.title}: ${r.play.response}`).join('\n')}`,
      encounters.length
        ? `Encounters:\n${encounters.map((e) => `- ${e.title}: ${e.creatures.map((c) => c.count + '× ' + c.name + ' (CR ' + c.cr + ')').join(', ')} · ${difficulty(encounterXP(e), levels).band}`).join('\n')}`
        : '',
      brief ? `People: ${brief.npcs}` : '',
      brief ? `End on: ${brief.endOn}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');
  }
  function print() {
    document.body.classList.add('print-brief');
    const done = () => {
      document.body.classList.remove('print-brief');
      window.removeEventListener('afterprint', done);
    };
    window.addEventListener('afterprint', done);
    window.print();
  }
  const groups = [...new Set(pb.flags.map((f) => f.group))];

  return (
    <div className="foresight">
      {offerBox}
      <div className="tabs foresight-tabs" role="group" aria-label="Foresight sections">
        {(['Prep brief', 'World state', 'Forecast'] as Tab[]).map((t) => (
          <button
            key={t}
            className={tab === t ? 'selected' : ''}
            aria-pressed={tab === t}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === 'Prep brief' && (
        <div className="brief-sheet">
          <section className="paper brief-head">
            <div className="section-title">
              <div>
                <span className="eyebrow">
                  PREP BRIEF · {sessionLabel(campaign, session.id).replace(/^S/, 'SESSION ')}
                  {levels.length ? ' · PARTY LEVEL ' + [...new Set(levels)].join('/') : ''}
                </span>
                <h2>{session.title}</h2>
              </div>
              <div className="heading-actions no-print">
                <button
                  className="button"
                  onClick={() => {
                    void navigator.clipboard.writeText(briefText()).then(
                      () => notify('Brief copied as text.'),
                      () => fail('Clipboard unavailable.'),
                    );
                  }}
                >
                  <Copy size={14} />
                  Copy
                </button>
                <button className="button" onClick={print}>
                  <Printer size={14} />
                  Print brief
                </button>
              </div>
            </div>
            {brief ? (
              <p className="brief-pressure">
                <strong>Pressure this session</strong> {brief.pressure}
              </p>
            ) : (
              <p className="muted">
                No brief is prepared for this session. The plays and world state below still apply.
              </p>
            )}
            {relevant.length > 0 && (
              <ul className="state-strip" aria-label="Where things stand">
                {relevant.map((f) => (
                  <li key={f}>
                    <span>{flagLabel(pb, f)}</span>
                    <strong>{valueLabel(pb, f, s[f])}</strong>
                  </li>
                ))}
              </ul>
            )}
            {alerts.length > 0 && (
              <ul className="clock-alerts">
                {alerts.map((a) => (
                  <li key={a.flag.id + a.at} className={a.state}>
                    <AlertTriangle size={13} />
                    <span>
                      <strong>
                        {a.flag.label} {a.value}/{a.flag.max}
                      </strong>{' '}
                      {a.state === 'reached'
                        ? 'reached ' + a.at + ': '
                        : 'one tick from ' + a.at + ': '}
                      {a.text}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {lastTime.length > 0 && (
              <p className="last-time">
                <strong>Last session changed</strong>{' '}
                {[...new Map(lastTime.map((c) => [c.flag, c])).values()]
                  .map((c) => flagLabel(pb, c.flag) + ': ' + valueLabel(pb, c.flag, c.to))
                  .join(' · ')}
              </p>
            )}
            <LastTime campaign={campaign} session={session} notify={notify} fail={fail} />
            {coming.length > 0 && (
              <div className="coming-back">
                <h3>
                  <CornerDownRight size={15} />
                  Coming back tonight
                </h3>
                <p className="tiny muted">
                  Earlier choices this table made that land in this session.
                </p>
                <ul>
                  {coming.map((e) => (
                    <li key={e.play.id + e.text}>
                      <span>{e.text}</span>
                      <small>
                        {sessionLabel(campaign, e.from)} · {e.play.title}
                      </small>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
          <section className="paper">
            <div className="section-title">
              <div>
                <h3>Most likely tonight</h3>
                <p>
                  Ordered by the playbook’s likelihood and your table’s recorded preferences. A
                  preparation order, not a prediction of percentages.
                </p>
              </div>
              <button className="text-button no-print" onClick={() => onPaths()}>
                <Search size={13} />
                All plays
              </button>
            </div>
            {tiers.length > 0 && (
              <div className="prep-hour">
                <h4>Prep in an hour</h4>
                <ul>
                  {tiers.map((t) => (
                    <li key={t.weight}>
                      <strong>{t.label}</strong> <span className="muted">({t.hint})</span>:{' '}
                      {t.plays.map((r, i) => (
                        <Fragment key={r.play.id}>
                          {i > 0 && ' · '}
                          <button
                            type="button"
                            className="wiki-mention"
                            title="Open this play"
                            onClick={() => onPaths(r.play.id)}
                          >
                            {r.play.title}
                          </button>
                        </Fragment>
                      ))}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {likely.map((r) => (
              <PlayCard
                key={r.play.id}
                play={r.play}
                pb={pb}
                label={r.reasons.join(' · ') || undefined}
                open={false}
                recorded={recorded.has(r.play.id)}
                onToggle={() => onPaths(r.play.id)}
                onPlayed={onPlayed}
                onQuick={onQuick}
              />
            ))}
            {!likely.length && (
              <div className="empty">
                <Compass />
                <h3>No plays for this session yet.</h3>
                <p>Prepare paths on the Session desk, or install an update pack.</p>
              </div>
            )}
            {blockedCount > 0 && (
              <p className="tiny muted">
                {count(blockedCount, 'play')} for this session {blockedCount === 1 ? 'is' : 'are'}{' '}
                not possible with the current world state.{' '}
                <button className="text-button" onClick={() => onPaths()}>
                  Show {blockedCount === 1 ? 'it' : 'them'}
                </button>
              </p>
            )}
          </section>
          {encounters.length > 0 && (
            <section className="paper">
              <div className="section-title">
                <div>
                  <h3>Encounters</h3>
                  <p>
                    {levels.length
                      ? 'Difficulty uses the 2024 XP budget for ' +
                        (m.roster?.length
                          ? 'your roster'
                          : 'the expected party: four characters at level ' + levels[0]) +
                        '.'
                      : 'Add your party in Campaign → Party & preferences to calculate 2024 difficulty.'}
                  </p>
                </div>
              </div>
              {encounters.map((e) => (
                <EncounterCard key={e.id} enc={e} pb={pb} levels={levels} />
              ))}
            </section>
          )}
          {wikiDue.length > 0 && (
            <section className="paper">
              <div className="section-title">
                <div>
                  <h3>
                    <Globe size={16} />
                    For the player wiki
                  </h3>
                  <p>
                    Player-safe entries for what the party meets in this session. Send them
                    afterwards; each one rewrites your site.html.
                  </p>
                </div>
                <button className="text-button no-print" onClick={() => onNavigate('Player site')}>
                  All entries
                </button>
              </div>
              <ul className="wiki-list">
                {wikiDue.map((e) => (
                  <li key={e.id}>
                    <div>
                      <strong>{e.title}</strong>
                      <small>{e.kind}</small>
                      <p>{plainPreview(e.body, 140)}</p>
                    </div>
                    <div className="row-actions no-print">
                      <button
                        className="button small"
                        onClick={() =>
                          void sendToWiki(
                            campaign,
                            { id: e.id, title: e.title, kind: e.kind, body: e.body },
                            session.id,
                            { update, notify, fail },
                          )
                        }
                      >
                        <Send size={13} />
                        Send to wiki
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {brief && (
            <div className="content-grid brief-grid">
              <section className="paper">
                <h3>People in play</h3>
                <ul className="npc-list">
                  {npcs.map((n) => (
                    <li key={n.name}>
                      <strong>{n.name}</strong>
                      {n.page ? (
                        <span>{plainPreview(n.page.body, 170)}</span>
                      ) : (
                        <span className="muted">No wiki page yet.</span>
                      )}
                    </li>
                  ))}
                </ul>
                <button className="text-button no-print" onClick={() => onNavigate('World wiki')}>
                  <BookOpen size={13} />
                  Open the world wiki
                </button>
              </section>
              <section className="paper">
                <h3>Before you sit down</h3>
                <ul className="prep-checks">
                  {[
                    ...general.map((t, i) => ({ t, i })),
                    ...brief.checklist.map((t, i) => ({ t, i: 100 + i })),
                  ].map(({ t, i }) => (
                    <li key={i}>
                      <label className="check-label">
                        <input
                          type="checkbox"
                          checked={checks.includes(i)}
                          onChange={() => toggleCheck(i)}
                        />
                        {t}
                      </label>
                    </li>
                  ))}
                </ul>
                {brief.rules.length > 0 && (
                  <>
                    <h4>Rules at hand (2024)</h4>
                    <p className="rule-chips">
                      {brief.rules.map((r) => (
                        <span key={r} className="pill neutral">
                          {r}
                        </span>
                      ))}
                    </p>
                    {isDesktop() && (
                      <button className="button small no-print" onClick={() => void pinRules()}>
                        <Pin size={13} />
                        Pin these to the session
                      </button>
                    )}
                  </>
                )}
                <div className="brief-end">
                  <span className="eyebrow">END ON</span>
                  <blockquote>{brief.endOn}</blockquote>
                </div>
              </section>
            </div>
          )}
        </div>
      )}
      {tab === 'World state' && (
        <div className="world-state">
          {groups.map((g) => (
            <section className="paper" key={g}>
              <h3>{g}</h3>
              <ul className="flag-list">
                {pb.flags
                  .filter((f) => f.group === g)
                  .map((f) => {
                    const d = dependents(campaign, pb, f.id),
                      v = s[f.id];
                    return (
                      <li key={f.id}>
                        <div>
                          <strong>{f.label}</strong>
                          {f.help && <small>{f.help}</small>}
                          <small className="flag-deps">
                            {d.plays.length || d.endings.length
                              ? 'Read by ' +
                                [
                                  d.plays.length ? count(d.plays.length, 'play') : '',
                                  d.endings.length ? count(d.endings.length, 'ending') : '',
                                ]
                                  .filter(Boolean)
                                  .join(' and ')
                              : 'Recorded for reference'}
                          </small>
                        </div>
                        {f.options ? (
                          <select
                            aria-label={f.label}
                            value={String(v)}
                            onChange={(e) =>
                              mutatePb((p) => setFlag(p, f.id, e.target.value, session.id))
                            }
                          >
                            {f.options.map((o) => (
                              <option key={o.id} value={o.id}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="clock-control">
                            <button
                              className="icon-button"
                              aria-label={'Decrease ' + f.label}
                              disabled={Number(v) <= 0}
                              onClick={() =>
                                mutatePb((p) =>
                                  setFlag(p, f.id, Math.max(0, Number(v) - 1), session.id),
                                )
                              }
                            >
                              <Minus size={14} />
                            </button>
                            <span className="clock-value" aria-label={f.label + ' value'}>
                              {Number(v)} / {f.max}
                            </span>
                            <button
                              className="icon-button"
                              aria-label={'Increase ' + f.label}
                              disabled={Number(v) >= (f.max ?? 99)}
                              onClick={() =>
                                mutatePb((p) =>
                                  setFlag(
                                    p,
                                    f.id,
                                    Math.min(f.max ?? 99, Number(v) + 1),
                                    session.id,
                                  ),
                                )
                              }
                            >
                              <Plus size={14} />
                            </button>
                            <meter min={0} max={f.max} value={Number(v)} aria-hidden="true" />
                            {f.thresholds?.map((t) => (
                              <small key={t.at} className={Number(v) >= t.at ? 'reached' : ''}>
                                At {t.at}: {t.text}
                              </small>
                            ))}
                          </div>
                        )}
                      </li>
                    );
                  })}
              </ul>
            </section>
          ))}
          <section className="paper">
            <h3>History</h3>
            <p className="muted">
              Every change, newest first. Undo restores a fact only if nothing has changed it since.
            </p>
            {pb.log.length ? (
              <ul className="state-log">
                {pb.log.slice(0, 80).map((l) => (
                  <li key={l.id} className={l.undone ? 'undone' : ''}>
                    <div>
                      <small>
                        {new Date(l.at).toLocaleString()} · {sessionLabel(campaign, l.sessionId)}
                      </small>
                      <strong>{l.title}</strong>
                      <span>
                        {l.changes
                          .map(
                            (c) =>
                              flagLabel(pb, c.flag) +
                              ': ' +
                              valueLabel(pb, c.flag, c.from) +
                              ' → ' +
                              valueLabel(pb, c.flag, c.to),
                          )
                          .join(' · ')}
                      </span>
                    </div>
                    {l.undone ? (
                      <small>Undone</small>
                    ) : (
                      <button
                        className="text-button"
                        onClick={() => {
                          const r = undoEntry(pb, l.id);
                          mutatePb(() => r.pb);
                          notify(
                            r.kept.length
                              ? 'Undone, except ' +
                                  r.kept.join(', ') +
                                  ', which changed again later.'
                              : 'Change undone.',
                          );
                        }}
                      >
                        <Undo2 size={13} />
                        Undo
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="tiny muted">No changes yet. The world is as the campaign opens.</p>
            )}
          </section>
        </div>
      )}
      {tab === 'Forecast' && (
        <div className="forecast">
          {forecast(pb).map((f) => (
            <section
              key={f.ending.id}
              className={
                'paper ending-card ' + (f.reached ? 'reached ' : '') + (f.open ? 'open' : '')
              }
            >
              <div className="section-title">
                <div>
                  <span className="eyebrow">{f.ending.tone.toUpperCase()}</span>
                  <h3>{f.ending.title}</h3>
                </div>
                <span className="pill neutral">
                  {f.reached
                    ? 'Reached'
                    : f.open
                      ? 'Open now'
                      : f.met + ' of ' + f.reqs.length + ' in place'}
                </span>
              </div>
              <p className="muted">{f.ending.summary}</p>
              <ul className="requirements">
                {f.reqs.map((r) => (
                  <li key={r.label} className={r.met ? 'met' : ''}>
                    {r.met ? <Check size={14} /> : <Lock size={14} />}
                    <div>
                      <strong>{r.label}</strong>
                      {!r.met && r.routes.map((t) => <p key={t}>{t}</p>)}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <section className="paper">
            <h3>Pressure ahead</h3>
            {alerts.length ? (
              <ul className="clock-alerts">
                {alerts.map((a) => (
                  <li key={a.flag.id + a.at} className={a.state}>
                    <AlertTriangle size={13} />
                    <span>
                      <strong>
                        {a.flag.label} {a.value}/{a.flag.max}
                      </strong>{' '}
                      {a.text}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="tiny muted">No clock is within one tick of a threshold.</p>
            )}
            <h3>Open bargains</h3>
            {(m.bargains || [])
              .filter((b) => b.status === 'Open')
              .map((b) => (
                <p key={b.id}>
                  <strong>{b.with}</strong> · {b.terms}
                </p>
              ))}
            {!(m.bargains || []).some((b) => b.status === 'Open') && (
              <p className="tiny muted">No open bargains in the log.</p>
            )}
          </section>
        </div>
      )}
      <div className="foresight-footer no-print">
        {importer}
        <span className="tiny muted">
          {pb.title} · {pb.version}
        </span>
      </div>
    </div>
  );
}
