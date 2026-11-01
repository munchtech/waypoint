# Seventh Bell playbook — authoring guide

**Revision 7 notes.** Sources keep the word "Tongue"; `terms.cjs` renames it to "Heart" (and Lines/Veils to Off-limits/Off-screen) in everything the tools build, and the update pack asks Waypoint to rename the DM's own text the same way. Keep writing "Tongue" in the sources so the anchors into the live campaign keep matching. Endings (`endings.cjs`) need `shrine=reached` and record their own `reached` state; `REVISION-7-BRIEF.md` has the rest. Run `tools/build-pack.cjs`, then `tools/build-manuscript.cjs` (the book's Part 13 is generated from the pack), then `tools/build-handouts.cjs`.

The playbook makes Waypoint *predictive*: for every session it says what the party is likely to do, how the DM responds, what rules apply (2024), and what that choice changes now and later. Waypoint tracks the world state (flags), hides plays that are no longer possible, ranks likely plays, and shows the ripple of a choice when the DM marks "the party did this."

## Sources (read before writing)
- `../canon.md` — the canon (revision 7 adds Section 9: the level-3 table, timeline fixes, the endings). Revision 6 brought Forgotten Realms tie-in, the Stormwall and the Seam, Pellmoor Landing as a port, memory as currency, new NPCs, 2024 rules notes. **Wins over v5 where they disagree.**
- `C:\Users\munch\Documents\Codex\2026-10-22\au\outputs\the-seventh-bell-v5.md` — the campaign manuscript (v5). Part 8 (sessions), Part 9 (player choices), Appendix A (creatures).
- `flags.json` — the world-state flags. Use **only** these flag ids and option ids.
- `../ref/sessions.json` — session ids. Use these exact ids.
- `../ref/xmm-bases.md` — 2024 Monster Manual base stat blocks available in Waypoint.

## Output format
Write one JSON file per assignment. Top level:
```json
{ "plays": [Play...], "briefs": [Brief...], "encounters": [Encounter...] }
```
Must parse as strict JSON (no comments, no trailing commas). Use straight double quotes for JSON and typographic quotes or single quotes inside text.

### Play
```json
{
  "id": "s01-hand-tongue-to-quill",
  "sessionId": "sb-ce895de5912506a9",
  "title": "They hand the Tongue to Quill",
  "style": "Roleplay",
  "likelihood": "Possible",
  "why": "One sentence: why a table might do this, or why it is worth preparing.",
  "tells": "How the DM can see it coming (what players say or ask first).",
  "readAloud": "1-3 sentences to read or paraphrase. Player-safe. No DM secrets.",
  "response": "What the DM does: NPC reactions, offers, steps. Concrete names, places, numbers.",
  "rules": "2024 mechanics used, compactly: action, skill, DC, condition, duration. Empty string if none.",
  "consequence": "What changes right now.",
  "later": "What this changes later, with session references (S4, S23...). The predictive part. Empty string if nothing.",
  "fallback": "If it goes sideways or stalls: one sentence that keeps the game moving.",
  "keywords": "comma, separated, search, words, synonyms players might use",
  "when": [{"flag":"t_ossa","in":["ila","party"]}],
  "effects": [{"flag":"t_ossa","set":"court"},{"flag":"court_eye","set":"recorded"},{"flag":"clock_court","add":1}]
}
```
- `id`: `sNN-short-slug` for session plays (NN = session number from sessions.json, two digits; 16A/16B use `s16a-`, `s16b-` etc.), `any-short-slug` for anytime plays. Unique.
- `sessionId`: exact id from sessions.json. Omit for anytime plays.
- `style`: one of `Roleplay`, `Exploration`, `Combat`, `Mischief`.
- `likelihood`: `Likely`, `Possible`, or `Wildcard`. Be honest; most sessions have 2–3 Likely plays.
- `when` (optional): the play is shown as "not possible now" unless every condition holds. A condition is `{"flag":id,"in":[options]}`, `{"flag":id,"not":[options]}`, or for clocks `{"flag":id,"min":n}` / `{"flag":id,"max":n}`. Only add `when` where the play genuinely depends on state (who holds a Tongue, whether someone is alive, whether a bell is rung). Don't over-constrain.
- `effects` (optional): flags this choice changes when the DM confirms it. `set` for option flags, `add` for clocks (can be negative). Only effects that certainly follow from the play.
- Write `later` with concrete references: "S4: Maudrin opens with their names." "S23: Ilam holds the southern road." This is what makes Waypoint predictive.

