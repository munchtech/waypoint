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
const guideVersions=['7.1','7.2','7.3','7.4','7.16','7.17',''];
// `unless`: once a session has the guide's heading, the guide is in, even after the link edits have reworded some of its lines.
const guide=(n,find)=>({find,replace:find+'\n\n'+read('guide-s'+n+'-7.1.md'),unless:'## Running this session (new DM guide)',guide:true});
const diff=(name,old,now)=>{const out=[];if(old.length!==now.length)throw new Error(name+': each revision must keep the first revision\'s line count');
 for(let i=0;i<old.length;i++){if(old[i]===now[i])continue;let j=i;while(j+1<old.length&&old[j+1]!==now[j+1])j++;const find=old.slice(i,j+1).join('\n');if(old.join('\n').split(find).length!==2)throw new Error(name+' line '+(i+1)+' is not unique');out.push({find,replace:now.slice(i,j+1).join('\n'),at:i,end:j+1});i=j}return out};
// Edits that carry a text from its first installed revision to the current one. A line reworded again later would leave an earlier
// edit with neither its anchor nor its replacement, so each edit also counts as applied once the current wording of its lines is there.
// A cut that shortens a line can leave a replacement (or current wording) that the older text already contains, which would count the
// edit as applied too early, so such an edit takes in a neighbouring line on each side (up to three times) until neither is found there.
const chainEdits=(name,texts)=>{const last=texts[texts.length-1];return texts.slice(1).flatMap((now,k)=>{const old=texts[k],seen=texts.slice(0,k+1).map(t=>t.join('\n'));
 const early=(a,b)=>{const o=old.slice(a,b).join('\n'),r=now.slice(a,b).join('\n'),f=last.slice(a,b).join('\n');return seen.some(t=>t.includes(r)||(f!==o&&f!==r&&t.includes(f)))};
 let rs=diff(name,old,now).map(({at,end})=>[at,end]);
 for(let n=0;n<3;n++)rs=rs.map(([a,b])=>early(a,b)?[Math.max(0,a-1),Math.min(old.length,b+1)]:[a,b]).reduce((m,r)=>{const p=m[m.length-1];if(p&&r[0]<=p[1])p[1]=Math.max(p[1],r[1]);else m.push(r);return m},[]);
 return rs.map(([a,b])=>{const find=old.slice(a,b).join('\n'),replace=now.slice(a,b).join('\n'),fin=last.slice(a,b).join('\n');if(early(a,b))throw new Error(name+' line '+(a+1)+' still reads as applied');if(old.join('\n').split(find).length!==2)throw new Error(name+' line '+(a+1)+' is not unique');return {find,replace,...(fin!==replace?{unless:fin}:{}),guide:true}})})};
const versions=(file,list)=>list.map(v=>read(file.replace('.md',v?'-'+v+'.md':'.md')).split('\n'));
// Revision 7.7 rewords one line of Session 3 (Quill's Influence DC follows the 2024 rule), so its 7.5 to 7.6 text is kept as guide-s3-7.6.md.
const links=n=>chainEdits('guide-s'+n,versions('guide-s'+n+'.md',n===3?['7.1','7.2','7.3','7.4','7.6','7.16','']:n===1?['7.1','7.2','7.3','7.4','7.10','7.16','']:guideVersions));
const s1Guide=guide(1,`**Session 1 end:** The Hushmen raid Ila's house that night, or the party hears the Drowned Choir for the first time. Either way, end on the question: "Who was singing?"`);
const s2Guide=guide(2,`**Session 2 end:** End on the question: "Who was on the ferry?" Mother Sallow's ledger is missing a page, which opens Session 3.`);
const s3Guide=guide(3,`**DO (v6):** The letter's grey seal is a writ of passage for everyone it names, Stormborn included.`);
// Revision 7.5: Tolls are warned (kind and weight), never stated exactly, and they last and escalate. Part 2.7 (toll-rules.md) is the rule.
const tollLine=(find,replace)=>({find:'- **Toll:** '+find,replace:'- **Toll:** '+replace});
const s3Toll=tollLine('A Memory of someone who has died, chosen by the Ringer (see Part 2.11).','A memory of someone who has died, at the weight in Part 2.7 (heavy: Ossa is the party\'s first or second bell). Warn first: "Ossa will take a memory of the dead from you, and it will be heavy." Never say which; you choose it after it rings.');
const s9Vaer=tollLine('A Memory of a dawn you loved (Part 2.11).','A memory of a beginning (a dawn they loved), at the weight in Part 2.7. Warn of the kind and the weight; you choose the memory after it rings. The dawn returns every morning for a year.');
const s9Calla=tollLine('A Gift, something you value, given to someone in need (Part 2.11).','A gift given to someone in need, at the weight in Part 2.7. Warn of the kind and the weight; you name the gift after it rings. The harvest lasts one season.');
const s14Toll=tollLine('A Memory (Part 2.11).','A memory, at the weight in Part 2.7. Warn of the kind and the weight; you choose the memory after the thaw begins.');
const s19aToll=tollLine('A Sense, for one day (Part 2.11).','A sense, at the weight in Part 2.7 (dulled for a year at the least). Warn of the kind and the weight; you choose the sense after it rings.');
const s19bToll=tollLine('A Fear, chosen by the player, lost for one day (Part 2.7).','A fear the bell gives the Ringer, at the weight in Part 2.7. Warn of the kind and the weight; you choose the fear after it rings.');
const S9='sb-3b8d18ebd647c28a',S14='sb-7b8acacf7aaa51b8',S19A='sb-ad6ec717a7e06917',S19B='sb-abff956ca382268b';
// Revision 7.9: Sessions 4 to 9 get the full guide, in the Act I format with the 7.4 to 7.8 additions built in (Key people, a recap,
// Bring it back lines, Where to break and the table card). Each goes in whole after the session's end line. When one is reworded,
// keep this text as guide-sN-7.9.md and chain the change, as links() does for Act I.
const S4='sb-0408eb3a9ef383eb',S5='sb-879a0d8936c67231',S6='sb-173cd869f38cc637',S7='sb-159e9351d101d536',S8='sb-e6aca23e4a267d72';
// Revision 7.16 rewords lines of later guides (stat block cells that open nothing, the scout and the knight renamed, the hand-offs);
// each of those guides as first installed is kept as guide-sN-<rev>.md, and the edits carry it to the current text.
// Revision 7.17 rewords the guides for plain speech: their 7.16 text is kept as guide-sN-7.16.md (Act I's too), and guides that
// had not been reworded before are kept as first installed under their revision.
const guideRevs={4:'7.9',5:'7.9',8:'7.9',10:'7.13',11:'7.13',12:'7.13',13:'7.13','16b':'7.14','18a':'7.14','19a':'7.14','19b':'7.14',20:'7.15',21:'7.15',22:'7.15',23:'7.15',24:'7.15',25:'7.15',26:'7.15',27:'7.15',6:'7.9',7:'7.9',9:'7.9',14:'7.13',15:'7.13','16a':'7.14','17a':'7.14','17b':'7.14','18b':'7.14',28:'7.15'};
// Revision 7.18 adds a magic item to the Rewards of Sessions 2, 6, 14 and 18A and the Act I debts to Session 22's "Who comes";
// those guides' 7.17 text is kept as guide-sN-7.17.md.
const act2=(n,find)=>{const rev=guideRevs[n],file='guide-s'+n+'.md';
 return [{find,replace:find+'\n\n'+read(rev?'guide-s'+n+'-'+rev+'.md':file),unless:'## Running this session (new DM guide)',guide:true},...(rev?chainEdits('guide-s'+n,versions(file,[rev,...['7.16','7.17'].filter(v=>fs.existsSync(path.join(__dirname,'guide-s'+n+'-'+v+'.md'))),''])):[])]};
// Revision 7.10: the plans now match the play cards (vault lock 17, Tessa's forged order 16, Vaer theft 17) and Vaer's dawn lasts a year.
const s5Lock={find:"- Entry requires a DC 15 Thieves' Tools check, or a bribe",replace:"- Entry requires a DC 17 Thieves' Tools check, or a bribe"};
const s6Tessa={find:'A forged transfer order (DC 14 Deception)',replace:'A forged transfer order (DC 16 Deception)'};
const s9Theft={find:"by theft: DC 15 Thieves' Tools, with two Dawn Order guards",replace:"by theft: DC 17 Thieves' Tools, with two Dawn Order guards"};
const s9Dawn={find:'- Ringing Vaer lifts the Long Dusk over Hallowmere for one day. A real dawn.',replace:'- Ringing Vaer lifts the Long Dusk over Hallowmere: one whole day of real sun, then a real dawn every morning for a year.'};
const planFixes={[S5]:[s5Lock],[S6]:[s6Tessa]};
const act2Guides=[[S4,4,'**Session 4 end:** End on the question: "Who in this city can you trust?"'],[S5,5,'**Session 5 end:** End on the question: "What did the Court take from the diary?"'],
 [S6,6,'**Session 6 end:** End on the question: "What will the defeated side do next?"'],[S7,7,'**Session 7 end:** End on an unresolved question: "Where can this family be safe?"'],
 [S8,8,'**Session 8 end:** End on the question: "What does I.V. want from you?"']].map(([id,n,find])=>({id,edits:[...(planFixes[id]||[]),...act2(n,find)]}));
// Revision 7.13: Act III (Sessions 10 to 15) gets the same guide, and its plans now match the play cards: Extreme Cold, the ambush's
// five and five, the Sexton's CR 7 and hit points, and Isolde's escort.
const S10='sb-578cbd5020d97b1f',S11='sb-0c7fc8fe12e71ad5',S12='sb-8a9134f39dcce6b4',S13='sb-f40bf272eb1b252f',S15='sb-897e70317077e42d';
const s10Cold={find:'Without a warm cloak, a character takes 1 cold damage per hour after the first hour (Part 2.8).',replace:'Extreme Cold: each hour without a warm cloak is a DC 10 Constitution save, or one level of Exhaustion (Part 2.8).'};
const s11Ambush={find:'Three Stilled and a pack of two Glass-Wolves.',replace:'Five Stilled and five Glass-Wolves, who do not all arrive at once.'};
const s13Sexton={find:'**Encounter: The Glass Sexton (CR 5).** See Appendix A. He fights in Phase 1 (frost-form) until his HP drops to 40 or less. He then shatters into Phase 2 (broken-form) with 30 HP.',
 replace:'**Encounter: The Glass Sexton (CR 7).** His stat block is in the Foresight playbook. He fights in Phase 1 (frost-form, 95 HP). At 0 he shatters into Phase 2 (broken-form) with 45 HP; leftover damage is lost.'};
