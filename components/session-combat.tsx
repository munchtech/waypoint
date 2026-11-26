'use client';
import { useState } from 'react';
import { BookOpen, Swords } from 'lucide-react';
import type { Campaign, Session } from '../lib/campaign';
import { memoryOf } from '../lib/memory';
import { bestiaryOf, isHomebrew } from '../lib/homebrew';
import { partyLevels } from '../lib/playbook';
import { sessionEncounters } from '../lib/combat';
import { fightPlan } from '../lib/session-notes';
import BookText from './book-text';
import type { SearchHit } from '../lib/campaign-search';
import EncounterCard from './encounter-card';
import CreatureStats from './creature-stats';
import RuleBody from './rule-body';

export default function SessionCombat({
  campaign,
  session,
  target,
  onBrowse,
  onEdit,
}: {
  campaign: Campaign;
  session: Session;
  target: SearchHit | null;
  onBrowse: (name?: string) => void;
  // Opens a homebrew creature in the Rules library to edit.
  onEdit?: (id: string) => void;
}) {
  const memory = memoryOf(campaign),
    pb = memory.playbook,
    bestiary = bestiaryOf(memory),
    encounters = sessionEncounters(pb, session.id);
  const [selected, setSelected] = useState(
    target?.kind === 'Encounter' ? target.id : encounters[0]?.id || '',
  );
  const encounter = encounters.find((encounter) => encounter.id === selected) || encounters[0];
  const block =
    target?.kind === 'Creature'
      ? bestiary?.statblocks.find((block) => block.id === target.id)
      : undefined;
  const brief = pb?.briefs.find((brief) => brief.sessionId === session.id),
    levels = partyLevels(memory.roster, brief);
  const fights = fightPlan(session.plan);
  const pinned = (session.ruleReferences || []).filter(
    (reference) => reference.kind === 'Creature',
  );
  return (
    <section className="session-combat">
      <div className="section-title">
        <div>
          <h3>
            <Swords size={18} />
            Combat reference
          </h3>
          <p>Encounter participants, stat blocks, attacks, abilities, and tactics.</p>
        </div>
        <button className="button" onClick={() => onBrowse()}>
          <BookOpen size={14} />
          Find a creature
        </button>
      </div>
      <div className="combat-columns">
        {fights && (
          <details className="paper fight-plan" open>
            <summary>
              Round by round, from the session guide
              <small>
                Setup, what they do each round, when they run. Click a creature for its stat block.
              </small>
            </summary>
            <BookText text={fights} linkEvery />
          </details>
        )}
        <div className="combat-main">
          {block && (
            <section className="paper combat-target">
              <h3>{block.name}</h3>
              <CreatureStats
                creature={{
                  name: block.name,
                  statblock: block.id,
                  base: block.base,
                  cr: block.cr,
                  count: 1,
                }}
                pb={bestiary}
                onBrowse={onBrowse}
              />
              {isHomebrew(block) && onEdit && (
                <button className="text-button" onClick={() => onEdit(block.id)}>
                  Edit in the Rules library
                </button>
              )}
            </section>
          )}
          {encounters.length > 0 && (
            <>
              <div className="encounter-picker" aria-label="Session encounters">
                {encounters.map((item) => (
                  <button
                    key={item.id}
                    className={item === encounter ? 'selected' : ''}
                    aria-pressed={item === encounter}
                    onClick={() => setSelected(item.id)}
                  >
                    <strong>{item.title}</strong>
                    <small>
                      {item.creatures.reduce((sum, creature) => sum + creature.count, 0)}{' '}
                      participants · {item.creatures.length} profiles
                    </small>
                  </button>
                ))}
              </div>
              {encounter && pb && (
                <EncounterCard
                  key={encounter.id}
                  enc={encounter}
                  pb={pb}
                  levels={levels}
                  defaultOpen
                  onBrowse={onBrowse}
                />
              )}
            </>
          )}
          {pinned.length > 0 && (
            <section className="paper">
              <h3>Pinned creature references</h3>
              {pinned.map((reference) => (
                <details key={reference.id} open>
                  <summary>
                    {reference.name} · {reference.edition}
                  </summary>
                  <RuleBody body={reference.body} />
                  {reference.source === 'Homebrew' &&
                  onEdit &&
                  memory.homebrew?.some((b) => b.id === reference.id) ? (
                    <button className="text-button" onClick={() => onEdit(reference.id)}>
                      Edit in the Rules library
                    </button>
                  ) : (
                    <button className="text-button" onClick={() => onBrowse(reference.name)}>
                      Open full library entry
                    </button>
                  )}
                </details>
              ))}
            </section>
          )}
        </div>
      </div>
      {!encounters.length && !block && (
        <div className="paper empty">
          <Swords size={28} />
          <h3>No encounter roster for this session</h3>
          <p>
            Creature references pinned from the rules library appear here. Prepared campaign
            encounters appear when their playbook is installed.
          </p>
          <button className="button" onClick={() => onBrowse()}>
            Browse creature stat blocks
          </button>
        </div>
      )}
    </section>
  );
}
