// v6 lore for the Seventh Bell update pack: campaign text edits, new wiki pages, page edits and session-plan edits.
// Every edit is find-and-replace against the v5 text, so the DM's own additions survive.
const S1='sb-ce895de5912506a9',S2='sb-7be12e377d5748b4',S3='sb-4296a01bb560bd61';

const s1Opening={find:`> "The fog lifts off the Mute Mere in long gray ribbons, and the village of Pellmoor comes into sight: reed roofs, leaning docks, nets like the sails of drowned ships. The chapel bell is silent. A girl stands on the ferry-dock, staring at the water with her hands folded tight. She does not look up when you arrive. She says, without turning: *'Are you here for the tongue, or for the bell?'*"`,
 replace:`> "The fog lifts off the Mute Mere in long gray ribbons, and Pellmoor Landing comes into sight: forty masts standing over water so still the ships look painted on it, and beneath them, just under the surface, the rooftops of a drowned town. On the Quays, a dozen languages argue over the price of a memory. Past the last warehouse, the old reed-roofed ferry village still leans toward the water as if none of this were happening. A girl stands on the oldest dock, staring at the water with her hands folded tight. She does not look up when you arrive. She says, without turning: *'Are you here for the tongue, or for the bell?'*"`};
const s1Do={find:`**DO:** Let the party respond. Whatever they say, Ila answers with a plain question: "Did you hear it too?"`,
 replace:`**DO:** First ask each player how their character arrived: off a ship through the Seam this morning, down the Mere road, or from a house in Pellmoor they've lived in for years. Then let the party respond to Ila. Whatever they say, Ila answers with a plain question: "Did you hear it too?"`};
const s1Quill={find:`**Scene 3: Hushman Quill Arrives.** On the second evening, Hushman Tobias Quill arrives with one guard to collect the village's memory quota and inspect for "unlicensed bell-work."`,
 replace:`**Scene 3: Hushman Quill Arrives.** On the second evening, Hushman Tobias Quill walks over from the Landing House with one guard to collect the Old Shore's memory quota and inspect for "unlicensed bell-work." Pellmoor pays its way in gold now, and gold cannot pay a Corvanese subject's Tithe, so his quota is short every season. If Master Venn has heard about the humming Tongue, Quill comes on the first evening instead.`};
const s1QuillSay={find:`Pellmoor is short on its quota this season. Several villagers have declined to give memories.`,replace:`Pellmoor is short on its quota this season. Several villagers have offered me gold, which I can't put on a shelf.`};
const s1Port={find:`**Session 1 end:**`,replace:`**The port (v6).** Pellmoor is Corvane's only lawful landing for foreign ships. Use the Quays, the Reckoning House and Strangers' Row as background and as places the party can go: Reckoner Sela Maunt explains memory money; Pilot-Mistress Brannagh Wick knew Tam; Master Orsolo Venn will want the humming Tongue the moment he hears of it. See the wiki pages PELLMOOR LANDING and MEMORY AS MONEY, and Foresight's prep brief for this session.

**Session 1 end:**`};
const s2Ferry={find:`- The ferry for the eastern marsh has not returned. Mother Sallow asks the party to find it.`,replace:`- The ferry for the eastern marsh has not returned. Mother Sallow asks the party to find it. Pilot-Mistress Brannagh Wick lends a skiff and a pilot; without one, the drowned rooftops just under the surface make the crossing a maze (DC 12 Wisdom (Survival)).`};
const s2Dive={find:`- In the deep water, Old Pellmoor's Ossa Belfry stands like a finger.`,replace:`- In the deep water, Old Pellmoor's Ossa Belfry stands like a finger, its top about forty feet down. Use the 2024 Suffocation rules (hold breath for 1 + Constitution modifier minutes) unless the Tidewarden grants an air pocket.`};
const s2Hadrik={find:`**Session 2 end:**`,replace:`**Complication (v6, optional): Brother Hadrik Voss.** A Kelemvorite priest from Strangers' Row means to "lay the dead to rest" by blessing the Mere during the Night Song. If he does, the Choir rises angry and a Drowned Singer comes ashore. He can be argued down from his own faith: Kelemvor's dead are owed judgment and remembrance, not erasure.

**Session 2 end:**`};
const s3Venn={find:`If the arrest succeeds, a rescue in Hallowmere becomes an Act II objective.`,replace:`If the arrest succeeds, a rescue in Hallowmere becomes an Act II objective.
5. **Sell it to Master Orsolo Venn** (v6). He pays 600 gp and loads it on the Coster ship *Gilded Heron*, which sails through the Seam in three days. *Consequence:* if it leaves Corvane, Ossa cannot be rung until it is recovered. Brannagh Wick can delay the ship a day by refusing it a pilot; the Seam crossing takes another.`};
const s3Writ={find:`Warden of Silence."`,replace:`Warden of Silence."

**DO (v6):** The letter's grey seal is a writ of passage for everyone it names, Stormborn included.`};
// Revision 7.1: Act I numbers made to match the 2024 encounters and stat blocks Foresight shows.
const s1Patrol={find:`**Encounter (optional, Quill's Patrol):** Quill and one Hushman. See Appendix A.`,replace:`**Encounter (optional, Quill's Patrol):** Quill and four Hushmen: one walks with him, three wait with the keep-cart at the end of the lane and come at the first shout. See Foresight's encounter and the guide below.`};
const s2Sneak={find:`Fight them (Appendix A), or sneak past with a DC 13 Stealth check.`,replace:`Fight them (Appendix A), or sneak past: each character makes a DC 15 Dexterity (Stealth) check, and the party slips by if at least half succeed.`};
const s2Eels={find:`**Encounter: Memory-Eels (2).** Each hit that does damage steals a memory on a failed DC 12 Wisdom save.`,replace:`**Encounter: Memory-Eels (six, for four level-3 characters).** A bite that deals damage steals a minor memory on a failed DC 10 Wisdom save; it comes back after a long rest.`};
const s2Singers={find:`The Drowned Choir attacks. **Encounter:** one Drowned Singer.`,replace:`The Drowned Choir attacks. **Encounter:** two Drowned Singers and two memory-eels.`};
// Revision 7.1: a full guide for a first-time DM, appended after each Act I session's plan.
// The guide text lives in guide-s1.md to guide-s3.md. `guide` marks these edits so the book can nest their headings under the session.
const fs=require('fs'),path=require('path');
// The guide as revision 7.1 installed it stays fixed (guide-sN-7.1.md), so tables that have it are not given a second copy.
// Revision 7.2 turns the "If they…" lines into play links ([label](play:id)) that open the play's card in the session notes:
// each run of changed lines between one revision's text and the next becomes one more edit, applied after the guide.
// Every revision a table may have installed is kept (guide-sN-7.1.md, guide-sN-7.2.md); guide-sN.md is the current text.
const read=f=>fs.readFileSync(path.join(__dirname,f),'utf8').trim();
const guideVersions=['7.1','7.2',''];
// `unless`: once a session has the guide's heading, the guide is in, even after the link edits have reworded some of its lines.
const guide=(n,find)=>({find,replace:find+'\n\n'+read('guide-s'+n+'-7.1.md'),unless:'## Running this session (new DM guide)',guide:true});
const diff=(n,old,now)=>{const out=[];if(old.length!==now.length)throw new Error('guide-s'+n+': each revision must keep the 7.1 line count');
 for(let i=0;i<old.length;i++){if(old[i]===now[i])continue;let j=i;while(j+1<old.length&&old[j+1]!==now[j+1])j++;const find=old.slice(i,j+1).join('\n');if(old.join('\n').split(find).length!==2)throw new Error('guide-s'+n+' line '+(i+1)+' is not unique');out.push({find,replace:now.slice(i,j+1).join('\n'),guide:true});i=j}return out};
