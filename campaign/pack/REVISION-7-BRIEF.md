# Revision 7 brief (shared by both writers)

You are improving the Foresight playbook for The Seventh Bell, a five-act D&D 2024 campaign run in the Waypoint app. Read AUTHORING.md first: it is the format and the writing rules. This brief adds the revision-7 decisions. Where they disagree, this brief wins.

## Settled facts (do not change)
- Canon: `C:\Users\munch\Documents\Codex\2026-10-08\make\outputs\The-Seventh-Bell-v6-Canon.md` wins over the book. Corvane is in the Forgotten Realms behind the Stormwall; the Seam opened 382 SS = 1462 DR; the campaign starts 412 SS = 1492 DR. Pellmoor Landing is a busy port with the old ferry village (the Old Shore) at its edge. Memory is money (motes, keeps, heartkeeps, knowings; the Court's Tithe; Blanks); gold is increasingly accepted.
- Book: `C:\Users\munch\Documents\Codex\2026-10-08\make\outputs\the-seventh-bell-v6.md` (Part 8 sessions, Part 9 player choices, Part 10 endings).
- D&D 2024 rules everywhere: Influence (DC 15 or the creature's Intelligence score, whichever is higher), Study, Search, Help, Hide, Utilize, Heroic Inspiration, 2024 conditions, Exhaustion −2 per level. 2024 Command allows only Approach, Drop, Flee, Grovel, Halt. Lesser Restoration ends Blinded, Deafened, Paralyzed or Poisoned (not Frightened; use Calm Emotions or Heroes' Feast for fear).
- **The table: four players, starting at level 3.** Expected party level by app session index (1–32): `3,3,3,3,3,4,4,4,4,5,5,5,5,6,6,7,7,7,7,7,7,7,7,8,8,9,9,10,11,11,11,11`. Session ids and titles: `..\ref\sessions.json`. Plays' `later` text uses BOOK session numbers (S16A, S23 = The Strike), and Waypoint now resolves those references, so write them as `S23: …` at the start of a sentence whenever you can.

## What Waypoint now does with your content (use it)
- **Callbacks.** When the DM records a play, each sentence of its `later` that names a later session (`S9: …`, or "… in S9") appears in that session's prep brief under "Coming back tonight". So every `later` promise must be something the named session can actually deliver, ideally by a play there whose `when` reads the flag the first play set.
- **State-opened plays.** A play whose `when` holds only because a flag moved off its opening value ranks higher and is labelled "Because …". Gate follow-up plays on the state that earns them.
- **Endings** (`endings.cjs`, already rewritten; read it): every ending now needs `shrine=reached`; each has `reached` conditions the table records when the ending happens:
  - Concord: reached when `ysh=concord`.
  - Second Dawn: reached when `ysh=sealed` and `key=sealed`.
  - Hush Unbound: reached when `ysh=struck` and `oum` is `remake` or `unmake`.
  - Empty Choir: reached when `key=court` and `resistance=ended`; it also requires `resistance=ended`, which only a player choice sets.
- **Encounters**: Waypoint computes 2024 difficulty from the party and suggests retuning, so do not write "Moderate"/"Hard" labels in prose. Say "Written for four level-N characters" and how to adjust.

## New and changed flags (in flags.json now)
- `shrine` unreached|reached — set by the S25 descent plays.
- `oum` asleep|remake|unmake — set by the Unbound resolution plays.
- `resistance` active|ended — set ONLY by plays where the players choose to stop (surrender, a deal, walking away). Never by a lost fight.
- `allies` clock 0–6 — +1 per faction/company that agrees to stand with the party (S22 and earlier recruitment).
- `stormborn` none|harpers|dawn_mission|crew; `aurelie` unmet|met|ally|arrested; `stilled_trust` gained `wary`.
- You may ADD flags or options to flags.json if a play genuinely needs state (use the Edit tool on the file, append only, never rename or remove an id or option: live campaigns hold these values). Keep labels short and plain.

## Stat blocks
`statblocks.cjs` has 23 blocks; ids and CRs are fixed. New: `sb_maudrin_keeper` (Maudrin Vesk, Keeper of the Seventh, CR 12, base Archmage, legendary actions) for Maudrin holding the Key at the summit (S24) or the Hush Shrine (S26). `sb_maudrin` (CR 8) stays for the Strike (S23) and earlier. You may not edit statblocks.cjs; ask in your report if a block is wrong.

## Working rules
- Edit only the files assigned to you below. Keep strict JSON. Keep each file's existing structure (`{"plays":[],"briefs":[],"encounters":[]}`).
- Keep play ids stable when you revise a play (live campaigns may have recorded them). New plays get new ids. Delete a play only if it is wrong at its foundation, and say so in your report.
- `effects` must be what certainly follows. If a play has success and failure branches with different state, split it into two plays (`…` and `…-fails`) or move the state change to the play that confirms it.
- Every `later` promise must be deliverable. Either add the play that delivers it in the named session (gated on the flag), or cut the promise.
- After editing run: `node C:\Users\munch\Documents\Codex\2026-10-08\make\work\foresight\tools\validate-pack.cjs <your files>` until it reports 0 errors. Then run it on all six play files together to check id uniqueness.
- Voice: like the manuscript. Second person to the DM, short sentences, concrete names, numbers and DCs. `readAloud` is player-safe.
- Principles (AUTHORING rule 4) are hard rules: no forced outcomes; essential clues never lost to one failed roll; Tolls disclosed and consented to before a ringing, refusal cancels it; no permanent losses for absent players; child peril follows session-zero boundaries (Ila, Jonah, Bet are children: they may be threatened off-screen or rescued, never harmed on-screen, and every scene with them has an exit); telegraph danger and give a retreat; NPC fate follows actual play.
- Report at the end (under 400 words): what you changed by session, plays added/revised/removed, flags added, anything you could not fix, any stat block you think is wrong.
