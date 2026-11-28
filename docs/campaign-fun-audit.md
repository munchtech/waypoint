# The Seventh Bell: is it fun? (audit of revision 7.17)

*Method: required files read in full, the rest skimmed; 525 plays and 51 encounters counted from the act JSON. "Never read" means no play's `when` checks the flag, so Foresight never surfaces it.*

## Verdict

Yes, it's fun. It's a warm, unusually humane campaign with memorable NPCs, a signature mechanic (the Toll) that makes every bell a real decision, and a finale where the table, not the dice, picks one of four endings. But it plays more like a story game with D&D stats than a full D&D campaign. The party goes from level 3 to 11 with almost no treasure and no magic items, many fights are optional, and the six-bells-then-the-shrine spine never moves. The world dutifully tracks what the party does in clocks it almost never acts on, so the middle of the campaign reacts less than it appears to.

| Area | Score |
|---|---|
| 1. Fun | **8** |
| 2. Proper D&D activities | **5** |
| 3. Room for improv | **7** |
| 4. Ways to grow | **5** |
| 5. Can it change completely | **6** |
| 6. Pacing and act structure | **6** |

## Top strengths

1. **Set pieces and NPCs people will remember.**
   - Ila's opening question returns word for word in the epilogue (guide-s1.md:42, guide-s28.md:127).
   - The Sleeping Hall turns each player's session-zero fears into the Sleepless, with consent (guide-s16b.md:16, :154).
   - Old Garrow and his lamp: one act of kindness changes the dungeon (guide-s16a.md:94–121).
   - The Stairs ask for memories one card at a time (guide-s25.md:133–138).
   - Real humour: Garrow's laugh, Venn's clock, the goat (guide-s28.md:289).
2. **The Toll is a great hook.** Before a ringing you warn the Ringer of the kind and the weight of the cost, never the exact loss. The price is permanent and rises with every bell. A player can refuse and cancel the ringing, and the epilogue reads every Toll aloud (toll-rules.md; pack/epilogue.md). Ringing Ossa early is allowed (guide-s2.md:187). This is the campaign's best idea, and it ties straight back to session zero's "What is one thing your character has lost?" (session-zero.md:39).
3. **The climax is genuinely open.** Players can:
   - surrender (guide-s23.md:151);
   - take Maudrin's Final Offer (guide-s24.md:130);
   - give her the Key (guide-s24.md:137);
   - let her become the bell's voice (guide-s24.md:146);
   - help her seal the stairs, walk away, kill her, or grab the Key (guide-s26.md:133–137);
   - postpone with "no clocks, no punishment" (guide-s27.md:100).

   "A lost fight is never an ending" (canon.md:241). Allying with the villain is a real, supported choice.
4. **A safety net that never leaves the DM stuck.** Mysteries follow the three-clue rule:
   - Tam's death has four sources (guide-s2.md:67, :105, :153, :177).
   - The truth of the Key has three (guide-s13.md:206).
   - In S5, "The clues are free" (guide-s5.md:3).

   Every scene has "If they…" branches and "If you get stuck" moves, and S13's four outcomes "all work" (guide-s13.md:3).
5. **Pay-offs for kindness.** In S22's "Who comes", each player brings in one ally company (guide-s22.md:189–200), and each company reads an earlier flag (duel, ilam, cult, stilled_trust, stormborn, lamp). S9's "four good ways out" are each a friend they made (guide-s9.md:111–125).

## Top problems, ranked by how much they hurt play

**1. No treasure economy and no magic items, from level 3 to 11.**
- The only "magic item" in the whole pack is one a Toll *takes* away (toll-rules.md:33).
- The Rewards sections give very little:
  - "Treasure: only what they bargained for" (guide-s1.md:242).
  - "Coin: the vault holds none" (guide-s5.md:205).
  - Coin "Nothing if they didn't" sell the Heart (guide-s3.md:284).
  - Storm-stones are worth 800 gp but illegal to sell (guide-s16a.md:161, :250).
  - The finale's reward is "Breakfast" (guide-s28.md:309).
- There's no downtime system; the only long-rest rule ticks a clock (anytime.json `any-long-rest`).
- Players who like loot and shopping will feel starved by Act III.

*Fix:* Add one themed item per act and a memory-for-gear exchange using the existing motes and keeps.
- A memory-pearl that stores one spell slot, from S2.
- Rook's writ as a wondrous item, from S6.
- A Hieme frost-shard, from S14.
- The Bellwrights setting a storm-stone into a weapon or focus in S18A.
- Turn the Bellwrights' "Deferred Toll once a day" (guide-s18a.md:243) into an attuned bell-charm.
- By level 9, two Rare items per character.

**2. The faction clocks are tracked but never cashed in.**
- `clock_court` gets +1 from 63 play effects across S1–S22. It has a single threshold at 6 (flags.json `clock_court`), and no play's `when` reads it.
- The eight faction clocks (church, bellwrights, choir, dawn, ironhorn, hush, ferry, landing) each have a ready-written "Major move" at 6. No play or guide scene ever fires one. The guides just say "check the Ironhorn Clock" (guide-s17a.md:264, guide-s19a.md:268).
- `court_eye` is set 24 times and never read.
- Only the Tithe Clock bites (guide-s7.md:13, guide-s9.md:43).

As a result, the world moves on a fixed schedule rather than in response to what the party does.

*Fix:* Write one gated play per clock at 6, using the threshold text already in flags.json. Give `clock_court` steps at 6, 12 and 18 that change S20–S24: an extra Warden squad, a raid on a named friend, a checkpoint on the Tor road.

**3. The spine is fixed, and the Act IV fork is only an ordering choice.**
- Both branches are always played. The second is squeezed into S20–S21: "pick the best scene of each and let the rest happen on the way" (guide-s20.md:3), and "cross out the half of each scene you don't need" (guide-s20.md:12).
- The only real detour is going back for a missed bell (guide-s22.md:246).

