'use client';
import { useState } from 'react';
import { Dices } from 'lucide-react';
import {
  diceLabel,
  diceModes,
  diceSpec,
  dieSides,
  MAX_DICE,
  MAX_MODIFIER,
  parseDice,
  rollAnnouncement,
  rollDice,
  signed,
  type DiceMode,
  type DiceRoll,
  type DiceSpec,
} from '../lib/dice';

// Rolls stay while Waypoint is open, so closing the tray and opening it again keeps them; nothing is saved.
const HISTORY = 10;
let kept: DiceRoll[] = [];
const keep = (r: DiceRoll) => (kept = [r, ...kept].slice(0, HISTORY));
const forget = () => (kept = []);

// The dice tray: private DM rolls with a die, a count, a modifier and advantage, or a typed roll.
export default function DiceTray() {
  const [sides, setSides] = useState(20),
    [count, setCount] = useState(1),
    [modifier, setModifier] = useState(0),
    [mode, setMode] = useState<DiceMode>('Normal'),
    [typed, setTyped] = useState(''),
    [problem, setProblem] = useState(''),
    [rolls, setRolls] = useState<DiceRoll[]>(kept),
    [announced, setAnnounced] = useState(0);
  const spec = diceSpec(count, sides, modifier, mode);
  function roll(s: DiceSpec) {
    setRolls(keep(rollDice(s)));
    setAnnounced((n) => n + 1);
  }
  function rollTyped() {
    const parsed = parseDice(typed);
    if ('error' in parsed) return setProblem(parsed.error);
    setProblem('');
    roll(parsed.spec);
  }
  const last = rolls[0];
  return (
    <div className="dice-tools">
      <div className="dice-types" role="group" aria-label="Die">
        {dieSides.map((s) => (
          <button
            key={s}
            type="button"
            className={s === sides ? 'chosen' : ''}
            aria-pressed={s === sides}
            onClick={() => {
              setSides(s);
              if (s !== 20) setMode('Normal');
            }}
          >
            d{s}
          </button>
        ))}
      </div>
      <div className="dice-options">
        <label>
          Dice
          <input
            type="number"
            min="1"
            max={MAX_DICE}
            value={spec.count}
            disabled={spec.mode !== 'Normal'}
            onChange={(e) => setCount(Number(e.target.value))}
          />
        </label>
        <label>
          Modifier
          <input
            type="number"
            min={-MAX_MODIFIER}
            max={MAX_MODIFIER}
            value={spec.modifier}
            onChange={(e) => setModifier(Number(e.target.value))}
          />
        </label>
        <label>
          Roll mode
          <select
            value={spec.mode}
            disabled={sides !== 20}
            onChange={(e) => setMode(e.target.value as DiceMode)}
          >
            {diceModes.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
      </div>
      <button type="button" className="button primary full" onClick={() => roll(spec)}>
        <Dices size={16} /> Roll {diceLabel(spec)}
      </button>
      <form
        className="dice-typed"
        onSubmit={(e) => {
          e.preventDefault();
          rollTyped();
        }}
      >
        <label>
          Or type a roll
          <input
            value={typed}
            maxLength={40}
            placeholder="2d6+3, d20+5 adv, d%"
            aria-invalid={!!problem}
            aria-describedby={problem ? 'dice-problem' : undefined}
            onChange={(e) => {
              setTyped(e.target.value);
              setProblem('');
            }}
          />
        </label>
        <button type="submit" className="button" disabled={!typed.trim()}>
          Roll it
        </button>
      </form>
      {problem && (
        <p className="dice-problem" id="dice-problem">
          {problem}
        </p>
      )}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {/* A trailing space on every other roll makes the same result twice running announce again. */}
        {last ? rollAnnouncement(last) + (announced % 2 ? ' ' : '') : ''}
      </div>
      {last && (
        <div className="roll-result">
          <strong>{last.total}</strong>
          <span>
            {last.label}
            <small>
              {last.values.map((v, i) => (
                <span
                  key={i}
                  className={last.kept !== null && v !== last.kept ? 'dropped' : undefined}
                >
                  {i ? ' · ' : ''}
                  {v}
                </span>
              ))}
              {last.modifier ? ' · modifier ' + signed(last.modifier) : ''}
            </small>
          </span>
        </div>
      )}
      {rolls.length > 1 && (
        <div className="roll-history" aria-label="Earlier rolls">
          {rolls.slice(1).map((r) => (
            <span key={r.id}>
              {r.label} <b>{r.total}</b>
            </span>
          ))}
        </div>
      )}
      <p className="tiny muted dice-note">
        Private to you. Rolls are not saved and are gone when Waypoint closes.
        {rolls.length > 0 && (
          <>
            {' '}
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setRolls(forget());
              }}
            >
              Clear rolls
            </button>
          </>
        )}
      </p>
    </div>
  );
}