const links=n=>{const texts=guideVersions.map(v=>read('guide-s'+n+(v?'-'+v:'')+'.md').split('\n'));return texts.slice(1).flatMap((now,i)=>diff(n,texts[i],now))};
const s1Guide=guide(1,`**Session 1 end:** The Hushmen raid Ila's house that night, or the party hears the Drowned Choir for the first time. Either way, end on the question: "Who was singing?"`);
const s2Guide=guide(2,`**Session 2 end:** End on the question: "Who was on the ferry?" Mother Sallow's ledger is missing a page, which opens Session 3.`);
const s3Guide=guide(3,`**DO (v6):** The letter's grey seal is a writ of passage for everyone it names, Stormborn included.`);
// Revision 7.4: a one-page table card after each guide (Waypoint prints it from the session notes).
const card=n=>{const last=read('guide-s'+n+'.md').split('\n').pop();return {find:last,replace:last+'\n\n'+read('table-card-s'+n+'.md'),unless:'## Table card',guide:true}};

const pellmoorBody=`- **Read-aloud:**
> **SAY:** "The Mute Mere is so still that the ships look painted on it. Forty masts stand over the water where a drowned town lies just beneath, rooftops like the backs of sleeping animals. On the Quays, a dozen languages argue over the price of a memory. Gnomes shout. Gulls do not; there are no gulls on the Mere. And at the far end of the waterfront, past the last warehouse, the old reed-roofed village of Pellmoor still leans toward the water as if none of this were happening."
- **What it is:** Corvane's only lawful port for foreign ships since the Landing Charter of 384 SS. Not a Court city: the Tithe Clock does not tick here. The Court is present through the Landing House and its six Hushmen.
- **Population:** About 4,000 year-round; nearly twice that in sailing season (spring to early autumn). Ferry-folk, Corvanese who came for work, and Faerûnian Landers.
- **The Old Shore:** the original ferry village. The old ferry-dock where Ila waits, the net-racks, the chapel (Brother Eld), Mother Sallow's reed-hut, the Harrow house, the ledger-house, the Inn of the Shuttered Bell, and the Mere Memory Shore. Foreigners are tolerated, not welcomed. Children still do not play near the water.
- **The Quays:** deep-water piers driven into Old Pellmoor's drowned roofs; warehouses, chandlers, a dry-dock; the **Pilots' Hall** (Brannagh Wick) and the **Landing House** (Tobias Quill; landing due 5 gp; writs of passage).
- **The Tally:** the market square. The **Reckoning House** (Reckoner Sela Maunt) posts the day's rate on a slate: *1 KEEP = 1 GP 2 SP. MOTES AT 1 SP. HEARTKEEPS BY APPRAISAL.*
- **Strangers' Row (the Loud Quarter):** the Faerûnian quarter. The Brass Lantern inn, the Vennmark Coster's counting-house (Master Orsolo Venn), the Corvane Venture hall, the Dawn Mission (Sister Aurelie), a dwarven smithy, a gnomish clockmaker selling silent clocks, a Kelemvorite shrine-tent (Brother Hadrik).
- **Dangers:** The Drowned Choir sings at night. Hushmen walk the Old Shore weekly and watch the Quays daily. Memory leeches and Zhentarim smugglers work Strangers' Row.
- **Secrets:** The chapel's cellar holds a rope that once rang Old Pellmoor's bell, and its end is still tied to something under the water. Every ship that leaves the Mere needs a Pilots' Hall pilot, so the ferry-folk can stop any departure.
- **Atmosphere:** Two towns in one. Loud, bright and foreign on the Quays; quiet, careful and mournful on the Old Shore.`;