*Fix:* Make the order cost something. Whichever bell comes second, the Court reached it first. On route A, the Hush Cult has recruited (`clock_hush`). On route B, Kessa's condition has worsened (`clock_ironhorn`). Also, only the Concord needs all six bells (endings.cjs), so let a party skip a branch knowingly and march on the Tor short-handed.

**4. Act III sags (S10–S13).**
- S10 is "mostly wonder and talk" (guide-s10.md:3).
- In S12 the boss "wants somebody to listen" (guide-s12.md:3); an hour of patience makes him Friendly with no roll (guide-s12.md:22).
- S13 is the same man's confession.
- S10, S11 and S12 have no gated plays, so nothing from Acts I–II reaches them.
- That's six sessions in one region before the next big choice.

*Fix:* Merge S12 and S13 into one evening. Put a pressure clock on Glassreach: the Court's envoy from S15 arrives early if `clock_court` ≥ 6. Add plays in S10–S12 that read an Act II flag (Isolde, the Warrant, `duel`).

**5. Early choices fade out.**
- Several flags are only read by plays early on:
  - Venn's 600 gp buyout (canon §6) — `venn` is read only by anytime plays.
  - The Pellmoor siege — `pellmoor` is read only in S4.
  - The writ — `writ` is read only in S1.
  - The Choir and the verse — read in S2–S3, and `choir` again in S27.
  - Quill — read up to S3.
  - Aurelie — read up to S9.
  - Eld — read up to S4.
- These choices come back mostly as one-line colour in the epilogue (guide-s28.md:18).
- Several options are never read by any play:
  - `venn: exposed`
  - `choir: released`
  - `blanks: turned`
  - `duel: haldric`
  - `corin: dead/voice`
  - `maudrin_favor: refused/repaid/broken`
  - `quill: dead`
- Some options are never set: `quill: ally`, `ila: tithed`.

*Fix:* Route them into S22's company table as allies or enemies:
- Venn's Coster shipping Court bronze if he was sold the Heart.
- The released Choir as an ally.
- Quill as a turncoat.

Then gate the existing S23 favour text (guide-s23.md:400) on `maudrin_favor` so that Foresight shows it.

**6. Growth is mostly loss.**
- Session zero's key answer is used to take more from the character: the Cantor and the Tolls (session-zero.md:39).
- No scene lets a character pursue or win back what they lost.
- There's no faction-standing track before the allies clock in S22.
- Levels come on a fixed schedule.

*Fix:* Give each character one personal beat per act, built from their session-zero answers. Let a Tithe jar or a bargain return the lost thing mid-campaign. Show each faction's standing (Hostile, Wary, Friendly, Sworn) in Waypoint.

**7. Combat is light and often optional.** 95 of 525 plays (18%) are Combat. S12 and S18B have no encounters, and S17A, S18A and S18B call themselves talk, an argument and "hardly any rolling". *Fix:* one optional "loud route" encounter per talk session, modelled on S16A's golems.

## Where choices don't matter

- **Route A versus B.** Both are visited; only the order changes (guide-s20.md:3).
- **The Court Clock and `court_eye`.** 87 ticks and marks, and no consequence.
- **Haldric winning the duel.** His favour "is worth nothing in a week" (guide-s6.md:202), and `duel: haldric` is never read again.
- **Selling the Heart to Venn.** It pays 600–900 gp (guide-s3.md:284), then nothing in Acts II–V reacts.
- **Defending Pellmoor.** The flag dies in S4.
- **The Stairs' price.** The casting-pit is free and "never stops them" (guide-s25.md:110), so the session's emotional core can be skipped with three Athletics checks. Deliberate, but make the stairs feel worth choosing.

## Biggest chances to let players reshape the campaign

1. **Work for, or reform, the Court from Act I.** Maudrin's S4 bargain already offers a writ, a pension and safe passage (guide-s4.md:231). Let a party that accepts become Court agents in Act II, with a "reform from inside" track that leads into the Final Offer and her offer to be the voice (guide-s24.md:130, :146).
2. **Make the empty chair a goal, not an epilogue question.** "Who will rule the Ninefold Shore?" (guide-s28.md:159–176) could be a mid-campaign contest fed by allies and faction standing, with Rook, Tristan, Kessa or a party member as the candidate.
3. **Open the Seam.** Leaving Corvane only pauses the plot (canon.md:174). Thrane thins the Stormwall, but only the epilogue shows it (guide-s28.md:190). Let the fleets and the Landing factions become an Act V front, or a way to end the campaign by abandoning Corvane.
4. **A path on the Hush's side.** "Are you coming to hear it, or are you coming to stop it?" (guide-s25.md:197). The Hush Cult could be a full faction to join, with an ending where the party chooses the Dreamer's sleep for the Dreamer's sake.

## Quick wins: the most fun for the least effort

1. **Cash in the clocks.** Write nine short gated plays that fire each faction clock's existing "Major move" at 6, and add steps at 12 and 18 to `clock_court`.
2. **One item per act.** Add a themed magic item to each act's Rewards: a pearl in S2, the writ in S6, a frost-shard in S14, a storm-stone weapon in S18A. Add one sentence on trading keeps for gear.
3. **Bring Act I back in S22.** Add three rows to the "Who comes" table (guide-s22.md:189): Venn's Coster, the released Choir, and Quill. Gate the S23 favour on `maudrin_favor`.
4. **Merge S12 and S13**, and let the Court's envoy arrive early when `clock_court` ≥ 6.
5. **Make the Act IV order cost something.** Add one gated play each in S20 and S21 showing what got worse at the bell they reached second.
