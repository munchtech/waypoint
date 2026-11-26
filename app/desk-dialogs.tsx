import SessionEditor, { type SessionEdit, type OutcomeEdit } from '../components/session-editor';
import MentionTextarea from '../components/mention-textarea';
import SessionWrapUp from '../components/session-wrap-up';
import MaterialBody from '../components/material-body';
import InlineMarks from '../components/inline-marks';
import { lazy, Suspense, useState } from 'react';
import AssistantPanel from '../components/assistant-panel';
import RippleDialog from '../components/ripple-dialog';
import { applyChanges } from '../lib/playbook';
import { memoryOf } from '../lib/memory';
import { pageName } from '../lib/page-name';
import { appFetch, isDesktop } from '../lib/transport';
import {
  BookOpen,
  Sparkles,
  ArrowUpRight,
  Check,
  Download,
  Upload,
  Copy,
  Shield,
} from 'lucide-react';
import { uid } from '../lib/campaign';
import { trackerName, trackerStatus } from '../lib/trackers';
import { count } from '../lib/plural';
import { ViewLoading } from './desk-shared';
import { useDeskContext } from './use-desk';
const RecapReview = lazy(() => import('../components/recap-review'));
const AISettings = lazy(() => import('../components/ai-settings'));
const RestorePoints = lazy(() => import('../components/restore-points'));
const UpdateSettings = lazy(() => import('../components/update-settings'));