const pages=[
 {id:'v6-realms',title:'CORVANE IN THE REALMS (v6 canon)',kind:'Lore',status:'Confirmed',visibility:'DM only',aliases:'Forgotten Realms, Faerun, Faerûn, Sword Coast, Trackless Sea, Stormborn, Loudfolk, revision 6',body:`*Revision 6 canon. Where this page and v5 disagree, this page wins. The Canon Sheet (3.3) still governs every date and family line it lists.*

**Where Corvane is.** Corvane is a continent called **Hesk**, far out in the Trackless Sea beyond the last Sword Coast charts, part of the Forgotten Realms. A permanent band of storm circles it at sea, thirty to sixty miles deep: Faerûnian sailors call it **the Stormwall**, Corvanese who know of it call it **Thrane's Hem**. For four centuries no ship crossed it. Sword Coast sailors kept a legend of "the Ringing Land" west of the world; Candlekeep holds one water-stained portolan labelled *the Belled Coast*.

**DM truth: what the Stormwall is.** When Thrane fell silent on the Quiet Night, its storms did not end. They lost their shepherd and were pushed outward to the edge of the bells' resonance, where Ysh's lullaby stops. That is why no storm has crossed Brassfall in four hundred years: every storm Corvane should have had is in the Wall. Nobody knows this. Corin Aldeth suspects it; Edda Thorne's Notes imply it in one line ("Thrane's weather will go to the rim and wait").

**Before the Silence.** A few Faerûnian ships reached Corvane before the Quiet Night. Some of the Stilled in Glassreach are those sailors, frozen in 2 SS in Sword Coast clothes four centuries out of fashion.

**The Wrongweather (382 SS / 1462 DR).** The Ironhorn raid broke Old Garrow's sealed shafts. The dead lightning that poured out called to the storms at the rim, and for one night a storm tore up the river Pell onto the Mute Mere, the first weather the Mere had seen in 380 years. Davin Sallow drowned in it. When it passed it left a calm channel through the Wall: **the Seam**. At dawn the battered Baldur's Gate cog *Gull's Wager* drifted onto the Mere.

**Thirty years of contact.** Ilse Vesk's **Landing Charter** (384 SS) made Pellmoor the only lawful landing. Foreigners trade freely there but need a Court **writ of passage** to travel inland. Traffic has grown from one ship a year to forty or sixty a season. In come gold and silver, steel, paper, books, spices, wine, lenses and Lantanese clockwork (the Landing House removes every chime). Out go bottled memories (the richest export by far), glass-flowers, memory-pearls, reed-dye, bone-bound books and Ironhorn horses. Storm-stones and bronze are banned exports and smuggled anyway.

**Who is here.** The Vennmark Coster of Athkatla (Master Orsolo Venn), the Waterdhavian Corvane Venture, Baldurian factors, Lantanese gnome tinkers, Mirabar dwarves who want bronze, two quiet Harper agents, and Zhentarim memory smugglers. Lathander's Dawn Mission, a Kelemvorite shrine-tent and Chauntea's faithful; the Ninefold Church calls them "the loud gods."

**People and words.** Corvanese call Faerûnians **Stormborn** (polite) or **Loudfolk** (rude); Faerûnians call Corvanese **Bellfolk** or **the Quiet**; settled Faerûnians are **Landers**. Corvanese are mostly human, with halfling ferry-families, dwarven mining clans in Brassfall and very few elves. Dragonborn, tieflings, orcs, goliaths, gnomes and aasimar arrived with the ships, and Corvanese stare. Corvanese speak **Hesk**; Common is Pellmoor's second tongue.

**Magic.** Spells work by the 2024 rules. In Corvane every spell hums faintly as it is cast: that hum is Tonework, and it is how the Weave sounds here. Silence-stones suppress spells under the house rule in 2.6.

**Calendar.** 412 SS = 1492 DR.`},
 {id:'v6-stormwall',title:'THE STORMWALL AND THE SEAM',kind:'Location',status:'Confirmed',visibility:'DM only',aliases:"Stormwall, Thrane's Hem, the Seam, Pellmouth, river Pell, Wrongweather",body:`- **Read-aloud:**
> **SAY:** "Ahead, the sea stands up. A wall of black cloud and white water runs from one horizon to the other, lit from inside by lightning that never stops. And in it, like a door left open, a lane of grey calm a mile wide."
- **What it is:** a permanent band of storm thirty to sixty miles deep that circles Corvane at sea. DM truth: Thrane's lost storms, waiting at the rim of the bells' resonance.
- **The Seam:** the one calm channel through it, opened by the Wrongweather of 382 SS, in line with the mouth of the river Pell. A mile or two wide; it drifts with the seasons. Crossing takes about a day with a pilot who knows its moods.
- **The river Pell:** about forty miles from the Pellmouth inland to the Mute Mere. Two days by river.
- **Dangers:** drifting off the Seam. Ships that do are rarely seen again; pilots who come back describe a warm grey light at the storm's heart (see 11.7, the Edge of the Dream).
- **If Thrane rings:** the storms come home to Brassfall. For a season the Seam widens into a broad road and new fleets arrive within a month. If an ending stabilises Thrane (the Concord, or the Second Dawn with Thrane rung), the Stormwall thins to ordinary sea weather over a few years and Corvane joins the world.
- **Voyage:** about six weeks from Baldur's Gate or Waterdeep. Sailing season is spring (Ches) to early autumn (Eleint).`},
 {id:'v6-memory-money',title:'MEMORY AS MONEY',kind:'Lore',status:'Confirmed',visibility:'DM only',aliases:'memory currency, keep, keeps, mote, motes, heartkeep, knowing, reckoner, gilding, exchange rate, coin, gold',body:`Corvane traded memories long before the ships came. The Court's Tithe made it a habit and the Reckoners made it a currency. Gold arrived thirty years ago and is winning, slowly.

**How it works**
1. **Drawing.** A memory can be drawn out of a person only with their consent, by a Court-licensed **Reckoner** with a tuning fork and a small stoppered vial of Mere-glass. It takes about a minute and feels like forgetting a word on the tip of your tongue, then not minding. Drawing without a licence is *leeching*, a crime.
2. **Keeps.** A drawn, sealed memory is a **keep**: a vial of faintly luminous mist that hums one low note when held. Reckoners grade it by **weight** (how much feeling it holds) and stamp the wax. The content stays private unless someone opens it.
3. **Keeps circulate sealed,** passed hand to hand like banknotes. Their value rests on two facts: someone will always pay to witness one, and its owner can always redeem it.
4. **Opening.** If the original owner opens a keep, the memory returns whole. Anyone else *witnesses* it, as a guest in someone else's day, without acquiring the owner's identity. Each stranger's witnessing fades it; after three it is a grey, spent vial.
5. **What cannot be drawn:** skills, spells, languages, proficiencies, anything a character can do. "You can sell the day you learned to swim, but never the swimming." Nobody can sell someone else's memory.
6. **Blanks** are people who sold or Tithed so many heavy memories that they no longer recognise their own families.

| Weight | What it holds | Worth at Pellmoor | Notes |
|---|---|---|---|
| **Mote** | A passing memory: last Ossday's supper, a stranger's coat | about 1 sp | Grey wax. Small change. |
| **Keep** | A memory with feeling: a good afternoon, a small win | about 1 gp (floats daily) | Plain wax. The everyday coin. |
| **Heartkeep** | A defining memory: a parent's face, a wedding day | 25 to 100 gp or more | Red wax. The Tithe prefers them. |
| **Knowing** | Knowledge: a route, a recipe, a password, a face | by usefulness | Blue wax. The seller loses the knowledge. |

**Gold, and why the Court hates it.** Old Corvanese coin was iron "ticks" and Court scrip; bronze is bell-metal. Gold cannot be Tithed, cannot fade, cannot be Reckoned. At Pellmoor nearly every stall takes either. **Court taxes on Corvanese subjects must be paid in memory; foreigners pay the landing due in gold.** Paying a local's Tithe in gold is **gilding**: illegal and common. A keep fetches about 1 gp 2 sp at Pellmoor and about 8 sp in Hallowmere. The Hallowmere gate's courtesy memory is a registration, not a fee, and the clerk refuses gold.

**Table rules (2024)**
- A character may pay in memory wherever coin is accepted in Corvane. The player chooses the memory and writes one line in the Memory ledger (Foresight → Party & ledger). The DM never chooses it.
- A Reckoner buys memories at the posted rate less a 10 percent fee.
- Motes and keeps have no mechanical effect. When a character sells a heartkeep, the player rewrites one thing the memory held up (a belief, a bond, a fear). It never removes player knowledge or control of the character.
- The DM may award **Heroic Inspiration** when a character gives a memory freely to someone who needs it.
- Once, a character who witnesses a Knowing keep has Advantage on one ability check that knowledge plainly helps.
- Keep the kinds apart: a **Toll** can never be bought back; a **Tithe** can be redeemed from its jar; a **trade** is a keep; **Mere Memories** are borrowed; **eel bites** return after a long rest; **stairs** losses follow the stairs' rule.`},
 {id:'v6-landing',title:'THE LANDING (Foreign traders at Pellmoor)',kind:'Faction',status:'Confirmed',visibility:'DM only',aliases:'Vennmark Coster, Corvane Venture, Harpers, Zhentarim, Landers, foreign traders, merchants',body:`- **Wants:** Profit, above all from bottled memories. An end to the Landing Charter's limits (or, for the Coster, an exclusive export licence). Safe passage through the Seam.
- **Fears:** The Court closing the Seam to them. A rival house winning the Court's favour. The Wall moving.
- **Methods:** Gold, credit, gifts to officials, hiring ferry-folk pilots, and buying memories in bulk.
- **Ideal:** *Prosperity.*
- **Members:** the Vennmark Coster of Athkatla (Master Orsolo Venn; the largest memory exporter), the Waterdhavian Corvane Venture (cautious, respectable), Baldurian factors, Lantanese tinkers, Mirabar dwarves after bronze. In the shadows: two Harper agents who distrust the Tithe, and a Zhentarim smuggling ring on Strangers' Row.
- **Secret:** The Coster buys "surplus" Tithed memories from the Court and ships them to Faerûn. The Tithe-Ledger has an EXPORT — VENNMARK column. Some Blanks' memories are in Athkatla.
- **How They React:** Warmly to customers, coldly to anyone who costs them money. They will not fight the Court, and they will not fight for it.
- **Clock move (at 6):** the Coster wins an export licence, a new fleet arrives, or a Zhentarim memory-smuggling ring is exposed.`},
 {id:'v6-npc-brannagh',title:'26. PILOT-MISTRESS BRANNAGH WICK',kind:'NPC',status:'Confirmed',visibility:'DM only',aliases:"Brannagh, Wick, Pilots' Hall, pilot",body:`- **Role:** Runs the Pilots' Hall on the Quays. Every ship that crosses the drowned town does it with one of her pilots. Tam Harrow was one of them.
- **Look:** Ferry-folk, about 60. Short, wind-cracked hands, a coil of sounding-line always over one shoulder.
- **Voice:** Gruff. Counts tides out loud. Calls every ship "she" and every captain "lad."
- **Wants:** The Hall kept independent of the Court and the trading houses. Ila safe.
- **Secret:** Tam took his boat out the night he died with no cargo and no ship to pilot, which no pilot does. She told the Landing House nothing. She thinks he was going to the Ossa Belfry, and she is right.
- **2024 stat block:** Scout (CR 1/2).
- **How She Reacts:** Trusts people who keep their word on the water. Will refuse a pilot to any ship she has a reason to stop, and every ship needs one to leave the Mere.`},
 {id:'v6-npc-sela',title:'27. RECKONER SELA MAUNT',kind:'NPC',status:'Confirmed',visibility:'DM only',aliases:'Sela, Maunt, Reckoner, Reckoning House',body:`- **Role:** Court-licensed memory assayer at the Reckoning House on the Tally. The person who explains memory money to newcomers.
- **Look:** Corvanese, 40s. Grey apron, three tuning forks in a breast pocket, reading lenses bought from a Lantanese tinker.
- **Voice:** Precise, kind, slightly tired. Taps a fork against the counter when she thinks.
- **Wants:** Honest weights and a quiet life.
- **Secret:** She keeps a "Lost Shelf" of heartkeeps sold in grief and quietly lets the sellers buy them back at cost, which the Court forbids.
- **2024 stat block:** Commoner (CR 0).
- **How She Reacts:** Helps anyone who is kind to her: she can read a keep's weight, tell a forged keep from a true one, and explain gilding without saying the word. She will not appraise a bell's Tongue: "That's not a memory, love. That's a bell."`},
 {id:'v6-npc-venn',title:'28. MASTER ORSOLO VENN',kind:'NPC',status:'Confirmed',visibility:'DM only',aliases:'Venn, Orsolo, Vennmark Coster, Gilded Heron, merchant, Amnian',body:`- **Role:** Factor of the Vennmark Coster of Athkatla, the largest memory exporter in Pellmoor. A human-sized antagonist of the memory trade.
- **Look:** Amnian, 50s. Plum velvet in a grey country, rings on every finger, a silent Lantanese pocket-clock he consults constantly.
- **Voice:** Warm, fluent Hesk with an Amnian lilt. Calls everyone "friend" and means "customer."
- **Wants:** An exclusive export licence from the Court. Curiosities from the Ringing Land for his buyers in Athkatla.
- **Secret:** He pays Tobias Quill to look away from certain cargoes. A buyer in Athkatla offers 5,000 gp for "a true bell-relic of the Ringing Land." The Coster buys Tithed memories from the Court for export, and its ledgers prove it.
- **The Gilded Heron:** the Coster's carrack, anchored beyond the last pier. Two Coster guards (Tough) on watch; a Baldurian crew who won't fight for the Coster.
- **2024 stat block:** Noble (CR 1/8), with two Toughs (CR 1/2) as guards.
- **How He Reacts:** Generous, then persistent. Prefers money to trouble and folds when a deal turns violent or public. Holds grudges in ledgers, not in alleys.`},
 {id:'v6-npc-aurelie',title:'29. SISTER AURELIE DAWNMANTLE',kind:'NPC',status:'Confirmed',visibility:'DM only',aliases:'Aurelie, Dawnmantle, Lathander, Morninglord, Dawn Mission',body:`- **Role:** Morninglord priestess of Lathander who runs the Dawn Mission on Strangers' Row. Optional ally for clerics, paladins and anyone hurt.
- **Look:** Waterdhavian, 30s. Rose-and-gold vestments faded by the Corvanese light.
- **Voice:** Bright and earnest. Says "when the sun comes back" as if it were a date in a diary.
- **Wants:** A writ of passage to Hallowmere, to bring Lathander's dawn to a city that has none.
- **Secret:** The Court has refused her writ four times. She is close to trying without one, which would get her arrested.
- **2024 stat block:** Priest (CR 2).
- **How She Reacts:** If the party tells her about Vaer's bell, she becomes a devoted ally, and a liability, in Act II. Heals for a donation, or for a true story about a sunrise.`},
 {id:'v6-npc-hadrik',title:'30. BROTHER HADRIK VOSS',kind:'NPC',status:'Confirmed',visibility:'DM only',aliases:'Hadrik, Voss, Kelemvor, Kelemvorite',body:`- **Role:** Kelemvorite priest with a shrine-tent on Strangers' Row. Believes the restless dead of the Mere are an abomination to be laid to rest.
- **Look:** Grey robes, a skeletal-hand pendant, a censer he never lets go out.
- **Voice:** Low and certain. Quotes the Doomguide.
- **Wants:** To lay the Drowned Choir to rest, by force if need be.
- **Secret:** His own brother drowned at sea and was never found. The Mere's unrestful dead feel like an accusation.
- **2024 stat block:** Priest (CR 2).
- **How He Reacts:** Can be argued down from his own dogma: Kelemvor's dead are owed judgment and remembrance, not erasure (DC 15 Persuasion; a DC 12 Religion Study first grants Advantage). If he blesses the Mere during the Night Song, the Choir rises angry.`},
 {id:'v6-places',title:"PELLMOOR LANDING: THE QUAYS, THE TALLY AND STRANGERS' ROW",kind:'Location',status:'Confirmed',visibility:'DM only',aliases:"Landing House, Reckoning House, Pilots' Hall, Strangers' Row, Loud Quarter, Brass Lantern, Quays, Tally",body:`**The Landing House (Quays).** Court customs. A grey stone hall with a silence-stone lintel. Writs of passage, the 5 gp landing due, cargo seals, and the chime-removal bench where every imported clock is silenced. Six Hushmen and Tobias Quill's office.
> **SAY:** "The clerk stamps your papers without reading them. 'Landing due, five gold. Pellmoor and the Mere road only. Anywhere else needs a writ from Hallowmere. They take about a season. Next.'"

**The Pilots' Hall (Quays).** A long reed-roofed shed built over the water, its floor a map of Old Pellmoor's drowned streets in painted planks. Brannagh Wick's pilots wait on benches for ships.

**The Reckoning House (the Tally).** A narrow shop with a slate by the door and a counter scored by tuning forks. Sela Maunt weighs keeps under a Lantanese lens. Behind a curtain: the Lost Shelf.
> **SAY:** "The slate by the door reads, in careful chalk: 1 KEEP = 1 GP 2 SP. MOTES AT 1 SP. HEARTKEEPS BY APPRAISAL. Underneath, smaller: NO GOLD FOR TITHES."

**Strangers' Row, the Loud Quarter.** Foreign inns, counting-houses, the Dawn Mission, a dwarven smithy, a gnomish clockmaker selling silent clocks, Brother Hadrik's shrine-tent, and music at all hours.

**The Brass Lantern.** The Faerûnian inn. Loud, warm, overpriced, and the only place in Corvane that serves Waterdhavian ale. The *Gull's Wager*'s old first mate drinks in the corner.`},
 {id:'v6-rules-2024',title:'2024 RULES NOTES (v6)',kind:'Ruling',status:'Confirmed',visibility:'DM only',aliases:'2024, 5.5e, rules, Heroic Inspiration, Influence, Extreme Cold, Suffocation, Exhaustion, encounter budget',body:`- **Heroic Inspiration** replaces v5's "Inspiration."
- **Influence** (action): social plays use it. The DC is 15 or the creature's Intelligence score, whichever is higher; its attitude (Friendly, Indifferent, Hostile) decides whether a check is needed at all.
- **Study** (Intelligence) and **Search** (Wisdom) actions: clue scenes use them. Essential clues are never lost to a failed roll.
- **Extreme Cold** (Glassreach): end of each hour, DC 10 Constitution save or 1 Exhaustion level. Cold Resistance or Immunity succeeds automatically; so does a warm cloak or cold-weather gear (house rule kept from v5).
- **Exhaustion:** each level gives −2 to d20 Tests and −5 feet of Speed; a long rest removes 1 level; level 6 is death.
- **Suffocation:** hold breath for 1 + Constitution modifier minutes (minimum 30 seconds); out of breath, 1 Exhaustion level at the end of each turn, all removed when breathing again.
- **Frigid Water:** minutes equal to the Constitution score, then a DC 10 Constitution save each minute or 1 Exhaustion level.
- **Conditions** use the 2024 definitions. A Toll of Sense uses Blinded or Deafened.
- **Encounters:** Waypoint's Foresight computes difficulty from your roster with the 2024 XP budget per character (Low, Moderate, High). Corvane creatures have full 2024 stat blocks built on 2024 Monster Manual creatures; open them from any encounter.
- **Spells that touch memory** (Modify Memory, Greater Restoration, Remove Curse, Speak with Dead, Zone of Truth and others) have rulings in Foresight's anytime plays. Search "If they…" for the spell's name.`},
 {id:'v6-changes',title:'WHAT CHANGED IN REVISION 6',kind:'Lore',status:'Confirmed',visibility:'DM only',aliases:'v6, revision 6, changes, change log',body:`**World.** Corvane is part of the Forgotten Realms, hidden behind the Stormwall until the Wrongweather opened the Seam in 382 SS (1462 DR). Pellmoor is now Pellmoor Landing, a port of about 4,000. Memory is a working currency alongside gold (MEMORY AS MONEY). New NPCs 26–30. New faction: THE LANDING.

**Act I.** New Session 1 opening (arrival at the port). Quill works from the Landing House and is short because Pellmoor pays in gold; H-03 can be solved by giving memories on the villagers' behalf. New Session 3 option: sell the Tongue to Master Venn (the *Gilded Heron* sails in three days). Optional complication: Brother Hadrik Voss blesses the Mere. Brannagh Wick is a fourth source on Tam's death; any two still establish the Court's responsibility.

**Act II.** Stormborn need a writ at the Hallowmere gate; the Chancellor's invitation counts. Optional reveal: the Tithe-Ledger's EXPORT — VENNMARK column.

**Act III.** Some Stilled are Faerûnian sailors from before the Silence. Glassreach uses 2024 Extreme Cold.

**Act IV.** Ringing Thrane loosens the Stormwall for a season. New Session 22 ally if earned: the Stormborn.

**Endings.** A stabilised Thrane thins the Stormwall for good; in the Empty Choir the Court keeps the Seam.

**Part 9.** Situation 17 now has ships home; Situation 18 has a sailor's dragon story; the Edge of the Dream lies inside the Stormwall.

**Rules.** 2024 throughout (2024 RULES NOTES). Full stat blocks and calculated encounter difficulty live in Foresight.`},
];