const s15Escort={find:'She has silence-stone gloves and two Hushmen.',replace:'She has silence-stone gloves, a Hushman Sergeant and four Hushmen.'};
const act3Fixes={[S10]:[s10Cold],[S11]:[s11Ambush],[S13]:[s13Sexton],[S15]:[s15Escort]};
const act3Guides=[[S10,10,'**Session 10 end:** End on the question: "What is the glass hiding?"'],[S11,11,'**Session 11 end:** End on the question: "What did you see in the glass?"'],
 [S12,12,'**Session 12 end:** End on the question: "Will you listen to him?"'],[S13,13,`**Session 13 end:** The Sexton says: "Don't ring the Frost Spire without the Tongue. The winter will come back all at once."`],
 [S15,15,'**Transition to Act IV.** The party must now choose a branch. Brassfall lies to the east and Vael Tor at the center of the plain, and both bells are required for the Concord.']].map(([id,n,find])=>({id,edits:[...(act3Fixes[id]||[]),...act2(n,find)]}));
// Revision 7.14: Act IV, Sessions 16 to 19 on both roads, gets the same guide. Its plans now match the play cards: how many of each foe,
// Yenna's favor, the Concord and its price, and what the shrine stair takes.
const S16A='sb-65a7d51b78a8d14d',S16B='sb-4a1554713c1ac7c1',S17A='sb-3b3f7af5135fd7d2',S17B='sb-93be53f2a6747fe1',S18A='sb-42bb15639f8889ad',S18B='sb-f0b728a69d395cb2';
const s16aGolems={find:'- A Storm-stone Golem guards the vault (Appendix A).',replace:'- Three Storm-stone Golems guard the vault. One is awake; the others wake as stones are lifted.'};
const s16bCount={find:'**Encounter: Sleepless (two).**',replace:'**Encounter: Sleepless (three).**'};
const s16bNight={find:'If they fail by 5 or more, a Sleepless takes shape.',replace:'If they fail by 5 or more, a Sleepless takes shape (one a night at most).'};
const s17aYenna={find:'or Yenna Garrow can smuggle it out for a favor (DC 14 Stealth).',
 replace:`or, if she has her father's lamp, Yenna Garrow can smuggle it out for a favor (she takes the risk; the party's distraction is a group Stealth check, DC 14).`};
const s17bCount={find:'Hush Cultists (four) and a Cult Leader.',replace:'Hush Cultists (eight) and a Cult Leader.'};
const s17bDream={find:'until the Hush is struck or sealed (Session 26).',replace:'until the Hush is struck, sealed or tuned (Session 26).'};
const s18aConcord={find:'They describe a safe way to ring the Seventh.',replace:'They describe the Concord: all six bells rung, then the Key seated in the Seventh, never struck.'};
const s18aPrice={find:'The Seventh asks its Ringer for all six Tolls. Everyone else risks the world they know.',
 replace:`Strike the Seventh, and it takes all six Tolls from whoever struck it. The Notes have a gentler way, and they ask its Ringer for 'the whole name'. I think it means yours. Everyone else risks the world they know.`};
const s18aHounds={find:'Three Tongue-Hounds. If forced to fight, Corin joins at CR 5.',replace:'Five Tongue-Hounds. If forced to fight, Corin joins them (CR 6).'};
const s18bStair={find:'- The party may descend a few steps.',
 replace:'- The party may descend a few steps. Say the price first: nineteen of the hundred are free, and each full twenty costs a memory. One DC 13 Wisdom save, at step twenty, caps it at five memories, or two on a success.'};
const s18bCorin={find:`wanting Mirel rung to weaken the Tor's defences. He wants the party to help him ring Ysh later.`,
 replace:'wanting Mirel rung first because it quiets the Tor. Later he wants the Concord: six bells rung, then the Key seated in the Seventh, never struck.'};
const act4Guides=[[S16A,'16a',[s16aGolems],s16aGolems.replace],
 [S16B,'16b',[s16bCount,s16bNight],'the party can return or devise another way to acquire the Tongue before the finale.'],
 [S17A,'17a',[s17aYenna],'He will take it, by force if needed or by contest if the party is clever.'],
 [S17B,'17b',[s17bCount,s17bDream],'Their dreams are taken. Describe the emptiness. The Hush begins to stir.'],
 [S18A,'18a',[s18aConcord,s18aPrice,s18aHounds],s18aHounds.replace],
 [S18B,'18b',[s18bStair,s18bCorin],'My grandmother rang one. Let me help you do it right."'],
 [S19A,'19a',[s19aToll],'- The Court sends a strike force of Hushmen and Dawn Order knights to take the Thrane Tongue.'],
 [S19B,'19b',[s19bToll],'- The Court sends Hushmen to the Tor to investigate.']].map(([id,n,fixes,find])=>({id,edits:[...fixes,...act2(n,find)]}));
// Revision 7.15: the finale and the aftermath, Sessions 20 to 30, get the same guide (Sessions 28 to 30 share one). The plans of
// Sessions 23 to 25 now match the play cards: who comes to the Strike, Maudrin at the stones, and what the long stair takes.
const S20='sb-5a3ec12d1d59e95c',S21='sb-24c29d78b60ca13f',S22='sb-742e25b3e3af8fbf',S23='sb-007cc9c6ed7fecff',S24='sb-dce15a8ce35d16ab',S25='sb-8272ccffe0002037',S26='sb-2fce596a41a06436',S27='sb-b2b43775bb66b9c5';
const s23Force={find:'- Maudrin commands four Hushmen, two Dawn Order knights, and Ser Haldric Mose.',
 replace:'- Maudrin commands three Wardens, two Sergeants, four Hushmen, two Dawn Order knights, and Ser Haldric Mose. If Rook won the duel, there are no knights: four Wardens, three Sergeants and eight Hushmen. If Maudrin is dead, Tristan brings the column.'};
const s23Strike={find:'**Encounter: The Strike (Appendix A).** Four Hushmen, two Dawn Order Knights, Ser Haldric Mose, and Maudrin Vesk. Deadly for levels 7 to 9. If Rook won the duel, Haldric and both Knights are absent, which makes it Hard.',
 replace:'**Encounter: The Strike (Appendix A).** Maudrin Vesk (CR 8), three Wardens, two Sergeants, four Hushmen, two Dawn Order Knights, and Ser Haldric Mose, for four characters at level 9. If Rook won the duel, Haldric and the Knights are absent: four Wardens, three Sergeants and eight Hushmen.'};
const s24Seal={find:'She intends to seal the Key and preserve her rule.',replace:'She means to seal the stairs and keep the Key.'};
const s24Maudrin={find:'**Encounter: Maudrin Vesk (CR 6).** Use only if Maudrin holds the Key; otherwise run her negotiation. She fights with *Silence* and *Counterspell*. At half HP, she retreats down the stairs with the Key.',
 replace:'**Encounter: Maudrin Vesk, Keeper of the Seventh (CR 12).** Use only if Maudrin holds the Key; otherwise run her negotiation. She has three Wardens, a Sergeant and four Hushmen. When she is Bloodied, she retreats down the stairs with the Key.'};
const s25Stair={find:'- Each descender makes one DC 13 Wisdom save at the entrance; success reduces the total to two memories.',
 replace:'- The first nineteen steps are free. Each descender makes one DC 13 Wisdom save the first time they reach step twenty: a failure caps the total at five memories, a success at two.'};
const finaleGuides=[[S20,20,[],`**If the party has rung both bells:** The Court's strike force is already moving. Session 22 begins at dusk.`],
 [S21,21,[],`**If the party has rung both bells:** The Court's strike force is already moving. Session 22 begins at dusk.`],
 [S22,22,[],`the Blanks break the Hushmen's line by numbers.`],
 [S23,23,[s23Force,s23Strike],'**Session 23 end:** The party reaches the foot of the Tor. Ahead, a ring of gray stones glows, and the light is the color of a dream they have almost forgotten.'],
 [S24,24,[s24Seal,s24Maudrin],s24Maudrin.replace],
 [S25,25,[s25Stair],'Flight or another route that genuinely avoids the stairs avoids this price; do not add a replacement punishment.'],
 [S26,26,[],'- The party chooses, and the endings open. See Session 27.'],
 [S27,27,[],'Oum sleeps on, and the world remains incomplete.']].map(([id,n,fixes,find])=>({id,edits:[...fixes,...act2(n,find)]}));
const s14Guide=act2(14,'**Session 14 end:** End on the question: "What did the Frost Spire cost the thaw?"');
const s9Guide=act2(9,'**Transition to Act III.** The party heads for Glassreach with whatever they took from Hallowmere: a diary, a Tongue, a jar, a wooden bird, or a Court seal.');
// Revision 7.4: a one-page table card after each guide (Waypoint prints it from the session notes).
// The card is inserted as 7.4 had it; later rewordings follow as edits (revision 7.5: the Toll warning).
const card=n=>{const last=read('guide-s'+n+'.md').split('\n').pop();return [{find:last,replace:last+'\n\n'+read('table-card-s'+n+'-7.4.md'),unless:'## Table card',guide:true},...chainEdits('table-card-s'+n,versions('table-card-s'+n+'.md',['7.4','']))]};

// Revision 7.7: before each Act I session's first scene, Key people tonight (a table of who matters, their attitude, Influence DC and secret),
// Places at a glance and a d6 rumour table, as the 2024 adventures lay them out (people-sN.md). When people-sN.md is reworded,
// keep this text as people-sN-7.7.md and chain the change, as the table cards do.
const people=(n,before)=>({find:before,replace:read('people-s'+n+'.md')+'\n\n'+before,unless:'### Key people tonight (Session '+n+')',guide:true});

// Revision 7.8, from the actual-play study (docs/actual-play-study.md). Each Act I scene gains a Bring it back line: one move in the
// fiction for when a bit doesn't end by itself. It goes just before the scene's "How it ends" (or before the next heading if it has none).
// Each pacing section gains Where to break; Sessions 2 and 3 open with a recap (recap-sN.md). Waypoint's session notes read both lines.
const sceneEnd=(n,scene)=>{const lines=read('guide-s'+n+'.md').split('\n'),at=lines.findIndex(l=>l.startsWith('### Scene '+scene+':'));if(at<0)throw new Error('guide-s'+n+': no Scene '+scene);
 return lines.slice(at+1).find(l=>l.startsWith('**How it ends.**')||l.startsWith('### '))};
const backs=(n,list)=>list.map((text,k)=>{const end=sceneEnd(n,k+1),line='**Bring it back.** '+text;return {find:end,replace:line+'\n\n'+end,unless:line,guide:true}});
const breakAt=(n,text)=>{const find=read('guide-s'+n+'.md').split('\n').find(l=>l.startsWith('- **Running long:**'));return {find,replace:'- **Where to break:** '+text+'\n'+find,unless:'- **Where to break:**',guide:true}};
const recap=(n,before)=>({find:before,replace:read('recap-s'+n+'.md')+'\n\n'+before,unless:'### Opening recap (Session '+n+')',guide:true});
const s1Flow=[...backs(1,[
 `The Heart hums once in Ila's pocket, loud enough that she stops counting. "Did you hear that?"`,
 `Sallow taps her pipe on the table, twice. "The light goes early on the Old Shore. Ask what you came to ask."`,
 `A ship's bell rings the hour on the Quays, and every Corvanese head turns toward it. Ask one player where their character is standing when it rings.`,
 `Quill's pen stops. For the first time he looks up from the ledger: "I have three more doors tonight. Shall we settle this one?"`,
 `The lamp gutters. Out on the water, very faintly, someone begins to sing a name.`]),
 breakAt(1,`between Scenes 2 and 3 (about 1:30), straight after Sallow's "The afternoon's yours. What do you do?" The players can plan over the break. Never during Quill's patrol or the raid.`)];
