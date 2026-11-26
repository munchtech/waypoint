import CampaignHistory from '../../components/campaign-history';
import MaterialLibrary from '../../components/material-library';
import { trackerStatus } from '../../lib/trackers';
import SessionReview from '../../components/session-review';
import { searchCampaign } from '../../lib/campaign-search';
import { lazy, Suspense } from 'react';
import CampaignMemory from '../../components/campaign-memory';
import { memoryOf } from '../../lib/memory';
import { Branch } from '../../lib/campaign';
import { ViewLoading, type View } from '../desk-shared';
import { useDeskContext } from '../use-desk';
const RulesLibrary = lazy(() => import('../../components/rules-library'));
const CampaignHub = lazy(() => import('../../components/campaign-hub'));
const PlayerHandouts = lazy(() => import('../../components/player-handouts'));
const CampaignMaps = lazy(() => import('../../components/campaign-maps'));
const PlayerSite = lazy(() => import('../../components/player-site'));
const Foresight = lazy(() => import('../../components/foresight'));

// Discoveries waiting for review.
export function DiscoveriesView() {
  const { targetHit, campaign, update, openWorkspace, memory } = useDeskContext();
  return (
    <SessionReview
      key={campaign.id + (targetHit?.id || '')}
      initialSourceId={targetHit?.kind === 'Journal' ? targetHit.id : undefined}
      memory={memory}
      sessions={campaign.sessions}
      mutate={(fn) => update((c) => ({ ...c, memory: fn(memoryOf(c)) }))}
      openSource={(id) =>
        openWorkspace(searchCampaign(campaign, '', 'Journal').find((h) => h.id === id)!)
      }
      onOpenPage={(id) =>
        openWorkspace(searchCampaign(campaign, '', 'Wiki').find((h) => h.id === id)!)
      }
    />
  );
}

// The confirmed campaign history.
export function ChronicleView() {
  const {
    setView,
    recordingActive,
    setEventSession,
    busy,
    setSessionId,
    campaign,
    setModal,
    setTab,
    setOutcome,
    setOutcomeStyle,
    setRating,
    setEditingEvent,
    historyFilters,
    setHistoryFilters,
    setHistoryReturn,
    record,
  } = useDeskContext();
  return (
    <CampaignHistory
      campaign={campaign}
      filters={historyFilters}
      onFilters={setHistoryFilters}
      onRecord={() => record()}
      sessionLocked={recordingActive || !!busy}
      onEdit={(e) => {
        setEditingEvent(e.id);
        setEventSession(e.sessionId);
        setOutcome(e.text);
        setOutcomeStyle(e.style);
        setRating(e.enjoyment);
        setModal('outcome');
      }}
      onRemove={(e) => {
        setEditingEvent(e.id);
        setModal('delete-event');
      }}
      onSession={(id) => {
        setHistoryReturn(true);
        setSessionId(id);
        setTab('At the table');
        setView('Session desk');
        window.scrollTo({ top: 0 });
      }}
    />
  );
}

// The rules library.
export function RulesView() {
  const { targetHit, setView, setNotice, campaign, session, updateSession, promptDraft, update } =
    useDeskContext();
  return (
    <Suspense fallback={<ViewLoading />}>
      <RulesLibrary
        key={campaign.id + session.id + (targetHit?.id || '')}
        initialKind={targetHit?.status === 'Creature lookup' ? 'Creature' : undefined}
        initialHomebrew={targetHit?.kind === 'Creature' ? targetHit.id : undefined}
        homebrew={memoryOf(campaign).homebrew}
        onHomebrew={(fn, notice) => {
          update((c) => {
            const m = memoryOf(c);
            return { ...c, memory: { ...m, homebrew: fn(m.homebrew || []) } };
          });
          if (notice) setNotice(notice);
        }}
        initialQuery={targetHit?.kind === 'Rule' ? targetHit.title : undefined}
        initialId={targetHit?.kind === 'Rule' ? targetHit.id : undefined}
        pinned={session.ruleReferences || []}
        onPin={(entry) => {
          updateSession((s) => ({
            ...s,
            ruleReferences: [
              ...(s.ruleReferences || []).filter((r) => r.id !== entry.id),
              entry,
            ].slice(0, 6),
          }));
          setNotice(entry.name + ' pinned to this session.');
        }}
        onPrompt={(entry) => {
          promptDraft.replace(
            `Help me apply ${entry.name} to the current scene. Ask for missing details and distinguish the reference from a suggested ruling.\n\nReference: ${entry.source} (${entry.edition})${entry.page ? ' p. ' + entry.page : ''}\n${entry.body}`,
            'DM response',
          );
          setView('Session desk');
          setNotice('Reference added to your prompt. Review it, then generate when ready.');
        }}
      />
    </Suspense>
  );
}

