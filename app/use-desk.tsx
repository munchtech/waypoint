import { useAIStatus } from '../components/use-ai-status';
import { useSessionPrompt } from '../components/use-session-prompt';
import { type OutcomeEdit } from '../components/session-editor';
import { emptyHistory, type HistoryFilters } from '../components/campaign-history';
import { generationContext } from '../lib/ai-context';
import { rememberItem } from '../lib/recent-items';
import { searchCampaign, type SearchHit } from '../lib/campaign-search';
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  createContext,
  useContext,
} from 'react';
import { type WikiDraft } from '../lib/player-site';
import { applyChanges, resolveEffects } from '../lib/playbook';
import { tableCard } from '../lib/session-notes';
import { type RuleReference } from '../lib/rules';
import PlayCard from '../components/play-card';
import { memoryOf, type WikiPage } from '../lib/memory';
import { type GoPlace } from '../lib/go-links';
import { appFetch, isDesktop } from '../lib/transport';
import {
  FileText,
  BookOpen,
  Compass,
  Sparkles,
  Users,
  ScrollText,
  Map,
  CheckCircle2,
  Telescope,
  LibraryBig,
} from 'lucide-react';
import { Campaign, Session, Branch, Card, Event, Style, uid } from '../lib/campaign';
import { scrollToId, type View, type Visit, type Packet } from './desk-shared';
import { deskPlace, justJumped, placeOf, scrollToPlace } from '../lib/scroll-place';
import { useCampaignStore } from './use-campaign-store';

