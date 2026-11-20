import { ruleReferencesSchema, type RuleReference } from './rules';
import { memorySchema } from './memory';
import type { Memory } from './memory';
import { z } from 'zod';
import { playFields, type PlayFields } from './playbook-schema';
export type Style = 'Roleplay' | 'Exploration' | 'Combat' | 'Mischief';
export type Branch = {
  id: string;
  title: string;
  style: Style;
  likelihood: string;
  why: string;
  readAloud: string;
  response: string;
  consequence: string;
  fallback: string;
} & PlayFields;
export type Session = {
  ruleReferences?: RuleReference[];
  debrief?: { remember: string; openQuestions: string; nextFocus: string };
  pinnedCardId?: string;
  id: string;
  title: string;
  plan: string;
  summary: string;
  branches: Branch[];
  source: string;
  done: boolean;
};
export type Event = {
  id: string;
  sessionId: string;
  text: string;
  style: Style;
  enjoyment: 'Loved it' | 'Neutral' | 'Less of this';
  date: string;
  branchId?: string;
};
export type Card = {
  id: string;
  kind: string;
  title: string;
  body: string;
  readAloud: string;
  consequence: string;
  source: string;
};
export type Campaign = {
  memory?: Memory;
  id: string;
  name: string;
  premise: string;
  tone: string;
  party: string;
  boundaries: string;
  twist: string;
  arc: string;
  sessions: Session[];
  events: Event[];
  cards: Card[];
  preferences: Record<Style, number>;
};
export const styles: Style[] = ['Roleplay', 'Exploration', 'Combat', 'Mischief'];
export const uid = () => crypto.randomUUID();
export const demo: Campaign = {
  id: 'demo',
  name: 'The Hollow Crown',
  premise:
    'The bells of Briar Glen ring each midnight, though their tower has stood empty for a century. Beneath the village, something is waking. A missing courier carried a silver crown that remembers its last wearer.',
  tone: 'Mysterious & atmospheric',
  party:
    'Four adventurers, level 3. Curious, morally flexible, and very fond of talking to suspicious strangers.',
  boundaries: 'No harm to children. Fade to black for graphic violence.',
  twist: 'Subtle',
  arc: 'ACT I · A bell without a ringer\nInvestigate the missing courier and the village’s uneasy peace.\n\nACT II · A kingdom beneath the roots\nDiscover rival claims to a forgotten crown. Let alliances determine which secrets emerge.\n\nACT III · The price of remembrance\nDecide who, if anyone, should inherit the crown. Earlier bargains determine the cost.',
  preferences: { Roleplay: 4, Exploration: 4, Combat: 2, Mischief: 3 },
  events: [],
  cards: [],
  sessions: [
    {
      id: 'session-demo',
      title: 'Whispers in Briar Glen',
      source: 'Example campaign',
      done: false,
      summary: 'A missing courier. A village full of secrets. A bell that should not ring.',
      plan: 'The party arrives at the rain-soaked village of Briar Glen. Innkeeper Mara says a courier disappeared near the old bell tower. Captain Voss has sealed the tower and refuses entry. A nervous gravedigger named Pell knows about a tunnel beneath the cemetery. At midnight, the bell rings and blue light rises from the well. The courier is alive beneath the tower, guarding a silver crown from a restless oathkeeper. The oathkeeper wants its forgotten name spoken aloud, not a fight. Clues: a torn blue cloak at the inn, the oathkeeper’s name on a cracked grave, and silver dust at the well.',
      branches: [
        {
          id: 'b1',
          title: 'Talk their way past the captain',
          style: 'Roleplay',
          likelihood: 'Worth preparing first',
          why: 'Fits the party’s interest in suspicious strangers.',
          readAloud:
            '“You think I locked that door to keep you out?” Voss glances at the tower. “I locked it to keep something in.”',
          response:
            'Voss wants the village safe. Offer a supervised visit in exchange for discretion. If they earn his trust, he gives them the courier’s last letter.',
          consequence:
            'Voss becomes a cautious ally. A broken promise will close official doors later.',
          fallback: 'If the conversation stalls, a second bell rings and Voss asks for their help.',
        },
        {
          id: 'b2',
          title: 'Follow the gravedigger underground',
          style: 'Exploration',
          likelihood: 'A strong alternative',
          why: 'A visible mystery gives curious players another way in.',
          readAloud:
            'Pell lifts the cemetery lantern. Beneath the stone steps, a second set of footsteps stops when yours do.',
          response:
            'The tunnel offers three clues: fresh boot prints, a mural naming the oathkeeper, and a brass chime that opens the sealed chamber. A failed search costs time, not the only clue.',
          consequence: 'They reach the courier unseen, but the next midnight draws closer.',
          fallback: 'Pell remembers an old verse containing the name if the inscription is missed.',
        },
        {
          id: 'b3',
          title: 'Force open the tower',
          style: 'Combat',
          likelihood: 'Keep in your back pocket',
          why: 'A blocked entrance may invite a direct solution.',
          readAloud: 'The lock breaks. Every candle in the square leans toward the open door.',
          response:
            'A spectral guardian blocks the stairs. It challenges their purpose before fighting. Use a level-appropriate encounter from your rules; give a clear retreat route and a way to end it by speaking the oathkeeper’s name.',
          consequence:
            'The village sees the disturbance. Voss asks the party to account for the damage.',
          fallback: 'The guardian pauses when someone protects a companion, allowing negotiation.',
        },
      ],
    },
  ],
};
export function affinity(c: Campaign, style: Style) {
  return (
    c.preferences[style] +
    c.events
      .filter((e) => e.style === style)
      .reduce(
        (n, e) => n + (e.enjoyment === 'Loved it' ? 2 : e.enjoyment === 'Less of this' ? -1 : 0.5),
        0,
      )
  );
}
// What a saved campaign must look like. Fields it does not list (older or newer extras) are allowed and kept as they are.
const styleSchema = z.enum(['Roleplay', 'Exploration', 'Combat', 'Mischief']);
const debriefText = z.string().max(3000);
const branchSchema = z.object({
  id: z.string(),
  title: z.string(),
  style: styleSchema,
  likelihood: z.string(),
  why: z.string(),
  readAloud: z.string(),
  response: z.string(),
  consequence: z.string(),
  fallback: z.string(),
  ...playFields,
});
const sessionSchema = z.object({
  ruleReferences: ruleReferencesSchema,
  debrief: z
    .object({ remember: debriefText, openQuestions: debriefText, nextFocus: debriefText })
    .optional(),
  pinnedCardId: z.string().optional(),
  id: z.string(),
  title: z.string(),
  plan: z.string(),
  summary: z.string(),
  branches: z.array(branchSchema),
  source: z.string(),
  done: z.boolean(),
});
const eventSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  text: z.string(),
  style: styleSchema,
  enjoyment: z.enum(['Loved it', 'Neutral', 'Less of this']),
  date: z.string(),
});
const cardSchema = z.object({
  id: z.string(),
  kind: z.string(),
  title: z.string(),
  body: z.string(),
  readAloud: z.string(),
  consequence: z.string(),
  source: z.string(),
});
const preference = z.number().finite();
export const campaignSchema = z.object({
  memory: memorySchema.optional(),
  id: z.string(),
  name: z.string(),
  premise: z.string(),
  tone: z.string(),
  party: z.string(),
  boundaries: z.string(),
  twist: z.string(),
  arc: z.string(),
  sessions: z.array(sessionSchema).min(1),
  events: z.array(eventSchema),
  cards: z.array(cardSchema),
  preferences: z.object({
    Roleplay: preference,
    Exploration: preference,
    Combat: preference,
    Mischief: preference,
  }),
});
export function validateCampaign(value: unknown): value is Campaign {
  return campaignSchema.safeParse(value).success;
}
// The first wrong field, as a path a person can find in the backup file: "sessions[0].branches[2].style: Expected string, received number".
export function campaignProblem(value: unknown): string | null {
  const result = campaignSchema.safeParse(value);
  if (result.success) return null;
  const { path, message } = result.error.issues[0];
  const where = path.reduce<string>(
    (s, p) => (typeof p === 'number' ? `${s}[${p}]` : s ? `${s}.${p}` : p),
    '',
  );
  return where ? `${where}: ${message}` : message;
}
// The same for a saved list of campaigns, naming the campaign: "“The Hollow Crown” sessions[0].title: Required".
export function campaignsProblem(list: unknown): string | null {
  if (!Array.isArray(list) || !list.length) return 'there are no campaigns in it';
  for (const [i, c] of list.entries()) {
    const problem = campaignProblem(c);
    if (!problem) continue;
    const name = (c as { name?: unknown } | null)?.name;
    return (typeof name === 'string' && name ? `“${name}”` : `campaign ${i + 1}`) + ' ' + problem;
  }
  return null;
}
