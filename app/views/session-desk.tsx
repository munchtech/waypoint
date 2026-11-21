import BookText from '../../components/book-text';
import SessionRules from '../../components/session-rules';
import MaterialBody from '../../components/material-body';
import InlineMarks from '../../components/inline-marks';
import TableCoach from '../../components/table-coach';
import SessionPaths from '../../components/session-paths';
import { lazy, Suspense } from 'react';
import TableMarkers from '../../components/table-markers';
import LiveLookup from '../../components/live-lookup';
import NotesBar from '../../components/notes-bar';
import { draftPage, memoryOf } from '../../lib/memory';
import { isDesktop } from '../../lib/transport';
import {
  BookOpen,
  Sparkles,
  ScrollText,
  ChevronRight,
  Plus,
  ArrowUpRight,
  ArrowRight,
  Feather,
  X,
  RefreshCw,
  Shield,
  Dices,
  CheckCircle2,
  Undo2,
  Telescope,
  KeyRound,
} from 'lucide-react';
import { Branch } from '../../lib/campaign';
import { count } from '../../lib/plural';
import { ViewLoading } from '../desk-shared';
import { useDeskContext } from '../use-desk';
const SessionCombat = lazy(() => import('../../components/session-combat'));

// The session desk: the current session’s notes, plays, table tools and history.
export function SessionDeskView() {
  const {
    targetHit,
    setView,
    setPlanTitle,
    setEventSession,
    aiStatus,
    ai,
    busy,
    campaign,
    session,
    update,
    updateSession,
    setModal,
    live,
    setSeedPage,
    setTab,
    expanded,
    setExpanded,
    setDraft,
    setOutcome,
    setOutcomeStyle,
    setRating,
    setEditingEvent,
    setCardResult,
    historyReturn,
    setHistoryReturn,
    pinnedCard,
    promptDraft,
    quick,
    kind,
    setQuick,
    setKind,
    prepare,
    addPath,
    improvise,
    record,
    deskTab,
    deskCard,
    planPlays,
    quickRecord,
    played,
    coachPrompt,
    showReference,
    openWorkspace,
    memory,
  } = useDeskContext();
  return (
    <>
      {historyReturn && (
        <button
          className="button history-return"
          onClick={() => {
            setView('Chronicle');
            setHistoryReturn(false);
          }}
        >
          Back to filtered history
        </button>
      )}
      <div className="desk-grid">
        <section className="desk-main">
          <div className="session-hero">
            <div className="hero-content">
              <div className="hero-label">
                <span className="pill">SESSION {campaign.sessions.indexOf(session) + 1}</span>
                <span>{session.done ? 'Completed' : 'On your horizon'}</span>
              </div>
              <h2>{session.title}</h2>
              <p title={session.summary}>{session.summary}</p>
            </div>
            <div className="session-toolbar">
              <div className="session-end-actions">
                <button className="text-button" onClick={() => record()}>
                  <Plus size={14} />
                  Record what happened
                </button>
                {session.done && (
                  <button
                    className="text-button"
                    onClick={() => updateSession((s) => ({ ...s, done: false }))}
                  >
                    Mark unfinished
                  </button>
                )}
                <button className="text-button wrap-session" onClick={() => setModal('wrap')}>
                  <CheckCircle2 size={15} />
                  {session.done ? 'Review session' : 'Wrap up session'}
                </button>
              </div>
            </div>
            <svg className="folio-compass" viewBox="0 0 260 260" aria-hidden="true">
              <circle cx="130" cy="130" r="110" fill="none" stroke="currentColor" />
              <circle
                cx="130"
                cy="130"
                r="92"
                fill="none"
                stroke="currentColor"
                strokeDasharray="2 9"
              />
              <path
                d="M130 6v248M6 130h248M43 43l174 174M43 217L217 43"
                stroke="currentColor"
                opacity=".5"
              />
              <path
                d="M130 37l18 75 75 18-75 18-18 75-18-75-75-18 75-18z"
                fill="none"
                stroke="currentColor"
              />
              <circle cx="130" cy="130" r="18" fill="none" stroke="currentColor" />
            </svg>
            <div className="hero-illustration" aria-hidden="true" />
            <div className="tower-art" aria-hidden="true">
              <div className="moon" />
              <div className="hill back" />
              <div className="tower">
                <div className="roof" />
                <i />
                <i />
                <div className="door" />
              </div>
              <div className="hill front" />
              <div className="star s1">✧</div>
              <div className="star s2">✦</div>
              <div className="star s3">·</div>
            </div>
          </div>

          <div className="tabs">
            {['Session notes', 'Possibilities', 'Combat', 'At the table', 'Quick help'].map((t) => (
              <button
                className={deskTab === t ? 'selected' : ''}
                aria-pressed={deskTab === t}
                key={t}
                onClick={() => setTab(t)}
              >
                {t}
                {t === 'Possibilities' && <span>{session.branches.length}</span>}
              </button>
            ))}
          </div>
          {pinnedCard && (
            <details className="desk-reference">
              <summary>Pinned reference · {pinnedCard.title}</summary>
              <div className="section-title">
                <div>
                  <span className="eyebrow">ON YOUR DESK · SUGGESTED MATERIAL</span>
                  <h3>{pinnedCard.title}</h3>
                </div>
                <button
                  className="text-button unpin-material"
                  onClick={() => updateSession((s) => ({ ...s, pinnedCardId: undefined }))}
                >
                  <X size={14} />
                  Unpin
                </button>
              </div>
              {pinnedCard.readAloud && (
                <div className="read-aloud">
                  <span className="eyebrow">SAY IT AT THE TABLE</span>
                  <blockquote>
                    <InlineMarks text={pinnedCard.readAloud} />
                  </blockquote>
                </div>
              )}
              <details>
                <summary>Response & possible consequences</summary>
                <MaterialBody body={pinnedCard.body} />
                {pinnedCard.consequence && <p className="prose">{pinnedCard.consequence}</p>}
              </details>
              <button
                className="text-button"
                onClick={() => {
                  setCardResult(pinnedCard);
                  setModal('card');
                }}
              >
                Open full card <ArrowUpRight size={13} />
              </button>
            </details>
          )}
          {live && memory.playbook && (
            <LiveLookup
              campaign={campaign}
              session={session}
              pb={memory.playbook}
              onPlayed={played}
              onQuick={(p, sid) => quickRecord(p as Branch, sid)}
            />
          )}
          {live && (
            <TableMarkers
              campaign={campaign}
              sessionId={session.id}
              update={update}
              onMakePage={(seed) => {
                setSeedPage(draftPage(seed));
                setView('World wiki');
              }}
              compact
            />
          )}
          {deskTab === 'Possibilities' && (
            <>
              {campaign.events.some((e) => e.sessionId === session.id) && (
                <div className="choice-follow-through">
                  <div>
                    <span className="eyebrow">THE STORY HAS MOVED</span>
                    <strong>
                      {count(
                        campaign.events.filter((e) => e.sessionId === session.id).length,
                        'choice',
                      )}{' '}
                      recorded this session
                    </strong>
                    <p>
                      Preparation uses confirmed outcomes and enjoyment feedback. Refresh paths when
                      you want new suggestions.
                    </p>
                  </div>
                  <div>
                    <button className="text-button" onClick={() => setTab('At the table')}>
                      Review choices <ArrowUpRight size={14} />
                    </button>
                  </div>
                </div>
              )}
              <div className="section-title">
                <div>
                  <h3>The paths they might take</h3>
                  <p>
                    Possibilities to prepare for, never a script to follow.
                    {memory.playbook && (
                      <>
                        {' '}
                        <button className="text-button" onClick={() => setView('Foresight')}>
                          <Telescope size={13} />
                          Prep brief and world state
                        </button>
                      </>
                    )}
                  </p>
                </div>
                <div className="path-actions">
                  {session.branches.length > 0 && (
                    <button
                      className="text-button"
                      disabled={!!busy || !session.plan.trim()}
                      title="Keep these paths and add one the players might take instead"
                      onClick={addPath}
                    >
                      <Plus size={14} className={busy === 'path' ? 'spin' : ''} />
                      {busy === 'path' ? 'Adding…' : 'Add one path'}
                    </button>
                  )}
                  <button
                    className="text-button"
                    disabled={!!busy || !session.plan.trim()}
                    onClick={prepare}
                  >
                    <RefreshCw size={14} className={busy === 'prepare' ? 'spin' : ''} />
                    {busy === 'prepare' ? 'Preparing…' : 'Prepare paths'}
                  </button>
                </div>
              </div>
              <SessionPaths
                key={campaign.id + session.id}
                campaign={campaign}
                session={session}
                expanded={expanded}
                onExpand={setExpanded}
                onPlayed={(p, sid) => played(p as Branch, sid)}
                onQuick={(p, sid) => quickRecord(p as Branch, sid)}
                onAdapt={coachPrompt}
                targetId={targetHit?.kind === 'Play' ? targetHit.id : undefined}
                hideSearch={live && !!memory.playbook}
              />
              <button className="unexpected" onClick={() => record()}>
                <span className="unexpected-icon">
                  <Dices size={21} />
                </span>
                <span>
                  <strong>They did something else. Of course they did.</strong>
                  <small>Capture the unexpected and let the campaign follow.</small>
                </span>
                <Plus size={18} />
              </button>
            </>
          )}
          {deskTab === 'Combat' && (
            <Suspense fallback={<ViewLoading />}>
              <SessionCombat
                key={campaign.id + session.id + (targetHit?.id || '')}
                campaign={campaign}
                session={session}
                target={targetHit}
                onBrowse={(name) =>
                  openWorkspace({
                    id: '',
                    kind: 'Rule',
                    title: name || '',
                    body: '',
                    status: 'Creature lookup',
                    date: '',
                    score: 0,
                  })
                }
              />
            </Suspense>
          )}
          {deskTab === 'Quick help' && <TableCoach campaign={campaign} onPrompt={coachPrompt} />}
          {deskTab === 'Session notes' && (
            <section className="paper">
              <div className="section-title">
                <h3>Your session plan</h3>
                <button
                  className="text-button"
                  onClick={() => {
                    setPlanTitle(session.title);
                    setDraft(session.plan);
                    setModal('plan');
                  }}
                >
                  <Feather size={15} /> Edit
                </button>
              </div>
              <NotesBar
                key={session.id}
                sessionId={session.id}
                plan={session.plan}
                roster={memoryOf(campaign).roster || []}
                onRecord={() => record()}
              />
              <BookText text={session.plan} plays={planPlays} linkEvery />
              <p className="muted tiny">
                Planned material. Record actual events separately in the chronicle.
              </p>
            </section>
          )}
          {deskTab === 'At the table' && !live && (
            <TableMarkers
              campaign={campaign}
              sessionId={session.id}
              update={update}
              onMakePage={(seed) => {
                setSeedPage(draftPage(seed));
                setView('World wiki');
              }}
            />
          )}
          {deskTab === 'At the table' && (
            <section className="paper">
              <div className="section-title">
                <h3>What’s happened this session</h3>
                <button className="text-button" onClick={() => record()}>
                  <Plus size={15} /> Record what happened
                </button>
              </div>
              {campaign.events.filter((e) => e.sessionId === session.id).length ? (
                campaign.events
                  .filter((e) => e.sessionId === session.id)
                  .map((e) => (
                    <div className="timeline-item" key={e.id}>
                      <span className="timeline-dot" />
                      <strong>
                        {e.style} · {e.enjoyment}
                      </strong>
                      <p>{e.text}</p>
                      <button
                        className="text-button"
                        onClick={() => {
                          setEditingEvent(e.id);
                          setEventSession(e.sessionId);
                          setOutcome(e.text);
                          setOutcomeStyle(e.style);
                          setRating(e.enjoyment);
                          setModal('outcome');
                        }}
                      >
                        Edit details
                      </button>
                    </div>
                  ))
              ) : (
                <div className="empty">
                  <ScrollText />
                  <h3>The page is yours.</h3>
                  <p>Record a choice from a path card, or add something unexpected.</p>
                </div>
              )}
              <div className="flow-actions">
                <button className="button" onClick={() => setView('Discoveries')}>
                  Review discoveries <ArrowRight size={15} />
                </button>
                <button className="button primary" onClick={() => setView('Next session')}>
                  Plan next session <ArrowRight size={15} />
                </button>
              </div>
            </section>
          )}
        </section>
        <aside className="right-rail">
          {live && deskCard && (
            <section className="paper rail-card" aria-label="Table card">
              <BookText text={deskCard} />
            </section>
          )}
          {deskTab === 'Quick help' ? (
            <section
              className={'improv-panel ' + (deskTab === 'Quick help' ? '' : 'improv-collapsed')}
            >
              <div className="section-title">
                <h3>
                  <Sparkles size={18} />
                  Create an idea
                </h3>
                <span className="spark-emblem">
                  <Sparkles size={20} />
                </span>
              </div>
              <p>
                When the party goes off the map.
                <br />
                Make something that fits your world.
              </p>
              {isDesktop() && (
                <div className={'inspiration-engine ' + (ai ? 'is-ready' : '')} aria-live="polite">
                  <div>
                    <span className={'dot ' + (!ai ? 'off' : '')} />
                    <strong>
                      {ai
                        ? 'Claude is connected'
                        : aiStatus.state === 'checking'
                          ? 'Checking AI…'
                          : 'Claude needs an API key'}
                    </strong>
                  </div>
                  <p>
                    {ai
                      ? 'Uses your campaign and confirmed events.'
                      : 'Add your Anthropic API key to create new ideas. Saved material is always available.'}
                  </p>
                  {ai && <small title={aiStatus.model}>{aiStatus.model}</small>}
                  {!ai && aiStatus.state !== 'checking' && (
                    <button className="button engine-start" onClick={() => setModal('data')}>
                      <KeyRound size={14} />
                      Add API key
                    </button>
                  )}
                  <button className="engine-settings" onClick={() => setModal('data')}>
                    {ai ? 'Model & key settings' : 'AI settings'}
                    <ArrowUpRight size={12} />
                  </button>
                </div>
              )}
              <div className="chips">
                {['DM response', 'NPC', 'Encounter', 'Location', 'Clue', 'Loot', 'Twist'].map(
                  (k) => (
                    <button
                      key={k}
                      className={kind === k ? 'chosen' : ''}
                      aria-pressed={kind === k}
                      onClick={() => {
                        setKind(k);
                        if (k === 'Twist' && !quick)
                          setQuick(
                            'Suggest a foreshadowed twist that builds on our confirmed events.',
                          );
                      }}
                    >
                      {k}
                    </button>
                  ),
                )}
              </div>
              <label className="sr-only" htmlFor="quick-prompt">
                What do you need right now?
              </label>
              <textarea
                id="quick-prompt"
                value={quick}
                onChange={(e) => setQuick(e.target.value)}
                maxLength={10000}
                placeholder={
                  kind === 'NPC'
                    ? 'A nervous apothecary who knows more than they let on…'
                    : `What kind of ${kind.toLowerCase()} do you need?`
                }
                rows={4}
              />
              <div className="prompt-draft-status">
                <span>
                  {promptDraft.failure ? 'Draft not saved' : 'Draft saved for this session'}
                </span>
                {promptDraft.canUndo && (
                  <button onClick={promptDraft.undo}>
                    <Undo2 size={12} />
                    Restore previous prompt
                  </button>
                )}
              </div>
              {promptDraft.failure && (
                <p role="alert" className="engine-error">
                  {promptDraft.failure}
                </p>
              )}
              <button
                className="button primary full"
                disabled={!!busy || !quick.trim() || (isDesktop() && !ai)}
                onClick={improvise}
              >
                <Sparkles size={15} />
                {busy === 'improvise'
                  ? 'Finding your spark…'
                  : isDesktop() && !ai
                    ? 'Add an API key first'
                    : `Generate ${kind === 'NPC' ? 'NPC' : kind.toLowerCase()}`}
                <ArrowRight size={15} />
              </button>
              <div className="context-line">
                <span className={'dot ' + (!ai ? 'off' : '')} />
                {isDesktop()
                  ? ai
                    ? 'Sent to Anthropic when you generate'
                    : 'Add an API key above to generate'
                  : ai
                    ? 'Uses your campaign & confirmed events'
                    : 'AI connection pending'}
              </div>
            </section>
          ) : null}
          {campaign.cards.length > 0 && (
            <section className="recent-material">
              <div className="section-title">
                <h3>Within reach</h3>
                <button className="text-button" onClick={() => setView('Saved material')}>
                  View all <ArrowUpRight size={13} />
                </button>
              </div>
              <p>Recent ideas · ready with AI off</p>
              {campaign.cards.slice(0, 3).map((card) => (
                <button
                  className="recent-material-item"
                  key={card.id}
                  onClick={() => {
                    setCardResult(card);
                    setModal('card');
                  }}
                >
                  <span>
                    <small>{card.kind}</small>
                    <strong>{card.title}</strong>
                  </span>
                  <ChevronRight size={16} />
                </button>
              ))}
            </section>
          )}
          {(memory.pins || []).some((id) => memory.pages.some((page) => page.id === id)) && (
            <section className="paper handy-references">
              <h3>
                <BookOpen size={16} />
                Kept handy
              </h3>
              {memory.pages
                .filter((page) => memory.pins?.includes(page.id))
                .slice(0, 8)
                .map((page) => (
                  <button
                    className="session-list-item"
                    key={page.id}
                    onClick={() => showReference(page.id)}
                  >
                    <span>
                      <small>
                        {page.kind} · {page.status}
                      </small>
                      <strong>{page.title}</strong>
                    </span>
                    <ArrowUpRight size={14} />
                  </button>
                ))}
            </section>
          )}
          <SessionRules
            references={session.ruleReferences || []}
            onRemove={(id) =>
              updateSession((s) => ({
                ...s,
                ruleReferences: (s.ruleReferences || []).filter((r) => r.id !== id),
              }))
            }
            onBrowse={() => setView('Rules library')}
          />
          <div className="rail-footer">
            <Shield size={13} /> Your world. Your final say.
          </div>
        </aside>
      </div>
    </>
  );
}