### Brief (one per session)
```json
{
  "sessionId": "sb-ce895de5912506a9",
  "pressure": "What the world does this session even if the party does nothing (faction moves, a clock tick, a scheduled arrival). 2-4 sentences.",
  "endOn": "The closing question for the session (from v5, adjusted for state where needed).",
  "npcs": "Comma-separated NPC names likely to appear, most important first.",
  "checklist": ["Session-specific prep item", "..."],
  "encounters": ["enc-s01-quill-patrol"],
  "rules": ["Influence", "Frightened", "Suffocation"]
}
```
- `checklist`: 3–6 items specific to this session (props, names to have ready, a state to check). The general v5 checklist is added by the app.
- `rules`: names of 2024 rules entries to keep at hand (actions, conditions, hazards, spells). Use exact 2024 names: e.g. Influence, Study, Search, Help, Hide, Frightened, Charmed, Incapacitated, Grappled, Prone, Restrained, Exhaustion, Extreme Cold, Frigid Water, Deep Water, Suffocation, Falling, Silence, Counterspell, Heroic Inspiration.

### Encounter
```json
{
  "id": "enc-s01-quill-patrol",
  "sessionId": "sb-ce895de5912506a9",
  "title": "Quill's patrol",
  "creatures": [{"name":"Hushman Tobias Quill","statblock":"sb_hushman","base":"Tough","cr":"1/2","count":1},{"name":"Hushman","statblock":"sb_hushman","base":"Tough","cr":"1/2","count":1}],
  "tactics": "How they fight, what they want (arrest, not kill).",
  "exit": "How it ends without a kill: retreat, surrender, a bargain, an objective.",
  "scale": "How to scale up or down for the party (add/remove which creature). Waypoint computes 2024 difficulty from the roster."
}
```
- Use the **stat block ids and CRs below** for Corvane creatures. For ordinary people, use the 2024 base directly (e.g. `{"name":"Dawn Order Knight","base":"Knight","cr":"3","count":2}`, no `statblock`).
- Waypoint calculates difficulty with the 2024 XP budget per character. The table is **four players starting at level 3**; levels by session are `3,3,3,3,3,4,4,4,4,5,5,5,5,6,6,7,7,7,7,7,7,7,7,8,8,9,9,10,11,11,11,11`. Write counts for four characters at that level ("Written for four level-N characters"), say how to scale, and never write Easy/Medium/Hard/Deadly labels: Waypoint computes the band and suggests retuning.
- Every encounter must have a non-lethal exit. Telegraph danger a round early. (v5's low-level safeguards were for a level-1 start; this table starts at level 3.)

## Fixed stat block ids (2024 conversions; the CR is fixed)
| id | Creature | CR | 2024 base |
|---|---|---|---|
| sb_hushman | Hushman | 1/2 | Tough |
| sb_hushman_sergeant | Hushman Sergeant | 2 | Bandit Captain |
| sb_hushman_warden | Hushman Warden (elite, Acts IV–V) | 4 | Tough Boss |
| sb_memory_eel | Memory-Eel | 1/4 | Constrictor Snake |
| sb_drowned_singer | Drowned Singer | 1 | Ghoul |
| sb_cantor | Ondra Sallow, the Cantor | 4 | Ghost |
| sb_glass_wolf | Glass-Wolf | 1 | Dire Wolf |
| sb_stilled | Stilled Person | 2 | Gargoyle |
| sb_glass_sexton | The Glass Sexton (two phases) | 7 | Gargoyle + Priest |
| sb_storm_golem | Storm-stone Golem | 5 | Flesh Golem |
| sb_sleepless | Sleepless | 5 | Wraith |
| sb_tongue_hound | Tongue-Hound | 3 | Hell Hound |
| sb_ironhorn_rider | Ironhorn Rider (mounted) | 3 | Warrior Veteran |
| sb_ironhorn_champion | Ironhorn Champion | 5 | Gladiator |
| sb_kessa | Thane Oru Kessa | 7 | Gladiator |
| sb_haldric | Ser Haldric Mose | 3 | Knight |
| sb_rook | Captain Dessa Rook | 3 | Warrior Veteran |
| sb_maudrin | Chancellor Maudrin Vesk | 8 | Mage |
| sb_corin | Corin Aldeth | 6 | Mage |
| sb_hush_cultist | Hush Cultist | 2 | Cultist Fanatic |
| sb_hush_leader | Hush Cult Leader | 6 | Mage |
| sb_court_agent | Court agent (Isolde Drave, Tristan Vesk) | 2 | Spy |

Use 2024 bases directly for: Old Garrow and the Tidewarden (Specter, CR 1), Mother Sallow (Druid, CR 2), Brother Eld (Priest Acolyte, CR 1/4, can cast Silence once per day), Captain Rook's knights and Dawn Order Knights (Knight, CR 3), Wren Caddock (Spy, CR 1), Yara Thenn and Brannagh Wick (Scout, CR 1/2), Venn (Noble, CR 1/8) and his guards (Tough, CR 1/2), Sister Aurelie and Brother Hadrik (Priest, CR 2), Ila, Jonah, Bet, Ansel, Lysse (Commoner, CR 0), Zhentarim smugglers (Bandit, Bandit Captain), Court gate guards (Guard, CR 1/8), Ironhorn horses (Riding Horse / Warhorse).

## Writing rules
1. **Cover every IF THEY… box in the v5 session**, as plays. Then add 2–4 plays v5 did not predict but a real table will do: split up, attack an NPC, stealth instead of talk, bribe, leave town, use a common 2024 spell or class feature at that level (Detect Magic, Speak with Dead, Zone of Truth, Detect Thoughts, Suggestion, Sending, Water Breathing, Modify Memory, Greater Restoration, and so on). Give a firm ruling for spells that touch memory, bells, Tolls or silence.
2. **Use v6 lore where it fits**: Pellmoor as a port, Faerûnian characters and their writs, the memory currency (motes, keeps, heartkeeps, knowings; gilding; Reckoners), Master Venn and the export trade, the Stormwall. Don't force it into every play.
3. **2024 rules**: Influence (DC 15 or the creature's Intelligence, whichever is higher, attitude-driven), Study, Search, Help, Hide, 2024 conditions, Exhaustion (−2 per level to d20 Tests), Heroic Inspiration, Extreme Cold, Suffocation. No "Inspiration" (use Heroic Inspiration), no 2014-only terms.
4. **Keep v5's principles**: no forced outcomes; essential clues never lost to a failed roll; Tolls are warned (kind and weight, never the exact loss, canon Section 10) and consented to before a ringing, and refusal cancels the ringing; no permanent losses for absent players; child peril follows session-zero boundaries; telegraph danger and give a retreat; NPC fate follows actual play (state checks, no resurrections).
5. **Voice**: like the manuscript. Second person to the DM, short sentences, concrete. No filler, no "Remember to...". readAloud is in-world and player-safe.
6. **Length**: `response` 2–5 sentences; `later` 1–3 sentences; other fields 1–2 sentences.
7. **Per session**: 6–9 plays for full sessions, 3–5 for short chapters. Exactly one brief per session. Encounters for every v5 encounter plus any your plays introduce.
