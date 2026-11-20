import QuickNavigation from '../components/quick-navigation';
import { CampaignLinks } from '../components/campaign-links';
import ReferencePanel from '../components/reference-panel';
import { Suspense } from 'react';
import SessionRecorder from '../components/session-recorder';
import { isDesktop } from '../lib/transport';
import {
  ArrowLeft,
  Search,
  Compass,
  Sparkles,
  ScrollText,
  ChevronRight,
  Plus,
  Play,
  Check,
  Feather,
  Settings2,
  X,
  CheckCircle2,
} from 'lucide-react';
import { useDesk, DeskContext } from './use-desk';
import { SessionDeskView } from './views/session-desk';
import { CampaignOutlineView } from './views/campaign-outline';
import { PartyView } from './views/party-preferences';
import {
  DiscoveriesView,
  ChronicleView,
  RulesView,
  SavedMaterialView,
  MemoryView,
  ForesightView,
  HubView,
  PlayerSiteView,
  HandoutsView,
} from './views/workspace-views';
import { DialogBody } from './desk-dialogs';

// The shell: the sidebar, top bar, section tabs and dialog frame around the current view.
function HomeScreen() {
  const desk = useDesk();
  const {
    setView,
    backStack,
    referenceId,
    setReferenceId,
    workspaceSections,
    commandOpen,
    setCommandOpen,
    recordingActive,
    setRecordingActive,
    setPlanTitle,
    view,
    ai,
    busy,
    notice,
    error,
    setError,
    campaigns,
    setActive,
    setSessionId,
    ready,
    campaign,
    session,
    saving,
    autoSaved,
    saveAnnouncement,
    update,
    modal,
    setModal,
    live,
    setLive,
    setExpanded,
    setDraft,
    fileRef,
    modalRef,
    closeDialog,
    record,
    importData,
    goBack,
    showReference,
    goTo,
    toggleReference,
    openHit,
    openWorkspace,
    nav,
    areas,
    area,
    pageLabel,
    memory,
    reviewCount,
  } = desk;
  // Until the saved campaigns arrive, show a quiet opening screen instead of flashing the demo campaign's layout.
  if (!ready)
    return (
      <div className="app-opening" role="status" aria-live="polite">
        <span className="app-opening-mark">
          <Compass size={22} />
        </span>
        <p>{error || 'Opening your campaigns…'}</p>
      </div>
    );
  return (
    <DeskContext.Provider value={desk}>
      <CampaignLinks.Provider value={{ pages: memory.pages, onOpen: showReference, onGo: goTo }}>
        <div className={'app ' + (live ? 'live' : '')}>
          <a
            className="skip-link"
            href="#main"
            onClick={(e) => {
              e.preventDefault();
              document.getElementById('main')?.focus();
            }}
          >
            Skip to main content
          </a>
          {commandOpen && (
            <QuickNavigation
              campaign={campaign}
              onOpen={(hit) =>
                hit.kind === 'Wiki'
                  ? showReference(hit.id)
                  : ['Creature', 'Encounter'].includes(hit.kind)
                    ? openWorkspace(hit)
                    : openHit(hit)
              }
              onRule={openWorkspace}
              onClose={() => setCommandOpen(false)}
              actions={[
                ...nav.map(([name]) => ({
                  label:
                    areas
                      .flatMap((a) => a.views.map((v) => ({ ...v, area: a.label })))
                      .find((v) => v.view === name)?.label || name,
                  detail:
                    (
                      {
                        'Session desk': 'Run the current session',
                        Foresight: 'Prep brief, likely plays, world state and forecast',
                        'World wiki': 'People, places, and discoveries',
                        'Session journal': 'Record, transcribe, and review',
                        'Campaign hub': 'Search the campaign and follow connections',
                        'Next session': 'Prepare the next chapter',
                        'Rules library': 'Search offline 5etools spells, creatures and rules',
                      } as Record<string, string>
                    )[name] || 'Open campaign workspace',
                  run: () => setView(name),
                })),
                {
                  label: 'AI & backups',
                  detail: 'Set your Claude key and model, and manage backups',
                  run: () => setModal('data'),
                },
                {
                  label: 'Record an outcome',
                  detail: 'Capture what the players actually did',
                  run: () => record(),
                },
              ]}
            />
          )}
          <aside className="sidebar">
            <a
              className="brand"
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setView('Session desk');
              }}
            >
              <span className="brandmark">
                <Compass size={26} />
              </span>
              <span>
                waypoint<span className="brand-sub">THE DM’S COMPANION</span>
              </span>
            </a>
            <div className="campaign-picker">
              <span className="eyebrow">YOUR CAMPAIGN</span>
              <select
                aria-label="Choose campaign"
                value={campaign.id}
                disabled={!!busy || recordingActive}
                onChange={(e) => {
                  setActive(e.target.value);
                  setSessionId('');
                  setExpanded(null);
                }}
              >
                {campaigns.map((c) => (
                  <option value={c.id} key={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <span className="tiny">
                <span className="dot" /> {campaign.sessions.length} session
                {campaign.sessions.length !== 1 ? 's' : ''} ·{' '}
                {campaign.id === 'demo' ? 'Example campaign' : 'Your story'}
              </span>
            </div>
            <nav aria-label="Main navigation">
              {areas.map((a) => (
                <button
                  key={a.label}
                  className={area === a ? 'navitem active' : 'navitem'}
                  aria-current={area === a ? 'page' : undefined}
                  onClick={() =>
                    setView(
                      workspaceSections.current[campaign.id + ':' + a.label] || a.views[0].view,
                    )
                  }
                >
                  <a.icon size={18} />
                  <span>{a.label}</span>
                  {a.label === 'Journal' && reviewCount > 0 && (
                    <span className="nav-count">{reviewCount}</span>
                  )}
                </button>
              ))}
              <button className="navitem mobile-settings" onClick={() => setModal('data')}>
                <Settings2 size={16} /> Backups
              </button>
            </nav>
            <button
              className="new-campaign"
              disabled={recordingActive}
              onClick={() => setModal('new')}
            >
              <Plus size={17} /> New campaign
            </button>
            <div className="side-bottom">
              <div className="side-note">
                <Feather size={21} />
                <p>
                  The best stories take
                  <br />
                  unexpected turns.
                </p>
              </div>
              <button className="navitem" onClick={() => setModal('data')}>
                <Settings2 size={17} /> AI & backups
              </button>
              <div className="dm-avatar">
                <span>DM</span>
                <div>
                  Your storyteller’s desk
                  <small>
                    {saving
                      ? 'Saving…'
                      : autoSaved
                        ? isDesktop()
                          ? 'Saved on this computer'
                          : 'Saved in this browser'
                        : 'Backup needed'}
                  </small>
                </div>
                <span className="status-dot" />
              </div>
            </div>
          </aside>
          <div className="workspace">
            <header className="topbar">
              <button
                className="icon-button workspace-back"
                aria-label="Back to previous screen"
                title="Back to previous screen"
                disabled={!backStack.length}
                onClick={goBack}
              >
                <ArrowLeft size={18} />
              </button>
              <div className="breadcrumb">
                {campaign.name}
                <ChevronRight size={14} />
                <span>{area.label}</span>
                <ChevronRight size={14} />
                <span>{pageLabel}</span>
              </div>
              <div className="top-actions">
                <button
                  className="button command-trigger"
                  aria-label="Search campaign (Control K)"
                  title="Quick navigation · Ctrl+K"
                  onClick={() => setCommandOpen(true)}
                >
                  <Search size={15} />
                  <span>Search campaign</span>
                  <kbd>Ctrl K</kbd>
                </button>
                <button className="button" onClick={() => setModal('data')}>
                  <span className={'dot ' + (!ai ? 'off' : '')} />
                  AI · {ai ? 'Ready' : 'Not ready'}
                </button>
                <span className="save-status">
                  <Check size={13} />
                  {ready
                    ? saving
                      ? 'Saving…'
                      : autoSaved
                        ? 'All changes saved'
                        : 'Save unavailable'
                    : 'Loading…'}
                </span>
                <button
                  className={'button ' + (live ? 'primary' : '')}
                  onClick={() => {
                    setLive(!live);
                    setView('Session desk');
                  }}
                >
                  <Play size={14} />
                  {live ? 'Exit live mode' : 'Live mode'}
                </button>
              </div>
            </header>
            <main
              id="main"
              tabIndex={-1}
              className={view === 'Rules library' ? 'fill-height' : undefined}
            >
              <div className="page-heading">
                <div>
                  <h1>{area.label}</h1>
                </div>
                {view === 'Session desk' ? (
                  <button
                    className="button primary"
                    onClick={() => {
                      setPlanTitle(session.title);
                      setDraft(session.plan);
                      setModal('plan');
                    }}
                  >
                    <Feather size={15} /> Edit session plan
                  </button>
                ) : view === 'Chronicle' ? (
                  <div className="heading-actions">
                    <button
                      className="button"
                      onClick={() => {
                        setError('');
                        setModal('recap');
                      }}
                    >
                      <ScrollText size={15} /> Import recap
                    </button>
                    <button className="button primary" onClick={() => record()}>
                      <Plus size={16} /> Record an event
                    </button>
                  </div>
                ) : null}
              </div>
              <nav className="workspace-tabs" aria-label={area.label + ' sections'}>
                {area.views.map((item) => (
                  <button
                    key={item.view}
                    className={view === item.view ? 'selected' : ''}
                    aria-current={view === item.view ? 'page' : undefined}
                    onClick={() => setView(item.view)}
                  >
                    {item.label}
                    {item.view === 'Discoveries' && reviewCount > 0 && (
                      <span className="nav-count">{reviewCount}</span>
                    )}
                  </button>
                ))}
              </nav>
              <div className="workspace-context">
                {[
                  'Session desk',
                  'Foresight',
                  'Next session',
                  'Rules library',
                  'Player site',
                  'Party & preferences',
                ].includes(view) && (
                  <label>
                    Session
                    <select
                      aria-label="Current session"
                      disabled={!!busy || recordingActive}
                      value={session.id}
                      onChange={(e) => {
                        setSessionId(e.target.value);
                        setExpanded(null);
                      }}
                    >
                      {campaign.sessions.map((s, i) => (
                        <option key={s.id} value={s.id}>
                          {i + 1} · {s.title}
                          {s.done ? ' ✓' : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
              {error && (
                <div className="alert" role="alert">
                  <span>{error}</span>
                  <button aria-label="Dismiss error" onClick={() => setError('')}>
                    <X size={16} />
                  </button>
                </div>
              )}
              {view === 'Session desk' && <SessionDeskView />}
              {view === 'Campaign' && <CampaignOutlineView />}
              {view === 'Party & preferences' && <PartyView />}
              {view === 'Discoveries' && <DiscoveriesView />}
              {view === 'Chronicle' && <ChronicleView />}
              {view === 'Rules library' && <RulesView />}
              {view === 'Saved material' && <SavedMaterialView />}
              <SessionRecorder
                campaign={campaign}
                sessionId={session.id}
                visible={view === 'Session journal'}
                update={update}
                onActive={setRecordingActive}
              />
              {(view === 'Session journal' || view === 'World wiki' || view === 'Next session') && (
                <MemoryView view={view} />
              )}
              {view === 'Foresight' && <ForesightView />}
              {view === 'Campaign hub' && <HubView />}
              {view === 'Player site' && <PlayerSiteView />}
              {view === 'Player handouts' && <HandoutsView />}
              <footer className="page-footer">
                <span>MADE FOR THE MOMENTS YOU DIDN’T PLAN.</span>
                <span>
                  Waypoint <span>✧</span> Keep the story moving.
                </span>
              </footer>
            </main>
          </div>
          <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
            {notice}
          </div>
          <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
            {saveAnnouncement}
          </div>
          {notice && (
            <div className="toast" aria-hidden="true">
              <CheckCircle2 size={17} />
              {notice}
            </div>
          )}
          {busy && (
            <div className="generating" role="status">
              <Sparkles className="spin" size={17} />{' '}
              {busy === 'campaign'
                ? 'Building your world…'
                : busy === 'next'
                  ? 'Following the threads of your story…'
                  : busy === 'prepare'
                    ? 'Preparing the possibilities…'
                    : 'Finding a spark…'}
              <small>You can keep reading your notes.</small>
              {isDesktop() && (
                <button className="cancel-generation" onClick={() => window.waypoint?.cancel()}>
                  Stop waiting
                </button>
              )}
            </div>
          )}
          {modal && (
            <div
              className="modal-overlay"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget && !busy) closeDialog();
              }}
            >
              <div
                className={'modal ' + (modal === 'card' ? 'wide' : '')}
                ref={modalRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
              >
                <button
                  className="modal-close icon-button"
                  aria-label="Close dialog"
                  onClick={closeDialog}
                >
                  <X size={21} />
                </button>
                <DialogBody />
              </div>
            </div>
          )}
          {referenceId && (
            <ReferencePanel
              key={campaign.id + referenceId}
              campaign={campaign}
              pageId={referenceId}
              onClose={() => setReferenceId(null)}
              onOpen={openWorkspace}
              onPin={toggleReference}
            />
          )}
          <input
            ref={fileRef}
            hidden
            type="file"
            accept=".json,application/json"
            onChange={(e) => importData(e.target.files?.[0])}
          />
        </div>
      </CampaignLinks.Provider>
    </DeskContext.Provider>
  );
}
export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeScreen />
    </Suspense>
  );
}
