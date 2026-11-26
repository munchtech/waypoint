// The DM's private dice: a die, how many, a modifier and, for a single d20, advantage or disadvantage. A roll can also
// be typed ("2d6+3", "d20+5 adv", "d%"). Rolls are never saved; the tray keeps the last few on screen.
export type DiceMode = 'Normal' | 'Advantage' | 'Disadvantage';
export type DiceSpec = { count: number; sides: number; modifier: number; mode: DiceMode };
export type DiceRoll = {
  id: string;
  label: string;
  values: number[];
  // The die that counts under advantage or disadvantage; null when every die is added.
  kept: number | null;
  modifier: number;
  total: number;
};
export const dieSides = [4, 6, 8, 10, 12, 20, 100];
export const diceModes: DiceMode[] = ['Normal', 'Advantage', 'Disadvantage'];
export const MAX_DICE = 20,
  MAX_SIDES = 1000,
  MAX_MODIFIER = 100;
export type Die = (sides: number) => number;

// A fair die from the system's random source: draws that would favour the low faces are thrown away and drawn again.
export const randomDie: Die = (sides) => {
  const limit = 2 ** 32 - (2 ** 32 % sides),
    draw = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(draw);
    if (draw[0] < limit) return (draw[0] % sides) + 1;
  }
};

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.trunc(n) || 0));
// The spec as the tray's controls would set it: counts and modifiers held to their limits, and advantage only on a d20.
export function diceSpec(count: number, sides: number, modifier: number, mode: DiceMode): DiceSpec {
  const d20 = sides === 20;
  return {
    count: d20 && mode !== 'Normal' ? 1 : clamp(count, 1, MAX_DICE),
    sides: clamp(sides, 2, MAX_SIDES),
    modifier: clamp(modifier, -MAX_MODIFIER, MAX_MODIFIER),
    mode: d20 ? mode : 'Normal',
  };
}

const typed =
  /^(\d{1,3})?\s*d\s*(\d{1,4}|%)\s*(?:([+\-−])\s*(\d{1,4}))?\s*(adv(?:antage)?|dis(?:advantage)?)?$/i;
// A typed roll, or what is wrong with it.
export function parseDice(text: string): { spec: DiceSpec } | { error: string } {
  const m = text.trim().replace(/\s+/g, ' ').match(typed);
  if (!m) return { error: 'Type a roll like 2d6+3, d20+5 adv or d%.' };
  const count = Number(m[1] || 1),
    sides = m[2] === '%' ? 100 : Number(m[2]),
    modifier = m[3] ? (m[3] === '+' ? 1 : -1) * Number(m[4]) : 0,
    mode: DiceMode = !m[5] ? 'Normal' : /^adv/i.test(m[5]) ? 'Advantage' : 'Disadvantage';
  if (count < 1 || count > MAX_DICE) return { error: `Roll 1 to ${MAX_DICE} dice at a time.` };
  if (sides < 2 || sides > MAX_SIDES) return { error: `A die has 2 to ${MAX_SIDES} sides.` };
  if (Math.abs(modifier) > MAX_MODIFIER)
    return { error: `Keep the modifier between −${MAX_MODIFIER} and +${MAX_MODIFIER}.` };
  if (mode !== 'Normal' && (sides !== 20 || count !== 1))
    return { error: mode + ' is for a single d20.' };
  return { spec: { count, sides, modifier, mode } };
}

export const signed = (n: number) => (n < 0 ? '−' + -n : n ? '+' + n : '');
export const diceLabel = (s: DiceSpec) =>
  `${s.count}d${s.sides}${signed(s.modifier)}${s.mode !== 'Normal' ? ' · ' + s.mode : ''}`;

export function rollDice(
  spec: DiceSpec,
  die: Die = randomDie,
  id: string = crypto.randomUUID(),
): DiceRoll {
  const values = Array.from({ length: spec.mode === 'Normal' ? spec.count : 2 }, () =>
    die(spec.sides),
  );
  const kept =
    spec.mode === 'Advantage'
      ? Math.max(...values)
      : spec.mode === 'Disadvantage'
        ? Math.min(...values)
        : null;
  return {
    id,
    label: diceLabel(spec),
    values,
    kept,
    modifier: spec.modifier,
    total: (kept ?? values.reduce((a, b) => a + b, 0)) + spec.modifier,
  };
}

// What a screen reader hears: "Rolled 1d20+5 · Advantage: 19, dice 14 and 9".
export const rollAnnouncement = (r: DiceRoll) =>
  `Rolled ${r.label}: ${r.total}${r.values.length > 1 ? ', dice ' + r.values.join(' and ') : ''}`;