const s2Flow=[...backs(2,[
 `The song stops in the middle of a name. Every ferry-folk face along the shore turns to the party: it's their turn to sing back.`,
 `Brannagh slaps the tide-board. "Tide turns in a quarter hour, lads. With me or without me."`,
 `The fog closes in until you can't see the skiff's bow, and something long slides under the hull.`,
 `The oar drips three times, slowly. The Tidewarden lifts his head and waits for their one question.`,
 `Air. Tell the swimmers they have about a minute left in their chests, and ask what they do with it.`,
 `Mother Sallow turns the ledger round so they can see the torn edge, and waits.`]),
 breakAt(2,`after the eels flee (about 2:10), before the Tidewarden appears. Never in the middle of the eel fight. If that's late for your table, break when the skiff pushes off (about 1:20).`)];
const s3Flow=[...backs(3,[
 `The kettle boils over. Sallow doesn't move to take it off; she's looking at the torn edge of the page, waiting for someone to say a name.`,
 `Footsteps on the chapel path. Someone is coming back sooner than expected.`,
 `This is the quiet scene, so bring nothing in. If it stalls, Ila speaks first, to the person she trusts most: "Did Dad know?"`,
 `A second knock, harder. Then something slides under the door.`,
 `The Heart hums, a little louder, as if it's listening. Go round the table: "What does your character want done with it? One sentence each."`,
 `The water on the stair rises an inch around their ankles. Below, something very large and very old hums back at the Heart.`,
 `The Court rider is still at the door, waiting for an answer to carry back. He coughs.`]),
 breakAt(3,`after the knocks in Scene 4 (about 1:50), right before the choice, so the players can talk it over at the kettle. If you skipped Scene 4, break once Ila gives the page back.`)];
// Revision 7.8: the finale's epilogue round (epilogue.md), after the NPC list in the Aftermath plan.
const AFTER='sb-5c4fc37d597122e9',epilogueEnd='- **The Tidewarden:** rows the last dead home. The oar stops dripping.';
const epilogue={find:epilogueEnd,replace:epilogueEnd+'\n\n'+read('epilogue.md'),unless:'### Epilogue round (Session 30)',guide:true};

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
- A character may pay in memory wherever coin is accepted in Corvane. The player chooses the memory and writes one line in the [Memory ledger](go:memory-ledger) (Campaign → Party & preferences). The DM never chooses it.
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
> **SAY:** "The floor creaks under you, and you realise it's painted: streets, alleys and a market square in faded blue, each with its old name lettered beside it. Old Pellmoor, the town under the harbour. On the benches along the wall, a dozen pilots in salt-stiff coats look up, decide you're not a ship, and look away again."

**The Reckoning House (the Tally).** A narrow shop with a slate by the door and a counter scored by tuning forks. Sela Maunt weighs keeps under a Lantanese lens. Behind a curtain: the Lost Shelf.
> **SAY:** "The slate by the door reads, in careful chalk: 1 KEEP = 1 GP 2 SP. MOTES AT 1 SP. HEARTKEEPS BY APPRAISAL. Underneath, smaller: NO GOLD FOR TITHES."

**Strangers' Row, the Loud Quarter.** Foreign inns, counting-houses, the Dawn Mission, a dwarven smithy, a gnomish clockmaker selling silent clocks, Brother Hadrik's shrine-tent, and music at all hours.
> **SAY:** "Strangers' Row hits you all at once: a fiddle and a lute playing two different songs, a smith's hammer clanging, the smell of frying onions and temple incense, shop signs in Common, Dwarvish and scripts you don't know. After the gray hush of the rest of Corvane, it is almost too loud to bear."

**The Brass Lantern.** The Faerûnian inn. Loud, warm, overpriced, and the only place in Corvane that serves Waterdhavian ale. The *Gull's Wager*'s old first mate drinks in the corner.
> **SAY:** "The Brass Lantern is warm, crowded and loud: brass lamps, wet cloaks steaming by the fire, and someone singing a Waterdeep drinking song badly. The board over the bar lists prices in gold and, in smaller letters underneath, in motes. In the far corner an old sailor drinks alone with his back to the wall."`},
 {id:'v6-rules-2024',title:'2024 RULES NOTES (v6)',kind:'Ruling',status:'Confirmed',visibility:'DM only',aliases:'2024, 5.5e, rules, Heroic Inspiration, Influence, Extreme Cold, Suffocation, Exhaustion, encounter budget',body:`- **Heroic Inspiration** replaces v5's "Inspiration."
- **Influence** (action): social plays use it. The DC is 15 or the creature's Intelligence score, whichever is higher; its attitude (Friendly, Indifferent, Hostile) decides whether a check is needed at all.
- **Study** (Intelligence) and **Search** (Wisdom) actions: clue scenes use them. Essential clues are never lost to a failed roll.
- **Extreme Cold** (Glassreach): end of each hour, DC 10 Constitution save or 1 Exhaustion level. Cold Resistance or Immunity succeeds automatically; so does a warm cloak or cold-weather gear (house rule kept from v5).
- **Exhaustion:** each level gives −2 to d20 Tests and −5 feet of Speed; a long rest removes 1 level; level 6 is death.
- **Suffocation:** hold breath for 1 + Constitution modifier minutes (minimum 30 seconds); out of breath, 1 Exhaustion level at the end of each turn, all removed when breathing again.
- **Frigid Water:** minutes equal to the Constitution score, then a DC 10 Constitution save each minute or 1 Exhaustion level.
- **Conditions** use the 2024 definitions. A Sense Toll at Ruinous weight uses Blinded or Deafened (Part 2.7).
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