// The body of the open dialog, chosen by `modal`. The shell draws the overlay, the frame and the close button.
export function DialogBody() {
  const {
    setView,
    recordingActive,
    planTitle,
    eventSession,
    setEventSession,
    aiStatus,
    ai,
    busy,
    setNotice,
    error,
    setError,
    campaign,
    session,
    update,
    updateSession,
    addCopies,
    modal,
    setModal,
    ripplePlay,
    draft,
    outcome,
    setOutcome,
    outcomeStyle,
    setOutcomeStyle,
    rating,
    setRating,
    selectedBranch,
    setSelectedBranch,
    editingEvent,
    setEditingEvent,
    newName,
    setNewName,
    newPremise,
    setNewPremise,
    newParty,
    setNewParty,
    newTone,
    setNewTone,
    newBounds,
    setNewBounds,
    cardResult,
    twist,
    setTwist,
    fileRef,
    generate,
    createCampaign,
    manualCampaign,
    record,
    saveOutcome,
    exportData,
    memory,
    askQuestion,
    setAskQuestion,
    askResult,
    ask,
    assist,
    setAssist,
    proposeChanges,
    showReference,
    setSessionId,
    setLive,
    goTo,
  } = useDeskContext();
  const tracker = cardResult?.tracks ? trackerName(cardResult) : '';
  // The Ask dialog answers a question or, on its second tab, proposes wiki changes for the DM to approve.
  const [askMode, setAskMode] = useState<'ask' | 'assist'>('ask');
  return (
    <>
      {modal === 'ask' && (
        <div className="ask-shell">
          <span className="eyebrow">
            {askMode === 'ask'
              ? 'ANSWERED FROM YOUR WIKI AND HISTORY'
              : 'NOTHING CHANGES UNTIL YOU APPROVE IT'}
          </span>
          <h2 id="modal-title">Ask the campaign</h2>
          <div className="segmented ask-modes" role="group" aria-label="Ask or make changes">
            {(
              [
                ['ask', 'Ask a question'],
                ['assist', 'Make changes'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={askMode === id ? 'selected' : ''}
                aria-pressed={askMode === id}
                onClick={() => setAskMode(id)}
              >
                {label}
              </button>
            ))}
          </div>
          {askMode === 'assist' ? (
            <AssistantPanel
              campaign={campaign}
              update={update}
              ai={ai}
              busy={busy}
              error={error}
              state={assist}
              setState={setAssist}
              propose={proposeChanges}
              onOpenPage={(id) => {
                setModal('');
                showReference(id);
              }}
              onSetup={() => setModal('data')}
            />
          ) : (
            <form
              className="ask-dialog"
              onSubmit={(e) => {
                e.preventDefault();
                void ask();
              }}
            >
              <label>
                Your question
                <MentionTextarea
                  rows={3}
                  maxLength={2000}
                  value={askQuestion}
                  placeholder="Who knows where the bell was cast? What did we promise the ferryman?"
                  onChange={(e) => setAskQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      void ask();
                    }
                  }}
                />
              </label>
              {!ai && (
                <p className="tiny muted">
                  Asking uses Claude. Add your Anthropic API key in{' '}
                  <button type="button" className="text-button" onClick={() => setModal('data')}>
                    AI & backups
                  </button>
                  .
                </p>
              )}
              {error && (
                <p className="error-text" role="alert">
                  {error}
                </p>
              )}
              <div className="modal-actions">
                <button
                  className="button primary"
                  type="submit"
                  disabled={!!busy || !ai || !askQuestion.trim()}
                >
                  <Sparkles size={14} /> {busy === 'ask' ? 'Asking…' : 'Ask'}
                </button>
              </div>
              {askResult && (
                <section className="ask-answer" aria-label="Answer">
                  <span className="eyebrow">{askResult.question}</span>
                  <MaterialBody body={askResult.answer} />
                  {askResult.pages.length ? (
                    <>
                      <h4>Pages used</h4>
                      <ul className="ask-pages">
                        {askResult.pages.map((page) => (
                          <li key={page.id}>
                            <button
                              type="button"
                              className="text-button"
                              onClick={() => {
                                setModal('');
                                showReference(page.id);
                              }}
                            >
                              <BookOpen size={13} />{' '}
                              {pageName({
                                kind: 'Lore' as const,
                                ...memoryOf(campaign).pages.find((p) => p.id === page.id),
                                title: page.title,
                              })}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <p className="tiny muted">No wiki page was used for this answer.</p>
                  )}
                  <p className="tiny muted">
                    Claude’s reading of your notes, not a new fact. Check the pages before relying
                    on it.
                  </p>
                </section>
              )}
            </form>
          )}
        </div>
      )}
      {modal === 'ripple' && ripplePlay && memory.playbook && (
        <RippleDialog
          campaign={campaign}
          session={campaign.sessions.find((s) => s.id === ripplePlay.sessionId) || session}
          pb={memory.playbook}
          play={ripplePlay.play}
          onCancel={() => setModal('')}
          onApply={(changes, rec) => {
            update((c) => {
              const m = memoryOf(c);
              return m.playbook
                ? {
                    ...c,
                    memory: {
                      ...m,
                      playbook: applyChanges(m.playbook, changes, {
                        sessionId: ripplePlay.sessionId,
                        title: ripplePlay.play.title,
                        playId: ripplePlay.play.id,
                      }),
                    },
                  }
                : c;
            });
            if (rec) record(ripplePlay.play, ripplePlay.sessionId);
            else {
              setModal('');
              setNotice(
                changes.length
                  ? 'World state updated. Undo it in Foresight if needed.'
                  : 'Nothing to change.',
              );
            }
          }}
        />
      )}
      {modal === 'recap' && (
        <Suspense fallback={<ViewLoading />}>
          <RecapReview
            sessions={campaign.sessions}
            currentSession={session.id}
            busy={!!busy}
            error={error}
            onGenerate={(text, sessionId) => generate('recap', text, { recapSessionId: sessionId })}
            onSave={(sessionId, events) => {
              update((c) => ({
                ...c,
                events: [
                  ...c.events,
                  ...events.map((e) => ({
                    ...e,
                    id: uid(),
                    sessionId,
                    date: new Date().toISOString(),
                  })),
                ],
              }));
              setModal('');
              setNotice('Reviewed events added to your campaign history.');
            }}
          />
        </Suspense>
      )}
      {modal === 'plan' && (
        <SessionEditor
          key={campaign.id + ':plan:' + session.id}
          draftKey={JSON.stringify([campaign.id, 'plan', session.id])}
          plan
          initial={{ title: planTitle, plan: draft }}
          base={JSON.stringify({ title: session.title, plan: session.plan })}
          sessions={campaign.sessions}
          onClose={() => setModal('')}
          onSave={(value) => {
            const v = value as SessionEdit;
            updateSession((s) => ({
              ...s,
              title: v.title.trim() || s.title,
              plan: v.plan,
            }));
            setModal('');
            setNotice('Session notes saved. Prepare paths to refresh suggestions.');
          }}
        />
      )}
      {modal === 'outcome' && (
        <SessionEditor
          key={campaign.id + ':outcome:' + (editingEvent || session.id)}
          draftKey={JSON.stringify([campaign.id, 'outcome', editingEvent || session.id])}
          plan={false}
          initial={{
            text: outcome,
            sessionId: eventSession || session.id,
            style: outcomeStyle,
            enjoyment: rating,
            branchId: editingEvent
              ? campaign.events.find((e) => e.id === editingEvent)?.branchId
              : selectedBranch || undefined,
          }}
          base={
            editingEvent
              ? JSON.stringify(campaign.events.find((e) => e.id === editingEvent))
              : 'new'
          }
          sessions={campaign.sessions}
          onClose={() => setModal('')}
          onSave={(value) => saveOutcome(value as OutcomeEdit)}
        />
      )}
      {modal === 'new' && (
        <>
          <span className="eyebrow">A NEW WORLD AWAITS</span>
          <h2 id="modal-title">Start a campaign</h2>
          <p>Bring a seed of an idea. Get a flexible campaign arc and a playable first session.</p>
          <label>
            Campaign name
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              maxLength={100}
              placeholder="The stars beneath the sea"
            />
          </label>
          <label>
            Your starting idea
            <textarea
              rows={3}
              value={newPremise}
              onChange={(e) => setNewPremise(e.target.value)}
              placeholder="An island resurfaces every hundred years. This time, it brought someone back…"
              maxLength={10000}
            />
          </label>
          <label>
            The party
            <input value={newParty} onChange={(e) => setNewParty(e.target.value)} />
          </label>
          <div className="two-cols">
            <label>
              Tone
              <select value={newTone} onChange={(e) => setNewTone(e.target.value)}>
                {[
                  'Mysterious & atmospheric',
                  'Heroic & hopeful',
                  'Dark & dangerous',
                  'Whimsical & chaotic',
                  'Political & intricate',
                ].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label>
              Twists
              <select value={twist} onChange={(e) => setTwist(e.target.value)}>
                {['None', 'Subtle', 'Bold'].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Boundaries
            <input
              value={newBounds}
              onChange={(e) => setNewBounds(e.target.value)}
              placeholder="Themes to avoid or handle off-screen"
            />
          </label>
          {(!newName.trim() || !newPremise.trim()) && !busy && (
            <p className="tiny muted" role="status">
              Add a campaign name and a starting idea to continue.
            </p>
          )}
          <button
            className="button primary full"
            disabled={!!busy || !newName.trim() || !newPremise.trim()}
            onClick={createCampaign}
          >
            <Sparkles size={16} />
            {busy === 'campaign' ? 'Creating your campaign…' : 'Create campaign & first session'}
          </button>
          <button
            className="text-button manual-start"
            disabled={!!busy || !newName.trim() || !newPremise.trim()}
            onClick={manualCampaign}
          >
            Or start writing the campaign yourself
          </button>
          {error && (
            <p className="error-text" role="alert">
              {error}
            </p>
          )}
        </>
      )}
      {modal === 'wrap' && (
        <SessionWrapUp
          onReview={() => {
            setModal('');
            setView('Discoveries');
          }}
          campaign={campaign}
          session={session}
          recording={recordingActive}
          update={update}
          onRecord={() => record()}
          onPlan={() => {
            setModal('');
            setView('Next session');
          }}
          next={(() => {
            const after = campaign.sessions[campaign.sessions.indexOf(session) + 1];
            return memory.playbook && after
              ? {
                  label: 'Session ' + (campaign.sessions.indexOf(after) + 1),
                  go: () => {
                    setModal('');
                    setLive(false);
                    setSessionId(after.id);
                    setView('Foresight');
                  },
                }
              : undefined;
          })()}
          onSite={() => {
            setModal('');
            setView('Player site');
          }}
          notify={setNotice}
          fail={setError}
        />
      )}
      {modal === 'card' && cardResult && (
        <>
          <span className="eyebrow">
            {cardResult.kind.toUpperCase()} · {tracker ? 'LIVE TRACKER' : 'SUGGESTED MATERIAL'}
          </span>
          <h2 id="modal-title">{cardResult.title}</h2>
          {tracker && (
            <p className="tracker-live">
              <strong>Waypoint’s count:</strong>{' '}
              {trackerStatus(campaign, cardResult) || 'not set yet'} ({tracker}). The text below is
              the paper copy.
            </p>
          )}
          {cardResult.readAloud && (
            <div className="read-aloud">
              <span className="eyebrow">READ ALOUD</span>
              <blockquote>
                <InlineMarks text={cardResult.readAloud} />
              </blockquote>
            </div>
          )}
          <MaterialBody body={cardResult.body} />
          <h4>Possible consequences</h4>
          <p className="prose">{cardResult.consequence}</p>
          <div className="modal-actions">
            <button
              className="button pin-material"
              onClick={() => {
                updateSession((s) => ({ ...s, pinnedCardId: cardResult.id }));
                setModal('');
                setView('Session desk');
                setNotice('Pinned to this session’s desk.');
              }}
            >
              <BookOpen size={14} />
              Keep on desk
            </button>
            <button
              className="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(
                    `${cardResult.title}\n\n${cardResult.readAloud}\n\n${cardResult.body}\n\n${cardResult.consequence}`,
                  );
                  setNotice('Copied to clipboard.');
                } catch {
                  setError('Clipboard unavailable. Select and copy the text instead.');
                }
              }}
            >
              <Copy size={14} /> Copy
            </button>
            {tracker ? (
              <button
                className="button primary"
                onClick={() => {
                  setModal('');
                  goTo(cardResult.tracks!.place);
                }}
              >
                <ArrowUpRight size={14} /> Open {tracker}
              </button>
            ) : (
              <button
                className="button primary"
                onClick={() => {
                  setEventSession(session.id);
                  setOutcome(cardResult.title + ': ');
                  setOutcomeStyle('Roleplay');
                  setRating('Neutral');
                  setEditingEvent('');
                  setSelectedBranch('');
                  setModal('outcome');
                }}
              >
                <Check size={14} /> Record what happened
              </button>
            )}
          </div>
          <p className="tiny muted">
            {tracker
              ? 'Waypoint updates the count from what you record. Nothing here changes it.'
              : 'Saved in your material library. This idea is not canon until you record an event.'}
          </p>
        </>
      )}
      {modal === 'data' && (
        <>
          <span className="eyebrow">YOUR STORIES, IN YOUR HANDS</span>
          <h2 id="modal-title">AI & backups</h2>
          {isDesktop() && (
            <Suspense fallback={<ViewLoading />}>
              <AISettings onChanged={() => void aiStatus.refresh()} />
            </Suspense>
          )}
          <p>
            {isDesktop()
              ? 'Campaigns and wiki notes save in a local SQLite database. Original JSON saves are preserved during migration. Export a JSON backup to move your campaign; audio files are stored separately in the recordings folder.'
              : 'Campaigns save automatically in this browser. Export a backup before clearing browser data.'}
          </p>
          {!isDesktop() && (
            <div className="info-box">
              <Shield size={20} />
              <p>
                {ai
                  ? 'AI is connected. Generation sends your campaign context to OpenAI. API usage requires active billing on your OpenAI project.'
                  : 'AI is not configured. Previously prepared content and local editing remain available.'}
              </p>
            </div>
          )}
          {!isDesktop() && (
            <a
              className="text-button"
              href="https://platform.openai.com/settings/organization/billing"
              target="_blank"
              rel="noreferrer"
            >
              Manage OpenAI API billing <ArrowUpRight size={13} />
            </a>
          )}
          <div className="modal-actions">
            <button className="button primary" onClick={exportData}>
              <Download size={16} /> Export all campaigns
            </button>
            <button
              className="button"
              disabled={recordingActive}
              onClick={() => fileRef.current?.click()}
            >
              <Upload size={16} /> Import backup
            </button>
          </div>
          {isDesktop() && (
            <button
              className="text-button"
              onClick={async () => {
                const r = await appFetch('/api/export-previous', { method: 'POST' });
                const data = (await r.json()) as { error?: string; saved?: boolean };
                if (!r.ok) setError(data.error || 'Backup export failed');
                else if (data.saved)
                  setNotice(
                    'Previous save exported. Import it as a separate campaign to recover content.',
                  );
              }}
            >
              Export previous database save
            </button>
          )}
          <p className="tiny muted">
            Import adds separate copies and preserves existing campaigns.
          </p>
          {isDesktop() && (
            <Suspense fallback={<ViewLoading />}>
              <RestorePoints
                disabled={recordingActive}
                onError={setError}
                onNotice={setNotice}
                onRestore={(data, when) => {
                  try {
                    const n = addCopies(data as { campaigns?: unknown }, 'restored ' + when);
                    setModal('');
                    setNotice(
                      count(n, 'campaign') + ' from ' + when + ' restored as separate copies.',
                    );
                  } catch (e) {
                    setError(e instanceof Error ? e.message : 'Restore failed.');
                  }
                }}
              />
            </Suspense>
          )}
          {isDesktop() && (
            <Suspense fallback={<ViewLoading />}>
              <UpdateSettings />
            </Suspense>
          )}
        </>
      )}
      {modal === 'delete-event' && (
        <>
          <h2 id="modal-title">Remove this event?</h2>
          <p>
            This will remove it from confirmed history and future generation context. Previously
            generated material will stay unchanged.
          </p>
          <div className="modal-actions">
            <button className="button" onClick={() => setModal('')}>
              Keep event
            </button>
            <button
              className="button primary"
              onClick={() => {
                update((c) => ({
                  ...c,
                  events: c.events.filter((e) => e.id !== editingEvent),
                }));
                setModal('');
                setNotice('Event removed from campaign history.');
              }}
            >
              Remove event
            </button>
          </div>
        </>
      )}
    </>
  );
}