// Saved ideas and cards.
export function SavedMaterialView() {
  const { setView, campaign, setModal, setCardResult } = useDeskContext();
  return (
    <MaterialLibrary
      key={campaign.id}
      cards={campaign.cards}
      live={(card) => trackerStatus(campaign, card)}
      onOpen={(card) => {
        setCardResult(card);
        setModal('card');
      }}
      onDesk={() => setView('Session desk')}
    />
  );
}

// The session journal, the world wiki editor and next-session planning.
export function MemoryView({ view }: { view: 'Session journal' | 'World wiki' | 'Next session' }) {
  const {
    targetHit,
    setView,
    busy,
    campaign,
    session,
    update,
    seedPage,
    setSeedPage,
    setWikiSeed,
    generate,
    nextSession,
    navigate,
    openWorkspace,
  } = useDeskContext();
  return (
    <CampaignMemory
      key={campaign.id + view + (targetHit?.id || '')}
      campaign={campaign}
      sessionId={session.id}
      section={view}
      initialId={targetHit?.id}
      onReview={(sourceId) =>
        navigate(
          'Discoveries',
          searchCampaign(campaign, '', 'Journal').find((h) => h.id === sourceId) || null,
        )
      }
      onOpenHit={openWorkspace}
      busy={!!busy}
      update={update}
      generate={generate}
      next={nextSession}
      seedPage={seedPage}
      onSeedUsed={() => setSeedPage(null)}
      onSendToWiki={(d) => {
        setWikiSeed(d);
        setView('Player site');
      }}
    />
  );
}

// The Foresight playbook.
export function ForesightView() {
  const {
    setView,
    foresightTab,
    setNotice,
    setError,
    campaign,
    session,
    update,
    setTab,
    setExpanded,
    quickRecord,
    played,
    pinRule,
    openWorkspace,
  } = useDeskContext();
  return (
    <Suspense fallback={<ViewLoading />}>
      <Foresight
        tabRequest={foresightTab}
        onPaths={(id) => {
          const hit = id
            ? searchCampaign(campaign, '', 'Play').find((h) => h.id === id)
            : undefined;
          if (hit) openWorkspace(hit);
          else {
            setView('Session desk');
            setTab('Possibilities');
            setExpanded(null);
          }
        }}
        key={campaign.id + (foresightTab ? '-' + foresightTab.n : '')}
        campaign={campaign}
        session={session}
        update={update}
        onPlayed={played}
        onQuick={(p, sid) => quickRecord(p as Branch, sid)}
        onNavigate={(next) => setView(next as View)}
        onPinRule={(ref) => {
          pinRule(ref);
        }}
        notify={setNotice}
        fail={setError}
      />
    </Suspense>
  );
}

// The campaign reader and search.
export function HubView() {
  const { targetHit, setView, setSessionId, campaign, update, openWorkspace } = useDeskContext();
  return (
    <Suspense fallback={<ViewLoading />}>
      <CampaignHub
        key={campaign.id + (targetHit?.kind || '') + (targetHit?.id || '')}
        initialHit={targetHit}
        onOpenHit={openWorkspace}
        campaign={campaign}
        update={update}
        onNavigate={(next, id) => {
          setView(next as View);
          if (id) setSessionId(id);
        }}
      />
    </Suspense>
  );
}

// The player site.
export function PlayerSiteView() {
  const { setNotice, setError, campaign, session, update, wikiSeed, clearWikiSeed } =
    useDeskContext();
  return (
    <Suspense fallback={<ViewLoading />}>
      <PlayerSite
        key={'site' + campaign.id}
        campaign={campaign}
        session={session}
        update={update}
        notify={setNotice}
        fail={setError}
        seed={wikiSeed}
        onSeedUsed={clearWikiSeed}
      />
    </Suspense>
  );
}

// Player handouts and the player display.
export function HandoutsView() {
  const { targetHit, campaign, update } = useDeskContext();
  return (
    <Suspense fallback={<ViewLoading />}>
      <PlayerHandouts
        key={campaign.id + (targetHit?.id || '')}
        initialId={targetHit?.id}
        campaign={campaign}
        update={update}
      />
    </Suspense>
  );
}

// Map images with pins.
export function MapsView() {
  const { targetHit, campaign, update, openWorkspace } = useDeskContext();
  return (
    <Suspense fallback={<ViewLoading />}>
      <CampaignMaps
        key={campaign.id + (targetHit?.kind === 'Map' ? targetHit.id : '')}
        initial={targetHit?.kind === 'Map' ? targetHit.id : undefined}
        campaign={campaign}
        update={update}
        onOpenPage={(id) => {
          const hit = searchCampaign(campaign, '', 'Wiki').find((h) => h.id === id);
          if (hit) openWorkspace(hit);
        }}
      />
    </Suspense>
  );
}