// Revision 7.11: the three tracker cards were imported with fixed counts ("no losses recorded yet", "0 / 12"). They now follow
// Waypoint's own ledger, bargain log and Tithe Clock, and their paper-copy pages stop showing as open threads.
const cardEdits=[
 {id:'sb-00ad28d954435215',edits:[{find:'Actual roster, hooks, Lines and Veils: not yet entered.',replace:'Enter the roster in Campaign → Party & preferences → Roster, and the Lines and Veils under Off-limits, off-screen, and things to avoid.'}]},
 {id:'sb-628326040ad473fd',title:{from:'Toll Tracker · no losses recorded yet',to:'Toll Tracker'},tracks:{place:'memory-ledger'},edits:[{app:true,find:'No character has paid a Toll in recorded play. Keep scene memory losses separate from ringing Tolls.',replace:'Keep scene memory losses separate from ringing Tolls; the Memory ledger records both, each with its kind.'}]},
 {id:'sb-0e8a67a6dabcf49c',title:{from:'Bargain Log · no bargains recorded yet',to:'Bargain Log'},tracks:{place:'bargains'}},
 {id:'sb-2d085aa1b2576d17',title:{from:'Tithe Clock · 0 / 12',to:'Tithe Clock'},tracks:{place:'world-state',flag:'tithe_clock'},edits:[{find:'Initial value: 0; this is a fresh unplayed campaign. Update the count only after actual qualifying rests.',replace:'Waypoint keeps the live count in Session → Playbook → World state; move it only after actual qualifying rests.'}]},
];
const pageEdits=[
 // Revision 7.14: the CRs match the stat blocks.
 {id:'sb-604f141fc3833c2f',edits:[{find:'Bellwright-Mage (CR 5)',replace:'Bellwright-Mage (CR 6)'}]},{id:'sb-ff1d8fd85ca3b0f1',edits:[{find:'Ironhorn Rider (CR 1)',replace:'Ironhorn Rider (CR 3)'}]},
 // Revision 7.10: the vault page matches the play card (lock DC 17).
 // Revision 7.10: the paper trackers point to the ones Waypoint keeps, so a stale "no losses recorded yet" never contradicts the ledger.
 {id:'sb-1a80bcc5dfb81835',title:'Toll Tracker (paper copy)',status:{from:'Unresolved',to:'Confirmed'},quote:{from:'Initialized for this unplayed campaign; update only from confirmed play.',to:'Paper copy of a tracker Waypoint keeps for you.'},edits:[{unless:'**Waypoint keeps this for you:**',find:"Record each character's secret on the back of the sheet",replace:"**Waypoint keeps this for you:** record each Toll in Players → Memory ledger, and the next prep brief names it under What it cost. This table is the paper copy.\n\nRecord each character's secret on the back of the sheet"},{find:'record each Toll in Players → Memory ledger',replace:'record each Toll in the [Memory ledger](go:memory-ledger) (Campaign → Party & preferences)'},{app:true,find:'No character has paid a Toll in recorded play. Keep scene memory losses separate from ringing Tolls.',replace:'Keep scene memory losses separate from ringing Tolls; the Memory ledger records both, each with its kind.'}]},
 {id:'sb-7fb85235497d244d',title:'Bargain Log (paper copy)',status:{from:'Unresolved',to:'Confirmed'},quote:{from:'Initialized for this unplayed campaign; update only from confirmed play.',to:'Paper copy of a tracker Waypoint keeps for you.'},edits:[{unless:'**Waypoint keeps this for you:**',find:'| Bargain | With | Terms | Kept or broken? |',replace:'**Waypoint keeps this for you:** record bargains in Players → Bargain log; open ones show under Still owed in the next prep brief. This table is the paper copy.\n\n| Bargain | With | Terms | Kept or broken? |'},{find:'record bargains in Players → Bargain log',replace:'record bargains in the [Bargain log](go:bargains) (Campaign → Party & preferences)'}]},
 {id:'sb-bc7e324cd9b20ac1',title:'Tithe Clock and tracks (paper copy)',status:{from:'Unresolved',to:'Confirmed'},quote:{from:'Initialized for this unplayed campaign; update only from confirmed play.',to:'Paper copy of a tracker Waypoint keeps for you.'},edits:[{unless:'Waypoint keeps the Tithe Clock in',find:'The campaign uses four simple tracks. Keep them on paper in front of you.',replace:'The campaign uses four simple tracks. Waypoint keeps the Tithe Clock in Session → Playbook → World state and moves it when you mark a play; keep this page as the paper version.'},{find:'Waypoint keeps the Tithe Clock in Session → Playbook → World state',replace:'Waypoint keeps the Tithe Clock in [World state](go:world-state) (Session → Playbook)'},{app:true,find:'Initial value: 0; this is a fresh unplayed campaign. Update the count only after actual qualifying rests.',replace:'Move the count only after actual qualifying rests.'}]},
 {id:'sb-30af780baa82038c',edits:[{find:"- **Access:** a DC 15 Thieves' Tools check, or a bribe",replace:"- **Access:** a DC 17 Thieves' Tools check, or a bribe"}]},
 // Revision 7.4: the session zero script becomes a full guide for a first-time DM (session-zero.md).
 {id:'sb-b61bdde01a01cdcf',edits:[{find:'__WHOLE__',replace:read('session-zero-7.4.md'),unless:'### Step 5: Put it into Waypoint'},...chainEdits('session-zero',versions('session-zero.md',['7.4','7.10',''])),
  // Revision 7.7: optional table jobs for players, as the 2024 adventures' Player Assistance sections suggest.
  {find:'### Step 5: Put it into Waypoint (15 minutes, or right after)',replace:read('session-zero-jobs.md')+'\n\n### Step 5: Put it into Waypoint (15 minutes, or right after)',unless:'**Table jobs (optional).**'},
  // Revision 7.8: how to handle silly and serious moments, from the actual-play study.
  {find:'### Step 5: Put it into Waypoint (15 minutes, or right after)',replace:read('silly-and-serious-7.8.md')+'\n\n### Step 5: Put it into Waypoint (15 minutes, or right after)',unless:'**Silly and serious (for you, not the players).**'},
  // Revision 7.17 rewords it; the 7.8 text is kept as silly-and-serious-7.8.md.
  ...chainEdits('silly-and-serious',versions('silly-and-serious.md',['7.8','']))]},
 // Revision 7.5: the Toll rules.
 {id:'sb-579437dc048229b6',edits:[{find:'__WHOLE__',replace:read('toll-rules-7.5.md'),unless:'### The weight rises with every bell'},...chainEdits('toll-rules',versions('toll-rules.md',['7.5','']))]},
 {id:'sb-cda9019c57971a98',edits:[{find:'When in doubt, ask the player what their character is willing to give up.',replace:'Before every ringing, warn the player what kind of thing the bell will take and how heavy it will be, never exactly what, and let them say no (Part 2.7).'}]},
 {id:'sb-a23a83e518a41ee8',edits:[
  {find:'| The Long Dusk lifts over Hallowmere for one day. A real dawn. |',replace:'| The Long Dusk lifts over Hallowmere: a real dawn, every morning for a year. |'},
  {find:'| A Memory of a dawn you loved |',replace:'| A memory of a beginning (weight: Part 2.7) |'},
  {find:'| A Memory of someone who has died, chosen by the Ringer |',replace:'| A memory of someone who has died (weight: Part 2.7) |'},
  {find:'| A Gift: something you value, given to someone in need |',replace:'| A gift, given to someone in need (weight: Part 2.7); the harvest lasts one season |'},
  {find:'| A Memory |',replace:'| A memory (weight: Part 2.7) |'},
  {find:'| A Sense, for one day |',replace:'| A sense (weight: Part 2.7) |'},
  {find:'| A Fear |',replace:'| A fear the bell gives (weight: Part 2.7) |'},
  {find:'| All six Toll types at once |',replace:'| All six kinds at once, each Ruinous |'}]},
 {id:'sb-36cd885109bb1aa2',edits:[
  {find:'Repeat ringing requires another Toll and renews the listed effect without stacking it.',replace:'Repeat ringing requires another Toll at the current weight and renews the listed effect without stacking it; only Vaer\'s dawn (a year) and Calla\'s harvest (a season) fade, and only a first ringing raises the weight (Part 2.7).'},
  {find:'At Ysh, disclose the options and prices before anyone acts:',replace:'At Ysh, explain the options and warn of their prices (the kinds and the weight, Part 2.7) before anyone acts:'},
  {find:'pays all six Tolls once.',replace:'pays all six Tolls once, each at Ruinous weight.'},
  {find:'never invent a backstory loss without the player.',replace:'choose the exact loss from what the table knows of the character, and never invent a backstory loss.'},
  {find:"Losing a Fear changes a feeling, not the player's authority to decide actions or immunity to magical fear.",replace:"A Fear Toll changes a feeling, never the player's authority to decide their character's actions."}]},
 {id:S9,edits:[s9Vaer,s9Calla]},{id:S14,edits:[s14Toll]},{id:S19A,edits:[s19aToll]},{id:S19B,edits:[s19bToll]},
 {id:'sb-462b2b0d93fd03c2',title:'PELLMOOR LANDING (Port)',edits:[{find:'__WHOLE__',unless:'- **The Quays:**',replace:pellmoorBody},
  // Revision 7.12: what the party sees at each spot on the Old Shore, to read aloud.
  {find:'- **The Quays:**',unless:'- **On the Old Shore (read aloud):**',replace:`- **On the Old Shore (read aloud):**
  - *The old ferry-dock:* "The oldest dock on the Mere is gray and soft with age, its pilings furred green. Ropes hang from it into water so still you can see the reeds standing upright beneath the surface, and deeper down, the dark line of a drowned roof."
  - *The chapel:* "The chapel is reed-roofed like everything else on the Old Shore, and smells of candle-smoke and damp. Nine faded saints are painted along one wall. The bell-frame over the door is empty, and its beam is gray with dust."
  - *Mother Sallow's reed-hut:* "A low hut of bundled reeds sits right at the water's edge, half hidden behind racks of rushes drying green. Herbs hang from the eaves. Inside, every shelf holds a jar of dye, and the whole place smells of wet green things and pipe-wood."
  - *The Harrow house:* "A narrow ferry-house with its shutters latched. A man's oilskin still hangs by the door, stiff with salt. On the step someone has set out a row of small stones, counted and evenly spaced."
  - *The ledger-house:* "The only stone building on the Old Shore, squat, with no windows on the water side. Inside, ferry ledgers climb the shelves to the roof: centuries of crossings in faded ink, who went out and who came back. It is very dry, and very quiet."
- **The Quays:**`}]},
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
 {id:'sb-ec96b0db0ece34c4',edits:[{unless:'record Tolls, Tithes and memory trades in the [Memory ledger]',find:`Record each character's secret on the back of the sheet, visible only to the DM and that player.`,replace:`Record each character's secret on the back of the sheet, visible only to the DM and that player. In Waypoint, record Tolls, Tithes and memory trades in Foresight → Party & ledger → Memory ledger.`},{find:'record Tolls, Tithes and memory trades in Foresight → Party & ledger → Memory ledger.',replace:'record Tolls, Tithes and memory trades in the [Memory ledger](go:memory-ledger) (Campaign → Party & preferences).'}]},
 {id:S1,edits:[s1Opening,s1Do,s1Quill,s1QuillSay,s1Port,s1Patrol]},
 {id:S2,edits:[s2Ferry,s2Dive,s2Hadrik,s2Sneak,s2Eels,s2Singers]},
 {id:S3,edits:[s3Venn,s3Writ,s3Toll]},
];