const pageEdits=[
 // Revision 7.4: the session zero script becomes a full guide for a first-time DM (session-zero.md).
 {id:'sb-b61bdde01a01cdcf',edits:[{find:'__WHOLE__',replace:read('session-zero.md')}]},
 {id:'sb-462b2b0d93fd03c2',title:'PELLMOOR LANDING (Port)',edits:[{find:'__WHOLE__',replace:pellmoorBody}]},
 {id:'sb-74c9bfaa3dfbf94e',edits:[{find:`- **Key NPCs:** Dorra Pell, the innkeeper. She does not like questions but remembers every face.`,replace:`- **Key NPCs:** Dorra Pell, the innkeeper. She does not like questions but remembers every face, and now every ship that brought one. The ferry-folk drink here; Stormborn are served politely and not invited back.`}]},
 {id:'sb-bb6db9d171c44c8e',edits:[{find:`- **Wants:** To be left alone. Safe passage. Their dead remembered properly.`,replace:`- **Wants:** To be left alone, which the port has made impossible. Safe passage. Their dead remembered properly. The Pilots' Hall kept free of the Court and the trading houses.`},{find:`- **Methods:** Ferries, net-fishing, careful silence, and keeping the old ledger of names.`,replace:`- **Methods:** Ferries, net-fishing, piloting every foreign ship across the drowned town (the Pilots' Hall), careful silence, and keeping the old ledger of names.`}]},
 {id:'sb-7d90e0f92bf832a7',edits:[{find:`drowned in the Mere in a storm 30 years ago.`,replace:`drowned in the Mere in the Wrongweather of 382 SS, the only storm to reach the Mere in four centuries, on the night the Stormwall opened.`},{find:`- **Stat-lite:** Mage (CR 2), reed-healing as a druid-style spell list. Can read the ledger.`,replace:`- **2024 stat block:** Druid (CR 2), with reed-healing flavour. Can read the ledger.`}]},
 {id:'sb-05a5ed45d00c57f5',edits:[{find:`- **Role:** Quiet Court collector who appears in Pellmoor in Act I.`,replace:`- **Role:** Quiet Court Tithe officer at Pellmoor's Landing House. Collects the Old Shore's memory quota, which falls short every season because Pellmoor pays its way in gold.`},{find:`- **Secret:** He has been Tithed himself. He does not remember his sister.`,replace:`- **Secret:** He has been Tithed himself. He does not remember his sister. Master Venn pays him to look away from certain cargoes.`},{find:`- **Stat-lite:** Hushman (CR 1/2).`,replace:`- **2024 stat block:** Hushman (CR 1/2, built on the Tough).`}]},
 {id:'sb-17dfab311eab22ea',edits:[{find:'__WHOLE__',replace:`> **SAY:** "There is a world beyond the Stormwall, and ships sail to it from Pellmoor every week in season. Six weeks to the Sword Coast. Is that where you want to go?"

**DO:** Let them, if they insist. Leaving pauses the plot: advance every faction clock by two for each month away, and send news of what the Court did in their absence. A writ of departure is needed to board legally; the Pilots' Hall can arrange otherwise. The party may bring Faerûnian help back (Harpers, a Lords' Alliance envoy, a Dawn Mission delegation); it arrives as an Act IV ally option.

If they seek the edge of Corvane rather than another country, use the Edge of the Dream (Part 11.7), which now lies inside the Stormwall.`}]},
 {id:'sb-1544058b8aa034c0',edits:[{find:`> **SAY:** "There's no dragon here.`,replace:`> **SAY:** "There's no dragon in Corvane. Sailors swear one tried the Stormwall in 1479 DR and fell burning into the sea.`}]},
 {id:'sb-5a325d54bcf0a480',edits:[{find:`*Use only if the party seeks the edge of Corvane.*`,replace:`*Use only if the party seeks the edge of Corvane. In v6 it lies inside the Stormwall: pilots who drift off the Seam describe it, and a few never come back.*`},{find:`> **SAY:** "The land ends in a soft gray shore, and beyond it there is no sea.`,replace:`> **SAY:** "In the heart of the storm, the rain stops. The sea ends in a soft gray shore, and beyond it there is no more sea.`}]},
 {id:'sb-dac370a4079258bd',edits:[{find:`Corvane is one continent, **Hesk**, bordered by the **Ninefold Shore** to the south and east. The campaign happens in the middle of the continent.`,replace:`Corvane is one continent, **Hesk**, far out in the Trackless Sea of the Forgotten Realms and ringed at sea by the **Stormwall**. Its only passage, **the Seam**, opens at the mouth of the river Pell, which runs about forty miles inland into the Mute Mere. The **Ninefold Shore** lies to the south and east. The campaign happens in the middle of the continent.`},{find:`The living village of **Pellmoor** sits on its western shore.`,replace:`**Pellmoor Landing**, Corvane's only lawful port for foreign ships, sits on its western shore where the Pell flows in.`},{find:`| Brassfall | Ironhorn Steppe | 2 days | The foothills camp is the Ironhorn's southern ring. |`,replace:`| Brassfall | Ironhorn Steppe | 2 days | The foothills camp is the Ironhorn's southern ring. |
| Pellmoor | The Pellmouth and the Seam | 2 days by river | Every ship needs a Pilots' Hall pilot to cross the drowned town. |
| The Seam | The Sword Coast | about 6 weeks by sea | Sailing season runs from spring to early autumn. |`}]},
 {id:'sb-92741125e3ccd18d',edits:[{find:`The current year is **412 SS** (*Since the Silence*). Years are counted from the Quiet Night.`,replace:`The current year is **412 SS** (*Since the Silence*). Years are counted from the Quiet Night. Faerûnian sailors count by Dalereckoning: **412 SS is 1492 DR**, and the Wrongweather that opened the Seam was 382 SS (1462 DR).`}]},
 {id:'sb-33f69fa6e5d53e5d',edits:[{find:`*Effect:* a character who spends more than an hour inside Glassreach without a warm cloak takes 1 cold damage per hour after that first hour.`,replace:`*Effect (2024):* Extreme Cold. At the end of each hour in Glassreach, a creature makes a DC 10 Constitution saving throw or gains 1 Exhaustion level. Cold Resistance or Immunity means automatic success; so does a warm cloak or other cold-weather gear (house rule).`}]},
 {id:'sb-d3423e2d2b3dd814',edits:[{find:`The Church has nine Quiet Orders.`,replace:`The Church has nine Quiet Orders.

**The loud gods.** Thirty years of ships have brought Faerûn's faiths to Pellmoor. Lathander's Dawn Mission, Kelemvor's shrine-tent and Chauntea's wandering faithful are tolerated at the Landing and forbidden in Hallowmere. Their divine magic works in Corvane, humming like any Tonework. The Church calls them the loud gods and preaches that they are only another kind of noise.`}]},
 {id:'sb-a3f365d1e9b361a9',edits:[{find:`- **Fears:** A ringing bell. A Blank who remembers. A second Vesk with a claim to the Key.`,replace:`- **Fears:** A ringing bell. A Blank who remembers. A second Vesk with a claim to the Key. Gold, which cannot be Tithed. A ringing of Thrane, which might open the sea.`},{find:`- **Methods:** Tithe collections, silence-stone checkpoints, Hushmen patrols, and bribery of local officials.`,replace:`- **Methods:** Tithe collections, silence-stone checkpoints, Hushmen patrols, bribery of local officials, and the Landing Charter, which confines foreign ships to Pellmoor and foreign travellers to the Mere road unless they hold a Court writ.`}]},
 {id:'sb-383b3cb05c2946e1',edits:[{find:`They were travelers from elsewhere, caught by the same winter when they stepped into the forest.`,replace:`They were Faerûnian sailors and travellers from before the Silence, caught by the same winter when they stepped into the forest. A woken one speaks an old dialect of Common, wears Sword Coast clothes four centuries out of fashion, and asks what year it is.`}]},
 {id:'sb-3dc9d00a65073616',edits:[{find:`seizes control of the Quiet Court and names herself its first Warden of Silence.`,replace:`seizes control of the Quiet Court and names herself its first Warden of Silence.

**382 SS (1462 DR): The Wrongweather.** The dead lightning loosed from Garrow's broken shafts calls to the storms trapped at the rim. For one night a storm tears up the river Pell onto the Mute Mere, the first weather the Mere has seen in 380 years. Davin Sallow drowns in it. When it passes, it leaves a calm channel through the Stormwall: the Seam. At dawn the Baldur's Gate cog *Gull's Wager* drifts onto the Mere, the first Faerûnian ship in Corvane in four centuries.

**384 SS: The Landing Charter.** Ilse Vesk declares Pellmoor the only lawful landing for foreign ships and requires a Court writ of passage for foreigners travelling inland. Pellmoor begins to grow from a ferry village into a port.`}]},
 {id:'sb-d4ca8dffe70dad97',edits:[{find:`| The Ringing of Calla | Requires Calla's Tongue (Tithe-Ledger Room). The Old Granary is at Kell's Crossing. |`,replace:`| The Ringing of Calla | Requires Calla's Tongue (Tithe-Ledger Room). The Old Granary is at Kell's Crossing. |
| Corvane and the Realms (v6) | Corvane (Hesk) lies in the Trackless Sea of the Forgotten Realms, behind the Stormwall. 412 SS = 1492 DR. |
| The Wrongweather (v6) | 382 SS (1462 DR). Opened the Seam. Davin Sallow drowned in it. The *Gull's Wager* arrived the next dawn. |
| The Landing Charter (v6) | 384 SS. Pellmoor is the only lawful landing; foreigners need a Court writ to travel inland. |
| Pellmoor Landing (v6) | A port of about 4,000 year-round. Not a Court city; the Tithe Clock does not tick there. |
| Memory as money (v6) | Motes, keeps, heartkeeps and knowings circulate alongside gold. Court taxes on Corvanese must be paid in memory. |`}]},
 {id:'sb-bd2168516d60df6d',edits:[{find:`*Alphabetical. Terms in* italics *have their own entry.*`,replace:`*Alphabetical. Terms in* italics *have their own entry.*

**New in v6.** **Gilding:** paying a Corvanese subject's Tithe in gold; illegal. **Heartkeep:** a sealed defining memory, red wax. **Keep:** a sealed memory used as money. **Knowing:** a sealed memory that carries knowledge; the seller loses it. **Landing Charter:** the Court law that confines foreign ships to Pellmoor. **Lander:** a Faerûnian settled in Pellmoor. **Loudfolk, Stormborn:** Corvanese names for Faerûnians. **Mote:** a sealed trivial memory; small change. **Reckoner:** a Court-licensed memory assayer. **The Seam:** the one passage through the Stormwall. **The Stormwall:** the band of storm that circles Corvane at sea. **The Wrongweather:** the storm of 382 SS that opened the Seam. **Writ of passage:** the Court paper a foreigner needs to travel inland.`},{find:`**Ferry-folk.** The people of Pellmoor. Practical, suspicious of outsiders, careful record-keepers.`,replace:`**Ferry-folk.** The old families of Pellmoor's Old Shore. Practical, suspicious of outsiders, careful record-keepers, and the pilots every foreign ship needs.`}]},
 {id:'sb-f76a9b7d2d09fd6f',edits:[{find:`*Complication:* The three villagers are Bellwright sympathizers, and the party will learn this.`,replace:`*Complication:* The three villagers are Bellwright sympathizers, and the party will learn this. They have offered Quill gold, which cannot pay a Corvanese Tithe; the party can give memories of their own on the villagers' behalf, or risk gilding.`}]},
 {id:'sb-bdc895d7f1bfd2d8',edits:[{find:`Use Appendix A's conversion caveat; these counts are scene suggestions, not balanced encounters.`,replace:`These counts are scene suggestions. In v6, Waypoint's Foresight prep brief lists each encounter with full 2024 stat blocks and calculates its difficulty from your party roster with the 2024 XP budget.`}]},
 {id:'sb-0dfa26206fc6535c',edits:[{find:`*These are custom encounter prototypes.`,replace:`*v6: complete 2024 stat blocks for every Corvane creature are in Waypoint's Foresight playbook (open an encounter and choose a creature). The prototype table below is kept for reference.*

*These are custom encounter prototypes.`}]},
 {id:'sb-1cdbfe7135c1c80b',edits:[{find:`Spellcasters feel it as a hum behind their teeth.`,replace:`Spellcasters feel it as a hum behind their teeth. Faerûnian casters find that their spells work exactly as at home (2024 rules), but every one of them hums faintly as it is cast: what Corvanese call Tonework is how the Weave sounds here.`}]},
 {id:'sb-0581e28fa081ec74',edits:[{find:`10. The Thrane storm has a voice, and it asks for someone called "Edda."`,replace:`10. The Thrane storm has a voice, and it asks for someone called "Edda."

**Pellmoor additions (v6, roll d6):**
1. A Calishite pasha paid a thousand gold for one keep: a Corvanese child's first snowfall.
2. The Seam moved a mile north last spring, and two ships that did not know it are still in the Wall.
3. Master Venn wants something from the old ferry-folk and will pay "anything, friend."
4. Hushmen are checking clocks again. Someone sold one that still chimed.
5. A Lantanese gnome claims that if you strike the right note on the Mere, the drowned bell answers.
6. The *Gull's Wager*'s first mate still lives on Strangers' Row, and drinks to forget what he saw in the Wall.`}]},
 {id:'sb-9c9e09ebe99d2583',edits:[{find:`10. A Stilled courier who has delivered one letter and is looking for the recipient.`,replace:`10. A Stilled courier who has delivered one letter and is looking for the recipient.

**At the Brass Lantern (v6, roll d6):**
1. A Baldurian sailor offers a silver piece for "something you remember about home, any home."
2. A dwarf from Mirabar asks, too loudly, who sells bronze.
3. A Reckoner's apprentice tries to sell a keep that hums in the wrong note: a forgery.
4. Two Waterdhavian merchants argue about whether the bells are real.
5. A ferry-folk pilot drinking alone refuses foreign coin and pays in motes.
6. A Harper with a lute asks the party, very casually, what they know about the Tithe.`}]},
 {id:'sb-ec96b0db0ece34c4',edits:[{find:`Record each character's secret on the back of the sheet, visible only to the DM and that player.`,replace:`Record each character's secret on the back of the sheet, visible only to the DM and that player. In Waypoint, record Tolls, Tithes and memory trades in Foresight → Party & ledger → Memory ledger.`}]},
 {id:S1,edits:[s1Opening,s1Do,s1Quill,s1QuillSay,s1Port,s1Patrol]},
 {id:S2,edits:[s2Ferry,s2Dive,s2Hadrik,s2Sneak,s2Eels,s2Singers]},
 {id:S3,edits:[s3Venn,s3Writ]},
];