// The desk controller: what the shell, the views and the dialogs share — navigation, the open dialog, drafts, and the
// actions that generate, record and import. The campaigns themselves live in the campaign store.
export function useDesk() {
  const [targetHit, setTargetHit] = useState<SearchHit | null>(null);
  const setView = (next: View) => navigate(next);
  const [navigationRevision, setNavigationRevision] = useState(0);
  const [backStack, setBackStack] = useState<Visit[]>([]),
    [referenceId, setReferenceId] = useState<string | null>(null);
  const restoreScroll = useRef<number | null>(null),
    returning = useRef(false),
    workspaceSections = useRef<Record<string, View>>({});
  // A `go:` link in session notes asks for a place: a section to scroll to after navigating, or a Foresight tab to open on.
  const scrollTarget = useRef<string | null>(null),
    [foresightTab, setForesightTab] = useState<{ tab: string; n: number } | null>(null);
  const [commandOpen, setCommandOpen] = useState(false);
  const [recordingActive, setRecordingActive] = useState(false);
  const [planPlay, setPlanPlay] = useState<string | null>(null);
  const [planTitle, setPlanTitle] = useState('');
  const [eventSession, setEventSession] = useState('');
  const [view, setViewState] = useState<View>('Session desk');
  const aiStatus = useAIStatus();
  const ai = aiStatus.ready;
  const [busy, setBusy] = useState('');
  // What the running generation is writing now, streamed from the desktop app ("Writing path 2: …").
  const [progress, setProgress] = useState('');
  useEffect(() => window.waypoint?.onProgress?.(setProgress), []);
  const [askQuestion, setAskQuestion] = useState('');
  const [askResult, setAskResult] = useState<Answer | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const {
    campaigns,
    setCampaigns,
    active,
    setActive,
    sessionId,
    setSessionId,
    ready,
    campaign,
    session,
    saving,
    autoSaved,
    saveAnnouncement,
    update,
    updateSession,
    addCopies,
  } = useCampaignStore(setError);
  const [modal, setModal] = useState('');
  const [live, setLive] = useState(false);
  const [seedPage, setSeedPage] = useState<WikiPage | null>(null);
  const [wikiSeed, setWikiSeed] = useState<WikiDraft | null>(null);
  const clearWikiSeed = useCallback(() => setWikiSeed(null), []);
  const [ripplePlay, setRipplePlay] = useState<{ play: Branch; sessionId: string } | null>(null);
  useEffect(() => {
    document.querySelector('.sidebar .navitem.active')?.scrollIntoView({ block: 'nearest' });
  }, [view]);
  const [tab, setTabState] = useState(() => {
    try {
      return localStorage.getItem('waypoint-desk-tab') || '';
    } catch {
      return '';
    }
  });
  // The desk remembers the tab you last used (per computer); with none saved, a session that has a guide opens on its notes.
  const setTab = (t: string) => {
    setTabState(t);
    try {
      localStorage.setItem('waypoint-desk-tab', t);
    } catch {}
  };
  const [expanded, setExpanded] = useState<string | null>('b1');
  const [draft, setDraft] = useState('');
  const [outcome, setOutcome] = useState('');
  const [outcomeStyle, setOutcomeStyle] = useState<Style>('Roleplay');
  const [rating, setRating] = useState<Event['enjoyment']>('Neutral');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [editingEvent, setEditingEvent] = useState('');
  const [newName, setNewName] = useState('');
  const [newPremise, setNewPremise] = useState('');
  const [newParty, setNewParty] = useState('Four adventurers, level 3');
  const [newTone, setNewTone] = useState('Mysterious & atmospheric');
  const [newBounds, setNewBounds] = useState('');
  const [cardResult, setCardResult] = useState<Card | null>(null);
  const [historyFilters, setHistoryFilters] = useState<HistoryFilters>({ ...emptyHistory });
  const [historyReturn, setHistoryReturn] = useState(false);
  const [historyFor, setHistoryFor] = useState(active);
  if (historyFor !== active) {
    setHistoryFor(active);
    setHistoryFilters({ ...emptyHistory });
    setHistoryReturn(false);
    setBackStack([]);
    setReferenceId(null);
    setTargetHit(null);
  }
  const [twist, setTwist] = useState('Subtle');
  const fileRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const requestLock = useRef(false);
  const deskScroll = useEffectEvent(() => placeOf(deskPlace(campaign.id, session.id, deskTab)));
  useEffect(() => {
    const kept = returning.current ? deskScroll() : 0,
      top = restoreScroll.current ?? kept ?? 0,
      target = scrollTarget.current;
    returning.current = false;
    restoreScroll.current = null;
    scrollTarget.current = null;
    requestAnimationFrame(() => {
      if (target) {
        scrollToId(target);
        return;
      }
      if (!justJumped()) scrollToPlace(top);
      document.querySelector('main')?.focus({ preventScroll: true });
    });
  }, [navigationRevision, campaign.id]);
  const pinnedCard = campaign.cards.find((card) => card.id === session.pinnedCardId);
  const promptDraft = useSessionPrompt(campaign.id, session.id);
  const { quick, kind, setQuick, setKind } = promptDraft;
  useEffect(() => {
    const timer = setTimeout(() => {
      void import('../components/rules-library');
      void import('../components/campaign-hub');
      void import('../components/player-handouts');
      void import('../components/book-text-render');
      void import('../components/recap-review');
      void import('../components/ai-settings');
    }, 1500);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 4000);
    return () => clearTimeout(t);
  }, [notice]);
  function closeDialog() {
    if (modalRef.current?.querySelector('[data-unsaved-draft="true"]')) {
      setNotice(
        'Draft storage is unavailable. Save, retry draft storage, or explicitly discard your edits.',
      );
      return;
    }
    setModal('');
  }
  useEffect(() => {
    if (!modal) return;
    const old = document.activeElement as HTMLElement;
    const el = modalRef.current;
    setTimeout(() => {
      const fields = [
        ...(el?.querySelectorAll<HTMLElement>(
          '[data-autofocus],input:not([type=hidden]):not([disabled]),textarea:not([disabled]),select:not([disabled])',
        ) || []),
      ].filter((n) => n.getClientRects().length);
      (
        fields[0] ||
        el?.querySelector<HTMLElement>('button:not(.modal-close):not([disabled])') ||
        el?.querySelector<HTMLElement>('.modal-close')
      )?.focus();
    }, 20);
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) closeDialog();
      if (e.key === 'Tab') {
        const nodes = el?.querySelectorAll<HTMLElement>(
          'button:not([disabled]),input,textarea,select,[tabindex="0"]',
        );
        if (!nodes?.length) return;
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', fn);
    return () => {
      document.removeEventListener('keydown', fn);
      old?.focus();
    };
  }, [modal]);
  async function generate<T = Packet>(
    mode: string,
    prompt: string,
    extra: Record<string, unknown> = {},
  ): Promise<T | null> {
    if (requestLock.current) return null;
    requestLock.current = true;
    setBusy(mode);
    setProgress('');
    setError('');
    try {
      if (isDesktop() && !(await aiStatus.refresh())) {
        setError(
          'This action uses Claude. Add your Anthropic API key below. Your draft is still here.',
        );
        setModal('data');
        return null;
      }
      const r = await appFetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          prompt,
          kind,
          context:
            mode === 'campaign' ? extra : generationContext(campaign, session, mode, prompt, extra),
        }),
      });
      const data = (await r.json()) as T & { error?: string };
      if (!r.ok) throw new Error(data.error || 'Generation failed. Please try again.');
      return data as T;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not connect. Try again.');
      return null;
    } finally {
      setBusy('');
      setProgress('');
      requestLock.current = false;
    }
  }
  // Ask the campaign: a plain answer from the wiki, the chronicle and the sessions, naming the pages it used.
  async function ask() {
    const question = askQuestion.trim();
    if (!question) return;
    const answer = await generate<Omit<Answer, 'question'>>('ask', question);
    if (answer) setAskResult({ question, answer: answer.answer, pages: answer.pages || [] });
  }
  // One more path for the current session, different from the ones already there; the others are kept.
  async function addPath() {
    const p = await generate('path', session.plan);
    if (p?.branches[0]) {
      const path = { ...p.branches[0], id: uid(), origin: 'ai' as const };
      updateSession((s) => ({ ...s, branches: [...s.branches, path] }));
      setExpanded(path.id);
      setNotice('Path added: ' + path.title + '. Nothing is canon until you record it.');
    }
  }
  async function prepare() {
    const p = await generate('prepare', session.plan);
    if (p) {
      updateSession((s) => ({
        ...s,
        summary: p.summary,
        branches: [
          ...s.branches.filter((b) => b.origin === 'playbook'),
          ...p.branches.map((b) => ({ ...b, id: uid(), origin: 'ai' as const })),
        ],
        source: 'AI prepared',
      }));
      setExpanded(null);
      setNotice('Possibilities are ready. Nothing is canon until you record it.');
    }
  }
  async function improvise() {
    if (!quick.trim()) return;
    const p = await generate('improvise', quick, {
      requestedKind: kind,
      twistIntensity: campaign.twist,
    });
    if (p) {
      const card = { ...p.cards[0], id: uid(), source: 'AI generated' };
      setCardResult(card);
      update((c) => ({ ...c, cards: [card, ...c.cards] }));
      setModal('card');
      setNotice('Saved to your material library.');
    }
  }
  async function nextSession() {
    const p = await generate(
      'next',
      'Create the next session, following what actually happened and what the party enjoyed.',
    );
    if (p) {
      const s: Session = {
        id: uid(),
        title: p.title,
        plan: p.plan,
        summary: p.summary,
        branches: p.branches.map((b) => ({ ...b, id: uid() })),
        source: 'AI prepared',
        done: false,
      };
      update((c) => ({ ...c, sessions: [...c.sessions, s] }));
      setSessionId(s.id);
      setView('Session desk');
      setTab('Possibilities');
      setNotice('Next session drafted from your campaign history.');
    }
  }
  async function createCampaign() {
    if (!newPremise.trim() || !newName.trim()) return;
    const p = await generate('campaign', newPremise, {
      name: newName,
      party: newParty,
      tone: newTone,
      boundaries: newBounds,
      twist,
    });
    if (p) {
      const s: Session = {
        id: uid(),
        title: p.title,
        plan: p.plan,
        summary: p.summary,
        branches: p.branches.map((b) => ({ ...b, id: uid() })),
        source: 'AI prepared',
        done: false,
      };
      const c: Campaign = {
        id: uid(),
        name: newName,
        premise: newPremise,
        party: newParty,
        tone: newTone,
        boundaries: newBounds,
        twist,
        arc: p.arc,
        preferences: { Roleplay: 3, Exploration: 3, Combat: 3, Mischief: 3 },
        events: [],
        cards: [],
        sessions: [s],
      };
      setCampaigns((cs) => [...cs, c]);
      setActive(c.id);
      setSessionId(s.id);
      setModal('');
      setView('Session desk');
      setNotice('Your campaign and first session are ready.');
    }
  }
  function manualCampaign() {
    if (!newName.trim() || !newPremise.trim()) return;
    const s: Session = {
      id: uid(),
      title: 'The first chapter',
      plan: '',
      summary: 'An unwritten adventure awaits.',
      branches: [],
      source: 'DM written',
      done: false,
    };
    const c: Campaign = {
      id: uid(),
      name: newName.trim(),
      premise: newPremise,
      party: newParty,
      tone: newTone,
      boundaries: newBounds,
      twist,
      arc: '',
      preferences: { Roleplay: 3, Exploration: 3, Combat: 3, Mischief: 3 },
      events: [],
      cards: [],
      sessions: [s],
    };
    setCampaigns((cs) => [...cs, c]);
    setActive(c.id);
    setSessionId(s.id);
    setView('Campaign');
    setModal('');
    setNotice('Campaign created. Add your outline and session notes.');
  }
  function record(branch?: Branch, sid?: string) {
    setEditingEvent('');
    setEventSession(sid || session.id);
    setSelectedBranch(branch?.id || '');
    setOutcome(branch ? `${branch.title}.` : '');
    setOutcomeStyle(branch?.style || 'Roleplay');
    setRating('Neutral');
    setModal('outcome');
  }
  // A prepared play with tracked effects or later consequences opens the ripple review first; others go straight to the outcome editor.
  const deskTab =
      tab || (session.plan.includes('## Running this session') ? 'Session notes' : 'Possibilities'),
    deskCard = tableCard(session.plan);
  // A play a session plan links to (`play:<id>`) opens in place in the notes. Ids may have been renamed with the DM's text (Tongue → Heart).
  const planPlays = {
    open: planPlay,
    toggle: (id: string) => setPlanPlay((p) => (p === id ? null : id)),
    render: (id: string) => {
      const all = [...session.branches, ...(memoryOf(campaign).playbook?.anytime || [])],
        play =
          all.find((b) => b.id === id) || all.find((b) => b.id === id.replace(/heart/g, 'tongue'));
      return play ? (
        <PlayCard
          play={play}
          pb={memoryOf(campaign).playbook}
          open
          recorded={campaign.events.some((e) => e.branchId === play.id)}
          onToggle={() => setPlanPlay(null)}
          onPlayed={(p) => played(p as Branch)}
          onQuick={(p) => quickRecord(p as Branch)}
        />
      ) : (
        <span className="tiny muted"> (This play isn’t in this campaign.)</span>
      );
    },
  };
  // Records a play in one click: its world changes, as the ripple dialog would apply them, and a chronicle line (enjoyment Neutral).
  function quickRecord(play: Branch, sid?: string) {
    const at = sid || session.id;
    update((c) => {
      const m = memoryOf(c),
        pb = m.playbook;
      return {
        ...c,
        events: [
          ...c.events,
          {
            id: uid(),
            sessionId: at,
            text: play.title + '.',
            style: play.style,
            enjoyment: 'Neutral' as const,
            date: new Date().toISOString(),
            branchId: play.id,
          },
        ],
        memory:
          pb && play.effects?.length
            ? {
                ...m,
                playbook: applyChanges(pb, resolveEffects(pb, play.effects), {
                  sessionId: at,
                  title: play.title,
                  playId: play.id,
                }),
              }
            : c.memory,
      };
    });
    setNotice(
      'Recorded: ' +
        play.title +
        '. Undo world changes in Session → Playbook → World state; edit the line in the chronicle.',
    );
  }
  function played(play: Branch, sid?: string) {
    const pb = memoryOf(campaign).playbook;
    if (pb && (play.effects?.length || play.later)) {
      setRipplePlay({ play, sessionId: sid || session.id });
      setModal('ripple');
    } else record(play, sid);
  }
  function pinRule(ref: RuleReference) {
    updateSession((s) => ({
      ...s,
      ruleReferences: [...(s.ruleReferences || []).filter((r) => r.id !== ref.id), ref].slice(-6),
    }));
  }
  function saveOutcome(value: OutcomeEdit) {
    update((c) => ({
      ...c,
      events: editingEvent
        ? c.events.map((e) => (e.id === editingEvent ? { ...e, ...value } : e))
        : [...c.events, { ...value, id: uid(), date: new Date().toISOString() }],
    }));
    setModal('');
    setNotice(
      editingEvent
        ? 'Campaign history updated.'
        : 'Recorded. Future sessions will use this outcome.',
    );
  }
  function exportData() {
    const blob = new Blob([JSON.stringify({ version: 2, campaigns, active, sessionId }, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'waypoint-campaigns.json';
    a.click();
    URL.revokeObjectURL(url);
    setNotice('Campaign backup downloaded.');
  }
  async function importData(file?: File) {
    if (!file) return;
    try {
      if (file.size > 50000000) throw new Error('Please use a backup smaller than 50 MB.');
      addCopies(JSON.parse(await file.text()), 'imported');
      setNotice('Backup imported as separate campaigns.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed.');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }
  function coachPrompt(prompt: string) {
    setView('Session desk');
    setTab('Quick help');
    promptDraft.replace(prompt.slice(0, 10000), 'DM response');
    setNotice('Add what the players said, then generate your response.');
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const el = document.getElementById('quick-prompt');
        el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        el?.focus();
      }),
    );
  }
  useEffect(() => {
    const shortcut = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && !modal) {
        e.preventDefault();
        setCommandOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', shortcut);
    return () => window.removeEventListener('keydown', shortcut);
  }, [modal]);
  function navigate(next: View, hit: SearchHit | null = null) {
    if (next !== 'Foresight') setForesightTab(null);
    if (next === view && hit?.id === targetHit?.id && hit?.kind === targetHit?.kind) return;
    setBackStack((stack) =>
      [
        ...stack,
        {
          campaignId: campaign.id,
          view,
          hit: targetHit,
          sessionId: session.id,
          tab: deskTab,
          expanded,
          scroll: window.scrollY,
        },
      ].slice(-40),
    );
    // Going back to the desk from the sidebar returns to the place you left on it.
    returning.current = next === 'Session desk' && !hit;
    setNavigationRevision((value) => value + 1);
    setTargetHit(hit);
    setViewState(next);
  }
  function goBack() {
    setForesightTab(null);
    const previous = backStack[backStack.length - 1];
    if (!previous || previous.campaignId !== campaign.id) return;
    setBackStack((stack) => stack.slice(0, -1));
    restoreScroll.current = previous.scroll;
    setNavigationRevision((value) => value + 1);
    setViewState(previous.view);
    setTargetHit(
      previous.hit
        ? searchCampaign(campaign, '', previous.hit.kind).find(
            (hit) => hit.id === previous.hit!.id,
          ) || null
        : null,
    );
    setSessionId(
      campaign.sessions.some((s) => s.id === previous.sessionId) ? previous.sessionId : session.id,
    );
    setTab(previous.tab);
    setExpanded(previous.expanded);
  }
  function showReference(id: string) {
    if (!id.startsWith('creature:')) rememberItem(campaign.id, { kind: 'Wiki', id });
    setReferenceId(id);
  }
  function goTo(place: GoPlace) {
    if (place === 'world-state') {
      setForesightTab({ tab: 'World state', n: Date.now() });
      navigate('Foresight');
      return;
    }
    if (view === 'Party & preferences') {
      scrollToId(place);
      return;
    }
    scrollTarget.current = place;
    navigate('Party & preferences');
  }
  function toggleReference(id: string) {
    update((c) => {
      const memory = memoryOf(c);
      return {
        ...c,
        memory: {
          ...memory,
          pins: memory.pins?.includes(id)
            ? memory.pins.filter((value) => value !== id)
            : [...(memory.pins || []), id],
        },
      };
    });
  }
  function openHit(hit: SearchHit) {
    rememberItem(campaign.id, hit);
    navigate('Campaign hub', hit);
  }
  // A search match in another campaign: switch to that campaign and open the match in its hub.
  function openElsewhere(campaignId: string, kind: SearchHit['kind'], id: string) {
    const target = campaigns.find((c) => c.id === campaignId),
      hit = target && searchCampaign(target, '', kind).find((h) => h.id === id);
    if (!target || !hit || busy || recordingActive) return;
    setActive(target.id);
    setSessionId(hit.sessionId || '');
    setExpanded(null);
    rememberItem(target.id, hit);
    navigate('Campaign hub', hit);
  }
  function openWorkspace(hit: SearchHit) {
    rememberItem(campaign.id, hit);
    if (hit.kind === 'Material') {
      setCardResult(campaign.cards.find((c) => c.id === hit.id) || null);
      setModal('card');
      return;
    }
    const destinations: Partial<Record<SearchHit['kind'], View>> = {
      Wiki: 'World wiki',
      Journal: 'Session journal',
      Handout: 'Player handouts',
      Character: 'Party & preferences',
      Rule: 'Rules library',
    };
    navigate(destinations[hit.kind] || 'Session desk', hit);
    if (hit.sessionId) setSessionId(hit.sessionId);
    if (['Play', 'Event', 'Session', 'Creature', 'Encounter'].includes(hit.kind)) {
      setTab(
        ['Creature', 'Encounter'].includes(hit.kind)
          ? 'Combat'
          : hit.kind === 'Play'
            ? 'Possibilities'
            : hit.kind === 'Event'
              ? 'At the table'
              : 'Session notes',
      );
      if (hit.kind === 'Play') setExpanded(hit.id);
    }
  }
  const nav: [View, typeof BookOpen][] = [
    ['Session desk', BookOpen],
    ['Foresight', Telescope],
    ['Next session', Compass],
    ['Saved material', Sparkles],
    ['Rules library', BookOpen],
    ['Campaign hub', Compass],
    ['Campaign', Map],
    ['World wiki', BookOpen],
    ['Party & preferences', Users],
    ['Session journal', FileText],
    ['Chronicle', ScrollText],
    ['Player site', FileText],
    ['Player handouts', FileText],
    ['Discoveries', CheckCircle2],
  ];
  const areas: { label: string; icon: typeof BookOpen; views: { view: View; label: string }[] }[] =
    [
      {
        label: 'Session',
        icon: BookOpen,
        views: [
          { view: 'Session desk', label: 'Current session' },
          { view: 'Foresight', label: 'Playbook' },
          { view: 'Next session', label: 'Plan next session' },
        ],
      },
      {
        label: 'Campaign',
        icon: Compass,
        views: [
          { view: 'Campaign hub', label: 'Read & explore' },
          { view: 'World wiki', label: 'Wiki editor' },
          { view: 'Campaign', label: 'Outline & sessions' },
          { view: 'Party & preferences', label: 'Party & preferences' },
        ],
      },
      {
        label: 'Journal',
        icon: ScrollText,
        views: [
          { view: 'Session journal', label: 'Notes & recordings' },
          { view: 'Discoveries', label: 'Review discoveries' },
          { view: 'Chronicle', label: 'Confirmed history' },
        ],
      },
      {
        label: 'Library',
        icon: LibraryBig,
        views: [
          { view: 'Rules library', label: 'Rules' },
          { view: 'Saved material', label: 'Saved ideas' },
        ],
      },
      {
        label: 'Players',
        icon: Users,
        views: [
          { view: 'Player site', label: 'Player site' },
          { view: 'Player handouts', label: 'Handouts & display' },
        ],
      },
    ];
  const area = areas.find((a) => a.views.some((v) => v.view === view))!;
  const pageLabel = area.views.find((v) => v.view === view)!.label;
  useEffect(() => {
    workspaceSections.current[campaign.id + ':' + area.label] = view;
  }, [campaign.id, area.label, view]);
  const memory = memoryOf(campaign),
    reviewCount = memory.notes.reduce(
      (n, note) => n + note.proposals.filter((p) => p.state === 'pending').length,
      0,
    );
  return {
    targetHit,
    setTargetHit,
    setView,
    navigationRevision,
    setNavigationRevision,
    backStack,
    setBackStack,
    referenceId,
    setReferenceId,
    restoreScroll,
    workspaceSections,
    scrollTarget,
    foresightTab,
    setForesightTab,
    commandOpen,
    setCommandOpen,
    recordingActive,
    setRecordingActive,
    planPlay,
    setPlanPlay,
    planTitle,
    setPlanTitle,
    eventSession,
    setEventSession,
    view,
    setViewState,
    aiStatus,
    ai,
    busy,
    setBusy,
    progress,
    askQuestion,
    setAskQuestion,
    askResult,
    setAskResult,
    ask,
    addPath,
    notice,
    setNotice,
    error,
    setError,
    campaigns,
    setCampaigns,
    active,
    setActive,
    sessionId,
    setSessionId,
    ready,
    campaign,
    session,
    saving,
    autoSaved,
    saveAnnouncement,
    update,
    updateSession,
    addCopies,
    modal,
    setModal,
    live,
    setLive,
    seedPage,
    setSeedPage,
    wikiSeed,
    setWikiSeed,
    clearWikiSeed,
    ripplePlay,
    setRipplePlay,
    tab,
    setTabState,
    setTab,
    expanded,
    setExpanded,
    draft,
    setDraft,
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
    setCardResult,
    historyFilters,
    setHistoryFilters,
    historyReturn,
    setHistoryReturn,
    historyFor,
    setHistoryFor,
    twist,
    setTwist,
    fileRef,
    modalRef,
    requestLock,
    pinnedCard,
    promptDraft,
    quick,
    kind,
    setQuick,
    setKind,
    closeDialog,
    generate,
    prepare,
    improvise,
    nextSession,
    createCampaign,
    manualCampaign,
    record,
    deskTab,
    deskCard,
    planPlays,
    quickRecord,
    played,
    pinRule,
    saveOutcome,
    exportData,
    importData,
    coachPrompt,
    navigate,
    goBack,
    showReference,
    goTo,
    toggleReference,
    openHit,
    openElsewhere,
    openWorkspace,
    nav,
    areas,
    area,
    pageLabel,
    memory,
    reviewCount,
  };
}
export type Answer = { question: string; answer: string; pages: { id: string; title: string }[] };
export type Desk = ReturnType<typeof useDesk>;
export const DeskContext = createContext<Desk | null>(null);
// Views and dialogs read the desk from here; the shell provides it.
export function useDeskContext() {
  const desk = useContext(DeskContext);
  if (!desk) throw new Error('useDeskContext needs the desk shell above it.');
  return desk;
}