// The guides go last in each list: they anchor on text the earlier edits leave behind.
const epilogueLedger={find:'Foresight → Party & ledger → Memory ledger lists every Toll in order',replace:'the [Memory ledger](go:memory-ledger) (Campaign → Party & preferences) lists every Toll in order',guide:true};
const sessions=[{id:AFTER,edits:[epilogue,epilogueLedger,...act2(28,'and the roster keeps the session-zero answers.')]},{id:S9,edits:[s9Vaer,s9Calla,s9Theft,s9Dawn,...s9Guide]},{id:S14,edits:[s14Toll,...s14Guide]},...act3Guides,...act4Guides,...finaleGuides,{id:S1,edits:[s1Opening,s1Do,s1Quill,s1QuillSay,s1Port,s1Patrol,s1Guide,...links(1),...card(1),people(1,'### Scene 1: The old dock'),...s1Flow],summary:'A port of forty masts on a drowned town, a girl on the oldest dock, and a bronze tongue that hums.'},{id:S2,edits:[s2Ferry,s2Dive,s2Hadrik,s2Sneak,s2Eels,s2Singers,s2Guide,...links(2),...card(2),people(2,'### If Ila was taken: the Mere road cart'),recap(2,'### If Ila was taken: the Mere road cart'),...s2Flow],summary:'The Night Song, a missing ferry on a sandbank, memory-eels, and a question from the deep: who are you grieving?'},{id:S3,edits:[s3Venn,s3Writ,s3Toll,s3Guide,...links(3),...card(3),people(3,'### Scene 1: Who was on the ferry'),recap(3,'### Scene 1: Who was on the ferry'),...s3Flow],summary:'A missing ledger page, a frightened friar, and the choice of what to do with the Tongue before the Court decides for you.'},...act2Guides];

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
// Revision 7.12: every named NPC gets a first look to read aloud and things to say (npc-voices.cjs), before the page's
// Voice and Wants lines. The pack's own pages carry them in their text; the book's pages take them as edits.
const said=t=>'"'+t.replace(/"/g,"'")+'"';
const voiceEdits=v=>[
 {find:'- **Voice:**',unless:'- **First look (read aloud):**',replace:'- **First look (read aloud):** '+said(v.look)+'\n- **Voice:**'},
 {find:'- **Wants:**',unless:'- **Things to say:**',replace:'- **Things to say:**\n'+v.lines.map(([k,t])=>'  - *'+k+':* '+said(t)).join('\n')+'\n- **Wants:**'}];
for(const v of require('./npc-voices.cjs')){
 const edits=voiceEdits(v),page=pages.find(p=>p.id===v.id),at=pageEdits.find(x=>x.id===v.id);
 if(page)page.body=edits.reduce((b,e)=>b.includes(e.unless)?b:b.replace(e.find,()=>e.replace),page.body);
 else if(at)at.edits.push(...edits);
 else pageEdits.push({id:v.id,edits});
}
// Revision 7.16: the book's copy of each session in the wiki takes the same plan fixes; the Sexton's and Maudrin's pages
// give their Combat stat blocks; the old Encounter Lists page is rebuilt from the fight cards, so it matches the Combat tab.
const addPageEdits=(id,edits)=>{const at=pageEdits.find(x=>x.id===id);if(at)at.edits.push(...edits);else pageEdits.push({id,edits});};
for(const [id,fixes] of [[S5,[s5Lock]],[S6,[s6Tessa]],[S9,[s9Theft,s9Dawn]],[S10,[s10Cold]],[S11,[s11Ambush]],[S13,[s13Sexton]],[S15,[s15Escort]],
 [S16A,[s16aGolems]],[S16B,[s16bCount,s16bNight]],[S17A,[s17aYenna]],[S17B,[s17bCount,s17bDream]],[S18A,[s18aConcord,s18aPrice,s18aHounds]],
 [S18B,[s18bStair,s18bCorin]],[S23,[s23Force,s23Strike]],[S24,[s24Seal,s24Maudrin]],[S25,[s25Stair]],['sb-33f69fa6e5d53e5d',[s16bNight]]]) addPageEdits(id,fixes);
addPageEdits('sb-bb93b0c927c2b0dc',[{find:'- **Stat-lite:** Glass Sexton (CR 5). See Appendix A.',
 replace:'- **2024 stat block:** The Glass Sexton (Imber Vesk), CR 7, in the Combat tab. Session 13 runs his two phases.'}]);
addPageEdits('sb-24aea1701bba67cd',[{find:'- **Stat-lite:** Campaign caster prototype (provisional CR 6). Casts *Silence* and *Counterspell*. Hushmen guard her.',
 replace:'- **2024 stat block:** Chancellor Maudrin Vesk (CR 8) up to the Strike (Session 23); Maudrin Vesk, Keeper of the Seventh (CR 12) from the Summit (Session 24). Both are in the Combat tab. She casts *Silence* and *Counterspell*, and Hushmen guard her.'}]);
const firstSentence=t=>((t||'').match(/^.*?[.!?](?=\s|$)/)||[t||''])[0];
const fights=fs.readdirSync(__dirname).filter(f=>/^act.*\.json$/.test(f)).sort()
 .flatMap(f=>JSON.parse(fs.readFileSync(path.join(__dirname,f),'utf8')).encounters||[])
 .map((e,i)=>{const m=e.id.match(/^enc-s(\d+)([ab]?)-/);return {e,i,n:+m[1],x:m[2]};})
 .sort((a,b)=>a.n-b.n||a.x.localeCompare(b.x)||a.i-b.i);
const encounterBody=`*This list is built from the campaign's fight cards, so it matches the Combat tab, where each card opens with its stat blocks. The level is the one the fight is written for; each card's scale note says how to grow or shrink it for your table. Prepare a way out, a talk, or a goal other than killing for every fight: each card says how it ends.*

`+fights.map(({e,n,x})=>'- **Session '+n+x.toUpperCase()+', '+e.title+':** '+e.creatures.map(c=>c.count>1?c.name+' ×'+c.count:c.name).join(', ')+'. *'+firstSentence(e.scale)+'* Ends: '+firstSentence(e.exit)).join('\n')+'\n\n---';
addPageEdits('sb-45e7ac6f16c59fd8',[{find:'__WHOLE__',replace:encounterBody,unless:"This list is built from the campaign's fight cards"}]);
// Revision 7.16: pop-outs. A name in a plan opens a page only when exactly one page goes by it, so the three people who shared a
// place's name with its page give it back, the book's place and faction pages take the names the plans use, and the bells, the
// campaign's own words and the people the guides name session after session get pages of their own.
for (const [id,drop] of [['v6-npc-brannagh',"Pilots' Hall"],['v6-npc-sela','Reckoning House'],['v6-npc-venn','Vennmark Coster']]){
 const p=pages.find(x=>x.id===id);p.aliases=p.aliases.split(/,\s*/).filter(a=>a!==drop).join(', ');}
const addAliases=(id,to)=>{const at=pageEdits.find(x=>x.id===id);if(at)at.aliases={from:'',to};else pageEdits.push({id,edits:[],aliases:{from:'',to}});};
for (const [id,to] of [['sb-efcdea29187495d0','Hallowmere, Grey City'],['sb-462b2b0d93fd03c2','Pellmoor'],['sb-74c9bfaa3dfbf94e','Shuttered Bell'],
 ['sb-30af780baa82038c','Tithe-Ledger, Tithe-Ledger Room'],['sb-f7d5d89f237775c9','Bone Archive, Sealed Stacks'],['sb-f04ad09a8410cbb6','Sleeping Hall'],
 ['sb-a642c9ff7f79bce3','Hush Shrine'],['sb-72c0b21c8d4cfbdb','Frost Spire'],['sb-655447336897e411','Heart-Hall, Ironhorn Steppe, Ironhorn camp'],
 ['sb-9183922a9ac8e591','Memory Shore'],['sb-426b1a753733a92d','Ossa Belfry, drowned town'],['sb-fd617b364bd1b149','Bellwright, Bellwrights'],
 ['sb-a97db13025803821','Ironhorn, Ironhorn Compact'],['sb-bb6db9d171c44c8e','ferry-folk, Old Shore'],['sb-4bdfcc6a023f3b01','Dawn Order']]) addAliases(id,to);
const lorePage=(id,title,aliases,body,kind='Lore')=>pages.push({id,title,kind,status:'Confirmed',visibility:'DM only',aliases,body});
const weight='Heavy if no bell or one bell has rung before it, Grievous after two or three, Ruinous after four or five. Name the kind and the weight, never the memory, and wait for a yes.';
for (const [id,title,aliases,lines] of [
 ['v7-bell-vaer','VAER, THE BELL OF DAWN',"Vaer, Vaer's Heart",[
  '**Vaer is the bell of dawn, law and beginnings.** It hangs in Vaer\'s Belfry in Hallowmere, a prison and watchtower, in chains of silence-stone above the Dawn Order\'s barracks.',
  '- **While it is silent:** the Long Dusk. The dawn never fully comes to Hallowmere.',
  '- **Its Heart:** Vaer\'s Heart, in the Dawn Order armory. Ser Haldric Mose holds it.',
  '- **The Toll:** a memory of a beginning. '+weight,
  '- **When it can ring:** Session 9.',
  '- **What ringing does:** one whole day of real sun, then a real dawn every morning for a year. The Court issues a Silence Warrant for the Ringer; the Dawn Order enforces it only if Captain Rook lost the oath-duel in Session 6.']],
 ['v7-bell-ossa','OSSA, THE BELL OF MEMORY',"Ossa, Ossa's Heart",[
  '**Ossa is the bell of memory, ancestors and rest.** It hangs in the Ossa Belfry in Old Pellmoor, the drowned town under the Mute Mere.',
  '- **While it is silent:** the dead cannot rest. The Drowned Choir sings grief in Ondra Sallow\'s voice and hunts the Mere.',
  '- **Its Heart:** Ossa\'s Heart. Tam Harrow stole it in 392 SS and hid it in an oilskin in the reeds; Ila Harrow has it in Act I.',
  '- **The Toll:** a memory of someone who has died. '+weight,
  '- **When it can ring:** Session 2 (if they bring the Heart down that night), Session 3, or on a Pellmoor detour in Session 9.',
  '- **What ringing does:** the dead of the Mere are free to rest, and the Choir falls silent and stops hunting. Only the verse releases the Cantor: she sings her own name, then goes quiet. Mother Sallow remembers her husband.']],
 ['v7-bell-hieme','HIEME, THE BELL OF WINTER',"Hieme, Hieme's Heart, Frost Heart",[
  '**Hieme is the bell of winter and endurance.** It hangs in the Frost Spire in Glassreach.',
  '- **While it is silent:** winter is frozen in place. Glassreach froze in a single night in 2 SS, and the Stilled stand in it still.',
  '- **Its Heart:** the Frost Heart, set in the Glass Sexton\'s crown. He can give it in Session 13.',
  '- **The Toll:** a memory, any memory. '+weight+' If nobody will pay, it does not ring.',
  '- **When it can ring:** Session 14.',
  '- **What ringing does:** a thaw. The Stilled wake over several weeks (Session 15). If the Sexton is alive, he weeps. The Court sends Lady Isolde Drave to recover the bell.']],
 ['v7-bell-calla','CALLA, THE BELL OF HARVEST',"Calla, Calla's Heart, Old Granary",[
  '**Calla is the bell of harvest, grace and generosity.** It hangs in the Old Granary at Kell\'s Crossing.',
  '- **While it is silent:** crops fail. Bet Ostrow rang it once, at nine, in 340 SS, and was Tithed for it.',
  '- **Its Heart:** Calla\'s Heart, in the Tithe-Ledger Room of the Court\'s vault, on a shelf marked "Harvest, Withheld". Maudrin Vesk controls it.',
  '- **The Toll:** a gift, given to someone in need, and never returned. '+weight,
  '- **When it can ring:** Session 9, at Kell\'s Crossing.',
  '- **What ringing does:** one harvest season. The ash fields bloom and there is bread for everyone. Court Tithe-men raid the Crossing for the rest of the season, and collectors try to take the Ringer.']],
 ['v7-bell-thrane','THRANE, THE BELL OF STORMS',"Thrane, Thrane's Heart, Lightning Shafts",[
  '**Thrane is the bell of storm, courage and war.** It hangs in the Lightning Shafts at Brassfall.',
  '- **While it is silent:** no storm has crossed the mountains since the Quiet Night. The storms went out to sea instead, and became the Stormwall.',
  '- **Its Heart:** Thrane\'s Heart, in the Heart-Hall of the Ironhorn camp. Thane Oru Kessa holds it, and its dead lightning is killing her.',
  '- **The Toll:** a sense. '+weight,
  '- **When it can ring:** Session 19A, or as the second bell in Session 21.',
  '- **What ringing does:** storms return, storm-stones blaze and metal hums. The Stormwall loosens. Kessa\'s sickness eases and the Ironhorn celebrate. The Court sends a strike force, and Maudrin moves.']],
 ['v7-bell-mirel','MIREL, THE BELL OF DREAMS',"Mirel, Mirel's Heart",[
  '**Mirel is the bell of dreams and hope.** It hangs in the Sleeping Hall at Vael Tor.',
  '- **While it is silent:** nightmares walk. The Sleepless come out of Vael Tor in the shape of a sleeper\'s worst fear.',
  '- **Its Heart:** Mirel\'s Heart, in the Sealed Stacks of the Bone Archive. The Librarian of the Sealed Book keeps it.',
  '- **The Toll:** a fear, which the bell gives the Ringer. '+weight,
  '- **When it can ring:** Session 16B (as soon as they reach it), Session 19B, or as the second bell in Session 21.',
  '- **What ringing does:** the Sleepless dissolve and the sleepers dream gently. The Hush\'s lullaby changes key. Hushmen come to the Tor.']],
 ['v7-bell-ysh','YSH, THE SEVENTH BELL','Ysh, the Seventh, Seventh Bell',[
  '**Ysh is the bell of sleep, peace and rest, and it is silent on purpose.** It hangs in the Hush Shrine, deep under Vael Tor. Its silence holds Oum, the Dreamer, asleep.',
  '- **Its Heart:** the Tuning Key. Maudrin Vesk keeps it in her palace vault in Hallowmere until she leaves the city (Session 22), then carries it in a silence-stone case.',
  '- **The Toll, if it is struck:** all six kinds at once, each Ruinous.',
  '- **Never struck:** in the Concord the Key is seated in the Seventh and never struck, and the Ringer pays the Great Toll instead.',
  '- **Struck:** the Hush opens and Oum begins to wake (Hush Unbound: Remake or Unmake).',
  '- **Where it is decided:** Sessions 26 and 27.']],
]) lorePage(id,title,aliases,lines.join('\n'));
for (const [id,title,aliases,lines,kind] of [
 ['v7-term-ringer','THE RINGER','Ringer, Ringers',[
  '**The Ringer is whoever rings a bell, and the one who pays its Toll.**',
  '- **Who may ring:** any willing adult who is there. Children never ring; Ila may stand beside the Ringer. A character whose player is absent never pays a Toll, and the dead pay nothing.',
  '- **Before it rings:** say the kind of Toll and its weight, never the exact memory, and wait for a yes. If nobody says yes, the bell does not ring and nothing is taken.',
  '- **The weight:** Heavy if no bell or one bell has rung before, Grievous after two or three, Ruinous after four or five. Ysh takes all six kinds at once, each Ruinous.',
  '- **After it rings:** you choose what was taken, within the kind, and it goes on the Toll tracker.',
  '- **Afterwards:** once Vaer rings, the Court issues a Silence Warrant for the Ringer.']],
 ['v7-term-concord','THE CONCORD','Concord',[
  '**The Concord is the ending in which the world is mended.** It is the first of the four paths.',
  '- **What it needs:** all six bells rung (Vaer, Ossa, Hieme, Calla, Thrane and Mirel), Ysh still unstruck, and the Tuning Key in the party\'s hands.',
  '- **The rite:** a willing Ringer seats the Key in the Seventh, never striking it, and pays the Great Toll, giving up their whole name. Session 27 runs it.',
  '- **What it makes:** a restored world, not a perfect one.',
  '- **How the party learns of it:** Edda Thorne\'s diary gives the first hint (Session 5). Corin Aldeth shows them Edda Thorne\'s Notes, which describe it in full (Session 18A).',
  '- **The other paths:** Hush Unbound (Ysh is struck: Remake or Unmake), the Empty Choir (the Court secures the Key and the Long Dusk goes on) and the Second Dawn (the party seals the Key away unstruck, and the world is partly restored).']],
 ['v7-term-tithe','THE TITHE OF MEMORY','Tithe, Tithes, Tithe of Memory, Tithe Clock',[
  '**The Tithe of Memory is the Quiet Court\'s tax in memories.** Since 1 SS, people have given up memories in exchange for protection and tax relief. It pays for the silence-stones and the Court\'s grip on Tonework.',
  '- **Where:** memories are taken and recorded at the Hall of Tithes. The master ledger is in the Tithe-Ledger Room.',
  '- **What it does to people:** those who give too much become Blanks.',
  '- **The Tithe Clock:** each night the party spends inside a Court-controlled city adds one tick, from 0. At 6, the Hushmen sweep the city with a checkpoint on every road. At 12, the Court puts silence-stones in every street. The clock resets after a week away from Court cities; checkpoints and stones already placed stay.']],
 ['v7-term-blanks','BLANKS','Blanks',[
  '**A Blank is someone who has given away so many memories that they no longer know their own family.** They are common in Hallowmere.',
  '- Jonah Bray\'s mother, Mara Bray, is a Blank: she was Tithed of him.',
  '- In Session 7, hundreds of them surround the Hall of Tithes, asking who they were.']],
 ['v7-term-quiet-night','THE QUIET NIGHT','Quiet Night',[
  '**The Quiet Night is the night of 0 SS, when all seven bells fell silent in one breath.** Years are counted from it: SS is years since, BS years before.',
  '- **What happened:** High Sexton Imber Vesk took the Tuning Key from the Bellwright Tower\'s reliquary and tuned the bells into one long, gentle spring, against Edda Thorne\'s warning. The Key sang against the bells, and the Choir went silent. Brassfall\'s storms stopped the same night.',
  '- **What people believe:** that the bells caused it. The Ninefold Church became the Quiet Court on that belief. Within the Court\'s leaders, only Maudrin Vesk knows that the Key did it.',
  '- **The Key afterwards:** it passed to Imber\'s daughter, Cassia Vesk, and stayed in the Vesk reliquary until Maudrin took it in 374 SS.',
  '- **Where the truth comes out:** Edda Thorne\'s diary (Session 5), the Glass Sexton\'s story (Session 13) and the truth of the Key (Session 22).']],
 ['v7-term-warrant','THE SILENCE WARRANT','Silence Warrant',[
  '**A Silence Warrant is a Court order that lets any Hushman arrest the Ringer on sight in a Court city.** The Court issues it after Vaer rings (Session 9).',
  '- The Dawn Order enforces it only if Captain Rook lost the oath-duel (Session 6).',
  '- While it stands, a bluff about the Ringer is 2 harder.']],
 ['v7-term-key','THE TUNING KEY','Tuning Key',[
  '**The Tuning Key is the Heart of Ysh, the Seventh Bell, and the most important object in the campaign.**',
  '- **Its history:** Imber Vesk used it on the Quiet Night. It passed to his daughter, Cassia Vesk, and stayed in the Vesk reliquary until Maudrin Vesk took it in 374 SS, at twenty.',
  '- **Where it is:** Maudrin\'s palace vault in Hallowmere until she leaves the city (Session 22). After that she carries it in a silence-stone case.',
  '- **What it decides:** seated in Ysh and never struck, it makes the Concord. Struck, it opens the Hush. Sealed away unstruck, it gives the Second Dawn. Kept by the Court, it means the Empty Choir.']],
 ['v7-term-oum','OUM, THE DREAMER','Oum, the Dreamer',[
  '**Oum, the Dreamer, is the god dreaming the world.** Nobody has ever seen Oum.',
  '- The seven bells were cast to keep the dream steady. Ysh keeps Oum asleep; the other six keep the world in shape while the dream lasts.',
  '- Some believe Oum is dying. Others believe Oum is waking.',
  '- If Ysh is struck, the Hush opens and Oum begins to wake.']],
 ['v7-term-silence-stone','SILENCE-STONE','silence-stone, silence-stones',[
  '**Silence-stone is a grey stone that drinks sound.** The Court uses it to hold down Tonework.',
  '- Hushmen wear silence-stone gloves. Vaer hangs in chains of it. Maudrin carries the Tuning Key in a silence-stone case once she leaves Hallowmere.',
  '- At 12 on the Tithe Clock, the Court puts silence-stones in every street of the city.']],
 ['v7-term-long-dusk','THE LONG DUSK','Long Dusk',[
  '**The Long Dusk is the grey, endless twilight over Hallowmere since 1 SS.** The dawn has not come since Vaer fell silent.',
  '- Ringing Vaer brings one day of real sun, then a real dawn every morning for a year.',
  '- If the Court secures the Tuning Key (the Empty Choir), the Long Dusk goes on.']],
 ['v7-place-brass-road','THE BRASS ROAD','Brass Road',[
  '**The Brass Road is the old trade road from Brassfall to the steppe,** partly collapsed since the Long Unraveling: bronze carts, ruts, and a sky that flickers with no clouds in it.',
  '- Session 16A opens on it. Corin Aldeth\'s workshop is under a tavern on it (Session 18A), and the Court\'s strike force comes up it (Session 19A).',
  '- Thane Oru Kessa took Thrane\'s Heart from it, and the Heart has been eating her hands since.'],'Location'],
 ['v7-place-hall-of-tithes','THE HALL OF TITHES','Hall of Tithes',[
  '**The Hall of Tithes is where Hallowmere\'s memories are taken and recorded.**',
  '- Court pensions are paid there (Session 4). Hushmen don\'t chase past it.',
  '- **The clerks\' dormitory** (Session 6): one corridor, three doors, a stair-head with an alarm bell, and a kitchen at the bottom. Tessa Caddock is held there.',
  '- **Session 7:** hundreds of Blanks surround it, asking who they were, and Sergeant Orla Gaunt\'s Hushmen form a line on its steps.'],'Location'],
]) lorePage(id,title,aliases,lines.join('\n'),kind);
// People the guides name in more than one scene: each page is built from the guides' two people tables, session by session.
const guideRows=fs.readdirSync(__dirname).filter(f=>/^guide-s\d+[ab]?\.md$/.test(f)).flatMap(f=>{
 const m=f.match(/^guide-s(\d+)([ab]?)\.md$/),n=+m[1],x=m[2],label=n===28?'28 to 30':n+x.toUpperCase(),rows=[];let kind=null;
 for (const line of read(f).split('\n')){
  if (/^\| Who \| What they are \|/.test(line)) kind='who';
  else if (/^\| Who \| Voice and habit \|/.test(line)) kind='voice';
  else if (!line.startsWith('|')) kind=null;
  else if (kind && !/^\|[-| ]+\|$/.test(line)) rows.push({n,x,label,kind,cells:line.split('|').slice(1,-1).map(c=>c.trim())});
 }
 return rows;}).sort((a,b)=>a.n-b.n||a.x.localeCompare(b.x));
const whoName=c=>c.replace(/\*\*/g,'').replace(/\s*\([^)]*\)\s*/g,' ').trim(),whoNote=c=>(c.match(/\(([^)]*)\)/)||[])[1];
// What the characters see on first meeting each of them, and things they say, as on the book's NPC pages. The lines are the
// guides' own where the guides give them.
const guideVoices={
 31:{look:`A woman of about thirty in a shawl stands in the glass, half turned, one hand held out behind her as if somebody small was meant to take it. Around the worn bench at her feet lie a hundred years of candle stubs.`,
  lines:[['Once she is woken',`I've been told. I should like to hear it from you. What year is it?`],['About the other Stilled',`We don't want to be a wonder. We want to be neighbours.`],
   ['Asked what they will do',`We'll walk. Slowly. Tell us which road.`],['About the Sexton',`He asked me to forgive him. I said I'd think about it. I've had practice thinking.`]]},
 32:{look:`An old woman by the fire, with a trapper's hands, a weaver's patience and a basket of candles at her feet. She has been watching you since you arrived, and she doesn't pretend otherwise.`,
  lines:[['Greeting',`You came. I told her you'd come. I tell her everything.`],['About the vigil',`My mother sat with her, and hers. I haven't got a daughter. So it's me, and then it's nobody.`],
   ['About the glass',`Don't use a hammer. Whatever you do. Please.`],['If the players are stuck',`My family has sat with her four hundred years. The voice in the chapel is the first thing that ever answered us.`]]},
 33:{look:`A weather-beaten trapper, out of breath, holds a letter sealed in blue wax well away from himself, as if it might bite. He looks at the fire before he looks at you.`,
  lines:[['About the letter',`Don't ask me to read it. I don't read.`],['Asked who sent him',`An old woman paid me. She talks to the glass.`],
   ['Worried',`There were grey coats on the road behind me. Is that bad?`],['If the players are stuck',`Her hut's by Yara's camp, at the edge of the glass. I'll take you to the first tree. Not one step past it.`]]},
 34:{look:`Among the Stilled at the edge of the clearing stands a man in a sea-coat cut four hundred years out of fashion, with a brass badge on his breast: a ship under three stars. When the glass lets him go, the first thing he does is look at the sky.`,
  lines:[['Greeting',`What year is it? Is it still ten hundred and eighty-two?`],['About the ship',`The Brightwater was moored at a river mouth, west of here, under a sky full of weather. Where did the weather go?`],
   ['About the crew',`There were thirty-one of us. I counted. A bosun always counts.`],['Asked why they came',`We only came ashore for water.`],['About home',`Who won? There was a war on, at home. There's always a war on.`]]},
 35:{look:`On the end of a narrow cot in the clerks' dormitory sits Wren's daughter, knees drawn up, watching the door. She has her mother's face exactly. (At a table that keeps children out of danger, she is Wren's grown sister, with the same face.)`,
  lines:[['Greeting',`Are you from Mam? Don't lie. Everyone here lies, nicely.`],['Asked why she is here',`They keep me so Mam keeps working. She knows it. I know it. We don't say it.`],
   ['On the way out',`Don't let go of my hand till we're outside. Not even on the stairs.`],['Afterwards',`Is Mam all right? Is she in trouble now, because of me?`]]},
 36:{look:`A Hushman sergeant in grey stands by the gate-house door with his arms folded, one hand in a glove of silence-stone. He looks bored, and he misses nothing: who's nervous, who's armed, whose writ is new.`,
  lines:[['Greeting',`Hands where I can see them.`],['At the counter',`Writ.`],['If they refuse the courtesy memory',`Refusing is your right. So is a night in the Belfry.`],
   ['At the north gate, Session 9',`I remember you. You were polite at my gate. Don't make me sorry.`]]},
 37:{look:`Behind the Hushman line on the steps of the Hall of Tithes stands a sergeant with a whistle on a cord and a hand crossbow held low. She is watching the crowd, not you, and counting: her people, their sticks, the ways out.`,
  lines:[['To the crowd',`Clear the steps.`],['To Ilam Bray',`Bray! Back in line!`],
   ['If the party talks to her',`I've got orders, and I've got a square full of frightened people with sticks. Give me a reason to go home.`],['If the crowd sits down',`Nobody dies on these steps today. Not on my record.`]]},
 38:{look:`A woman of sixty, thin as a rake, in a grey robe, comes to meet you with both hands out to take one of yours. Her voice goes down at the end of everything she says, like being tucked in.`,
  lines:[['Greeting',`There. There you are.`],['To anyone tired',`You needn't decide anything. You can just sit.`],
   ['About the Cult',`We don't take. We're given.`],['About the price',`I'll tell you exactly what it costs before you say yes. I wouldn't do that to you.`]]},
 39:{look:`A round little man in a grey robe goes along the rows of beds whispering, always folding something: a blanket, a sock, a hand put back under the covers.`,
  lines:[['Greeting',`Oh, shoes, please. Thank you.`],['About a sleeper',`That's Master Wick. He was a dyer. He's been here since my grandfather.`],
   ['About the sleepers',`They're not unhappy. I'd have known.`],['If they bring socks for bed forty-one',`Forty-one. Aunt Posy. Nobody's ever... Oh, thank you.`]]},
 40:{look:`A young woman, pale and exact, tucks a blanket into an empty bed with perfect corners, then looks up at whichever of you is most tired.`,
  lines:[['Greeting',`I don't dream. It's very restful.`],['To the most tired one',`You look so tired.`],['Asked what she gave',`I don't mind. Really. I don't mind.`]]},
 41:{look:`A big, slow man in a farmer's coat is chopping wood beside the Hall, very carefully, as if he has all the time in the world. Every so often he stops and looks at the door.`,
  lines:[['Greeting',`I was going to take her home. I expect I still am.`],['About his wife',`Bed two hundred and twelve. I sat down for a minute.`],
   ['If they try to take Pip away',`He'll sleep in a bit. He always does in the end.`],['If they offer to bring his wife out',`You'd do that? Then I'm coming. I'll carry her. I'm good at carrying.`]]},
 42:{look:`A boy of six, furious, is throwing stones at the Hall doors one at a time. He is the only person on the hill who looks properly awake.`,
  lines:[['Greeting',`There's a man on the stairs. He's got a hammer. Nobody believes me because they're all asleep even when they're not.`],
   ['Asked how many steps',`A hundred exactly. I did it by listening. And there's a man.`],['Later, proved right',`I said there was a man.`],
   ['A warning',`There's soldiers. They're walking funny. They're not making any noise.`]]},
 43:{look:`A young woman, filthy and hoarse, slides off a ruined horse and stands bent double with her hands on her knees, trying to talk before she has the breath for it.`,
  lines:[['Greeting',`Hallowmere. I've come from... give me a minute. She's packing.`],['The news',`She's leaving the city. Vesk. Herself. Within the day.`],
   ['If they doubt her',`I've watched that gate four years. She's never once come out of it.`]]},
};
for (const [num,title,aliases,names,role,statLine] of [
 [31,'MAREN TALLA','',['Maren Talla'],'A weaver of Glassreach, Stilled on the first night of the freeze, in 2 SS. Wyn Talla\'s family has kept vigil over her for four hundred years. She asks first after her brother, Pell.','Stilled Person while the glass holds her; Commoner once woken'],
 [32,'WYN TALLA','',['Wyn Talla'],'An old trapper at the edge of Glassreach, beside Yara Thenn\'s camp, and the last of her family to keep the vigil over Maren Talla. She paid Edrin Moss to carry the glass letter.'],
 [33,'EDRIN MOSS','',['Edrin Moss'],'A Glassreach trapper who can\'t read. Wyn Talla paid him to carry the glass letter (Session 8). He will guide them to the forest, but never past the first tree.'],
 [34,'CORRAN VELL','Bosun Corran Vell',['Bosun Corran Vell','Corran Vell'],'Bosun of the Brightwater, a ship out of Zazesspur caught in the freeze of 2 SS with thirty-one aboard. He thinks it is 1082 DR.','Stilled Person until calmed; Commoner once thawed'],
 [35,'TESSA CADDOCK, THE HOSTAGE','Tessa, Tessa Caddock',['Tessa Caddock'],'Wren Caddock\'s daughter, held in the clerks\' dormitory of the Hall of Tithes to keep her mother working for the Court (Session 6). If your table has not agreed to children in danger, make her Wren\'s grown sister.'],
 [36,'MABRY COLE','Sergeant Mabry Cole, Sergeant Cole, Sgt Mabry Cole',['Sergeant Mabry Cole','Sgt Mabry Cole','Sergeant Cole'],'The Hushman sergeant on Hallowmere\'s gate (Session 4). He reads writs well. In Session 9 he holds the north gate against the Ringer, and he may remember them.'],
 [37,'ORLA GAUNT','Sergeant Orla Gaunt, Sgt Orla Gaunt',['Sergeant Orla Gaunt','Sgt Orla Gaunt'],'The Hushman sergeant who commands the line at the Hall of Tithes in Session 7. She doesn\'t want a massacre.'],
 [38,'MOTHER LUMEN','',['Mother Lumen'],'Leader of the Hush Cult in the Sleeping Hall at Vael Tor. She is dying slowly, and she feeds the Hush her own dreams first.'],
 [39,'BROTHER LULL','',['Brother Lull'],'A Hush Cultist who looks after the sleepers in the Sleeping Hall. He has never given a dream: he says he is too busy, and he is frightened to.'],
 [40,'SISTER NOD','',['Sister Nod'],'A Hush Cultist of twenty who gave up dreaming last winter, and has forgotten what she used to want.'],
 [41,'WAT FURROW','',['Wat Furrow','Wat and Pip Furrow'],'Came up to Vael Tor in the autumn with his son, Pip, to take his wife home from bed two hundred and twelve of the Sleeping Hall, and stayed.','Hush Cultist'],
 [42,'PIP FURROW','',['Pip Furrow','Pip','Wat and Pip Furrow'],'Wat Furrow\'s son: six, and a bad sleeper. He has given the Hush nothing, keeps waking up, and is the only one who has seen what comes up the stair.','No stats: he is six'],
 [43,'LINNET PASK','',['Linnet Pask','Linnet'],'A scout for anybody who hates the Court. She rides in on a ruined horse in Session 21 with news that Maudrin\'s trunk is being packed, and stays with the party to the summit.'],
]){
 const mine=guideRows.filter(r=>names.includes(whoName(r.cells[0])));
 if (!mine.length) throw new Error('no guide rows for '+title);
 const stats=statLine?[statLine]:[...new Set(mine.filter(r=>r.kind==='who').map(r=>r.cells[2]))],lines=[];
 for (const label of [...new Set(mine.map(r=>r.label))]){
  const who=mine.filter(r=>r.label===label&&r.kind==='who'),voice=mine.filter(r=>r.label===label&&r.kind==='voice'),bits=[];
  for (const r of who){const [,what,,where,starts,influence,secret]=r.cells,note=whoNote(r.cells[0]);
   bits.push((note?'('+note+') ':'')+what+'. **Where:** '+where+'. **Starts:** '+starts+'. **Influence:** '+influence+'. **Secret:** '+secret);}
  for (const r of voice){const [,how,wants,first]=r.cells;bits.push('**Voice:** '+how+'. **Wants:** '+wants+'. **First words:** '+first);}
  lines.push({label,text:bits.join(' ').replace(/\.\./g,'.').replace(/([!?])\./g,'$1')});
 }
 const merged=[];
 for (const l of lines){const last=merged[merged.length-1];if(last&&last.text===l.text)last.labels.push(l.label);else merged.push({labels:[l.label],text:l.text});}
 const v=guideVoices[num];
 if (!v) throw new Error('no first look for '+title);
 const body=['- **Role:** '+role,'- **First look (read aloud):** '+said(v.look),'- **Things to say:**',...v.lines.map(([k,t])=>'  - *'+k+':* '+said(t)),
  '- **Stat block:** '+stats.join('; ')+'.','',
  '**Session by session** *(from the guides\' people tables)*',
  ...merged.map(m=>'- **Session'+(m.labels.length>1?'s ':' ')+m.labels.join(', ')+':** '+m.text)].join('\n').replace(/\.\./g,'.');
 pages.push({id:'v7-npc-'+title.split(',')[0].toLowerCase().replace(/[^a-z]+/g,'-'),title:num+'. '+title,kind:'NPC',status:'Confirmed',visibility:'DM only',aliases,body});
}
// The names the plans use for people and places that had no page: Imber and the Sexton, the Librarian, the Tor, the Spire and the Cult
// open their pages, and the dead the story turns on, the Mere, the Old Works and the other three endings get pages of their own.
for (const [id,to] of [['sb-bb93b0c927c2b0dc','Imber, Sexton, High Sexton'],['sb-b0f92748217e1595','Librarian'],['sb-2ba366669232d0c6','the Tor'],
 ['sb-72c0b21c8d4cfbdb','Frost Spire, the Spire'],['sb-5ab0b331dfa9af2d','the Cult']]) addAliases(id,to);
