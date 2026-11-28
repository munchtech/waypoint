import { ChevronRight, Plus } from 'lucide-react';
import MentionTextarea from '../../components/mention-textarea';
import { Session, uid } from '../../lib/campaign';
import { useDeskContext } from '../use-desk';

// The campaign outline and its sessions.
export function CampaignOutlineView() {
  const { setView, setPlanTitle, setSessionId, campaign, update, setModal, setDraft } =
    useDeskContext();
  return (
    <div className="content-grid">
      <section className="paper">
        <span className="eyebrow">CAMPAIGN OUTLINE</span>
        <h2>{campaign.name}</h2>
        <label>
          Campaign name
          <input
            value={campaign.name}
            maxLength={100}
            onChange={(e) => update((c) => ({ ...c, name: e.target.value }))}
          />
        </label>
        <label>
          Premise
          <MentionTextarea
            value={campaign.premise}
            rows={4}
            onChange={(e) => update((c) => ({ ...c, premise: e.target.value }))}
          />
        </label>
        <label>
          Campaign outline · editable draft
          <MentionTextarea
            className="outline-editor"
            value={campaign.arc}
            onChange={(e) => update((c) => ({ ...c, arc: e.target.value }))}
          />
        </label>
      </section>
      <section className="paper">
        <h3>The road so far</h3>
        <p className="muted">
          {campaign.sessions.length} {campaign.sessions.length === 1 ? 'session' : 'sessions'} ·{' '}
          {campaign.events.length} confirmed {campaign.events.length === 1 ? 'event' : 'events'}
        </p>
        {campaign.sessions.map((s, i) => (
          <button
            className="session-list-item"
            key={s.id}
            onClick={() => {
              setSessionId(s.id);
              setView('Session desk');
            }}
          >
            <span>{String(i + 1).padStart(2, '0')}</span>
            <div>
              <strong>{s.title}</strong>
              <small>{s.done ? 'Completed' : 'Prepared draft'}</small>
            </div>
            <ChevronRight size={16} />
          </button>
        ))}
        <button
          className="button full"
          onClick={() => {
            const s: Session = {
              id: uid(),
              title: `Session ${campaign.sessions.length + 1}`,
              plan: '',
              summary: '',
              branches: [],
              source: 'DM written',
              done: false,
            };
            update((c) => ({ ...c, sessions: [...c.sessions, s] }));
            setSessionId(s.id);
            setPlanTitle(s.title);
            setDraft('');
            setModal('plan');
            setView('Session desk');
          }}
        >
          <Plus size={16} /> Add a blank session
        </button>
      </section>
    </div>
  );
}