// The guides go last in each list: they anchor on text the earlier edits leave behind.
const sessions=[{id:S1,edits:[s1Opening,s1Do,s1Quill,s1QuillSay,s1Port,s1Patrol,s1Guide,...links(1),card(1)],summary:'A port of forty masts on a drowned town, a girl on the oldest dock, and a bronze tongue that hums.'},{id:S2,edits:[s2Ferry,s2Dive,s2Hadrik,s2Sneak,s2Eels,s2Singers,s2Guide,...links(2),card(2)],summary:'The Night Song, a missing ferry on a sandbank, memory-eels, and a question from the deep: who are you grieving?'},{id:S3,edits:[s3Venn,s3Writ,s3Guide,...links(3),card(3)],summary:'A missing ledger page, a frightened friar, and the choice of what to do with the Tongue before the Court decides for you.'}];

const campaign={edits:[
 {field:'premise',find:`Corvane is a world that was once rung like a great cathedral.`,replace:`Corvane is a land far out in the Trackless Sea of the Forgotten Realms, a world of its own that was once rung like a great cathedral.`},
 {field:'premise',find:`They trade memories for coin. They have forgotten what the bells sounded like.`,replace:`They trade memories as money, and lately for gold. They have forgotten what the bells sounded like.

For four centuries a wall of storm at sea hid Corvane from the rest of the world. Thirty years ago a passage opened, and ships from Faerûn's Sword Coast began to arrive. They anchor at Pellmoor, on the still waters of the Mute Mere, now the busiest port in Corvane.`},
 {field:'arc',find:`> "The fog lifts off the Mute Mere in long grey ribbons, and the village of Pellmoor comes into sight: reed roofs, leaning docks, nets like the sails of drowned ships. The chapel bell is silent. A girl stands on the ferry-dock, staring at the water with her hands folded tight. She does not look up when you arrive. She says, without turning: *'Are you here for the tongue, or for the bell?'*"`,replace:s1Opening.replace},
]};
const planner={locked:[{find:`Source canon: Part 3.3 wins conflicts within the manuscript.`,replace:`Source canon: the v6 pages (CORVANE IN THE REALMS, MEMORY AS MONEY, PELLMOOR LANDING) and then Part 3.3 win conflicts within the manuscript. Corvane is part of the Forgotten Realms; the Seam opened in 382 SS (1462 DR); Pellmoor is a busy port; memory is money alongside gold; rules are D&D 2024.`}]};
// Revision 7.2 retires the IsoForge map kits (DM's decision, 2026-11-01: not ready yet): the kit section at the end of each Act I plan,
// the three "Maps and visual prep" wiki pages and the three IsoForge saved cards. Waypoint lists each removal for review.
const remove={sections:[{heading:'## IsoForge scene kit',until:'Prepared visual staging only. No events or outcomes are implied.'}],pages:['sb-isoforge-kit-1','sb-isoforge-kit-2','sb-isoforge-kit-3'],cards:['sb-isoforge-session-1','sb-isoforge-session-2','sb-isoforge-session-3'],note:'The IsoForge map kits are retired for now.'};
module.exports={pages,pageEdits,sessions,campaign,planner,pellmoorBody,remove};