for (const [id,title,aliases,lines,kind] of [
 ['v7-npc-edda-thorne','EDDA THORNE (DECEASED)','',[
  "- **Role:** Warden of the Bellwright Tower on the Quiet Night. She died in the Court's custody in 9 SS. Nobody meets her; her words come back.",
  "- **What she heard:** at the last routine tuning, in 1 BS, a \"note beneath the note\" in Ysh's tone. She wrote in her diary that she was afraid of it.",
  "- **The Quiet Night:** Imber Vesk ordered her to tune the bells into one long spring. She refused, wrote a warning in her diary and gave him a copy in person. He tuned them anyway, with the Key.",
  "- **Her diary:** taken by the Court's first Tithe-clerks in 1 SS and sealed in the Tithe-Ledger Room, labelled MIREL, LOST. Lysse Carrow has looked for it for years. The party can take it in Session 5.",
  "- **Edda Thorne's Notes:** the Bellwrights' copy of her tuning pages, made after the ban of 112 SS. Corin Aldeth's family keeps them, and he shows them in Session 18A. They describe the Concord.",
  "- **The Librarian:** began as her tuning pages, bound into a book by Court archivists who could not bear to burn them.",
  "- **Where her words matter:** Session 5 (the diary), Session 12 (say her name and the Sexton goes still), Session 13 (read her diary to him and the Frost Heart comes free at once) and Session 22 (her page tells the truth of the Key)."],'NPC'],
 ['v7-npc-cassia-vesk','CASSIA VESK (DECEASED)','',[
  "- **Role:** Imber Vesk's daughter, dead for centuries. Maudrin Vesk is descended from her, through Ilse Vesk.",
  "- **The Key:** when Imber was disgraced after the Quiet Night, Cassia took the Tuning Key home to the Vesk family reliquary. It stayed there until Maudrin took it in 374 SS.",
  "- **Imber remembers her** asleep in the vestry because the rehearsals ran late (Session 12), and laughing like his mother (Session 13). Detect Thoughts on him finds a lullaby and her name. Asking him about her earns Heroic Inspiration.",
  "- **Maudrin says her name** under her breath when she is hurt (Session 23), and again before she strikes (Session 26). Saying it to her gives Advantage on the Persuasion that might stop her."],'NPC'],
 ['v7-npc-ilse-vesk','ILSE VESK','',[
  "- **Role:** Maudrin Vesk's grandmother, and the first Warden of Silence. She is not met in the campaign.",
  "- **374 SS:** she stood in the doorway when Maudrin, at twenty, took the Tuning Key from the family's reliquary. All she said was not to drop it (Session 24).",
  "- **382 SS:** in the chaos after the Ironhorn raid on Brassfall, she seized control of the Quiet Court and named herself Warden of Silence.",
  "- **384 SS:** her Landing Charter made Pellmoor the only lawful landing for foreign ships, with a Court writ of passage for any foreigner going inland.",
  "- **Session 26:** Maudrin says her name before she strikes. Saying it to her gives Advantage on the Persuasion that might stop her."],'NPC'],
 ['v7-npc-wenna-aldeth',"WENNA ALDETH, CORIN'S GRANDMOTHER (DECEASED)",'Wenna, Wenna Aldeth',[
  "- **Role:** a Bellwright, and Corin Aldeth's grandmother. She died in 352 SS.",
  "- **The Great Nightmare Wave (352 SS):** she rang a small handbell at the foot of Vael Tor. The sound lasted one breath. The Sleepless poured out and killed forty people. The Court blamed the Bellwrights, and she was caught and died in the hunt.",
  "- **Her handbell:** cracked, on the back wall of Corin's workshop, labelled with her name and Vael Tor (Session 18A). He lets people hold it, not ring it. Peal, the oldest Heart-Hound, was cast from the crack.",
  "- **Her work:** Corin's family has tried to finish it for three generations: Wenna, his mother, and now him (Sessions 18A and 26)."],'NPC'],
 ['v7-place-mute-mere','THE MUTE MERE','Mute Mere, the Mere',[
  "**The Mute Mere is the great still lake in the middle of Corvane.** The river Pell runs about forty miles inland from the Seam into it. Act I (Sessions 1 to 3) happens on it and under it.",
  "- **Ossa is silent, so the dead don't rest:** their memories bleed into the water. A character who spends a full night on the shore rolls on the Mere Memory table (11.4) unless they make a DC 12 Wisdom save. Drowned bodies do not decay.",
  "- **Under it:** Old Pellmoor, drowned when the Mere rose in 14 SS. Ossa hangs in its belfry, and the Drowned Choir sings there in Ondra Sallow's voice.",
  "- **On its shores:** Pellmoor Landing on the west, where the Pell flows in, and the ferry-folk and the Mere Memory Shore. Vael Tor is three days east, through the marsh; Hallowmere is three days by ferry and road.",
  "- **Its weather:** none for centuries, until the Wrongweather of 382 SS tore up the Pell and opened the Seam. Davin Sallow drowned in it.",
  "- **Six weeks before Session 1,** the ice cracked early, and Tam Harrow's net came up with Ossa's Heart in an oilskin."],'Location'],
 ['v7-place-old-works','THE OLD WORKS','Old Works',[
  "**The Old Works are Old Garrow's mine at Brassfall:** three mouths in a cliff and a foreman's hut with no roof. The galleries run from the mouths to the Lightning Shafts, where Thrane hangs.",
  "- **372 SS:** Garrow found an unstable deposit of dead lightning, sealed the shafts with his own hands and died in the collapse. His ghost walks the mine with a blue lamp.",
  "- **382 SS:** the Ironhorn, raiding for bronze, broke his seals. The dead lightning called the storms at the rim, and the Wrongweather opened the Seam.",
  "- **Session 16A:** with Garrow's lamp it is a guided tour, with no rolls. Without it there are three galleries: long and safe, flooded and humming, or short and visibly cracked (DC 13 Dexterity save, 3d6 Bludgeoning damage, half on a success).",
  "- Garrow's body lies under the fall in the middle gallery. His daughter, Yenna Garrow, has heard his voice in the mine for a year and never told the Thane."],'Location'],
 ['v7-term-empty-choir','THE EMPTY CHOIR','Empty Choir',[
  "**The Empty Choir is the ending where the Court wins (10.1).** The Court secures the unstruck Key and the shrine, and the group ends its resistance.",
  "- **Only by choice:** it happens only if every player says they have finished fighting (Session 27). If the Court has the Key and they are still fighting, it is the rescue chapter instead.",
  "- **The world:** the Long Dusk goes on and the Court rules. The places the party changed still bear their mark.",
  "- **Sessions 28 to 30:** Scene 2, in whispers, then the Court rules on in Scene 5. The epilogue script is Path 3 in 10.4. The tone is dark and quiet."]],
 ['v7-term-second-dawn','THE SECOND DAWN','Second Dawn',[
  "**The Second Dawn is the ending where the party seals the Key away unstruck (10.1).** Any number of bells may have been rung.",
  "- **The price:** no Toll. One character, one uninterrupted minute at the recess in the rock below Ysh: in a fight, one action a round for ten rounds, and a skipped round starts it again (Session 27).",
  "- **What changes:** what was rung stays rung; what wasn't doesn't come back. With no bells rung it is a stalemate, and nothing is mended. If Mirel is unrung, seven Sleepless come up the stair.",
  "- **It is also the way out** if a Ringer declines the Great Toll (10.3).",
  "- **Sessions 28 to 30:** all five scenes. The epilogue script is Path 4 in 10.4. The tone is mixed and realistic."]],
 ['v7-term-hush-unbound','THE HUSH UNBOUND','Hush Unbound, Remake, Unmake',[
  "**The Hush Unbound is the ending where the Seventh is struck (10.1),** by the party or by Maudrin. It stays open until the Key is sealed.",
  "- **The price:** whoever strikes pays all six kinds of Toll, each Ruinous: the Memory, the Year, the Sense, the Name, the Fear and the Gift.",
  "- **Then Oum wakes** and asks whether the dream is finished. Oum asks direct questions and never lies (Session 27).",
  "- **Remake:** Oum dreams the world again from the parts it loved best. Each player names one thing that won't be lost.",
  "- **Unmake:** the dream ends: one last night with everyone they love, then the light. It happens only if every player wants it; any doubt means Remake. The votes are folded, on paper.",
  "- **Sessions 28 to 30:** a Remake runs Scenes 1 to 4 in a world a little different, then the rebuilt one. An Unmake skips to the last night. The tone is hopeful and strange (Remake), or sad and beautiful (Unmake)."]],
 ["v7-term-far-shore","THE FAR SHORE","Far Shore",["**The Far Shore is the ending where the party leaves Corvane for good (7.19).** Once Thrane is rung the Seam is wide enough for a fleet, and the party can sail out with everyone who will come.","- **Only by choice:** the players choose it (any-sail-out); a clock or a lost fight never does. Ysh must still be unstruck.","- **What stays behind:** the bells, the Court, the Hush failing slowly, and everyone who won't come. Each player names one person who comes and one who stays.","- **The Seam front:** after Thrane the Sword Coast fleets arrive. Write the Pellmoor Charter with Brannagh, Sela and Venn, or the Seam clock runs to 6 and the Landing falls to the fleets and the Court.","- **Session 28:** the epilogue round at sea and on a Sword Coast dock (s28-far-shore). The tone is bittersweet."]],
 ["v7-term-dreamers-sleep","THE DREAMER'S SLEEP","Dreamer's Sleep",["**The Dreamer's Sleep is the ending on the Hush's side (7.19).** The party keeps Oum asleep because Oum is tired and loves its dream.","- **The oath:** \"I will keep the Dreamer's sleep.\" Taken with Mother Lumen in the Sleeping Hall (Session 17B), or at the bell after hearing the Hush on the Stairs (Sessions 25 and 26).","- **What it needs:** the oath, the Cult's feeding stopped, Ysh unstruck, the Key in the party's hands, and someone at the Shrine.","- **What happens:** the Key is laid in the Hush, so nobody can strike Ysh again. The stolen dreams come home and the sleepers wake. What was rung stays rung, and nothing else is mended.","- **Session 28:** the epilogue round, ending with whoever stayed below to sing (s28-dreamers-sleep). The tone is gentle."]],
 ["v7-term-reformed-court","THE REFORMED COURT","Reformed Court, Reform clock",["**The Reformed Court is the path inside the Court (7.19).** A party that took Maudrin's bargain in Session 4 can accept her commission and work as her agents.","- **Agents:** a writ that opens Court doors, errands with a Warden minder, and friends who may not forgive the grey seal.","- **Reform:** each reform won from inside (a Tithe ended, a Ringer pardoned, jars sent home) ticks the Reform clock. At 3 Maudrin asks what they want the Court to be; at 6 her Final Offer becomes the Reformed Court (s24-reformed-court).","- **Turning:** they can use the writ against her once (any-turn-on-the-court). The favor breaks and the reforms stop.","- **Endings:** a reformed Maudrin can be the Seventh's voice for the Concord, or keep the empty chair."]],
 ["v7-term-empty-chair","THE EMPTY CHAIR","empty chair, Claim clock",["**The empty chair is the contest over who rules the Ninefold Shore after Maudrin (7.19).** It runs from Act III to the epilogue.","- **Claimants:** Captain Rook and the Dawn Order, Tristan Vesk, Thane Kessa, the Blanks' bench, one of the party, or a reformed Maudrin.","- **Backers:** each faction backs the party's claimant for one promise (any-claim-backers), and each backer ticks the Claim clock. A broken promise loses the backer.","- **Pressure:** at Claim clock 3 a rival strikes at the claimant (any-claim-rival-moves).","- **Session 28:** with the Claim clock full the shore seats the claimant (s28-chair-seated); otherwise it is argued out on the terraces (s28-chair-contested)."]],
]) if (kind==='NPC') pages.push({id,title,kind,status:'Confirmed',visibility:'DM only',aliases,body:lines.join('\n')}); else lorePage(id,title,aliases,lines.join('\n'),kind);
module.exports={pages,pageEdits,cardEdits,sessions,campaign,planner,pellmoorBody,remove};
