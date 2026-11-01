// The four endings (v5 Part 10 and 2.11), as requirements over the world-state flags, with routes that show how a missing piece can still be reached.
const r=(flag,list)=>({flag,in:list});
const bell=(id,name,routes)=>({label:name+' has been rung',when:[r('bell_'+id,['rung'])],routes});
const concord=[
 bell('vaer','Vaer (dawn)',[
  {when:[r('t_vaer',['armory'])],text:'Vaer’s Tongue is in the Dawn Order armory under Haldric. Win Rook’s oath-duel (S6) and she hands it over, or steal it (DC 15 Thieves’ Tools, two guards at the chain-room).'},
  {when:[r('t_vaer',['rook','party'])],text:'You hold Vaer’s Tongue. Ring it at Vaer’s Belfry in Hallowmere (S9). Toll: a memory of a dawn you loved. A Silence Warrant follows.'},
  {when:[r('t_vaer',['bell'])],text:'The Tongue is still fitted in Vaer’s bell. It can be rung there again.'},
  {when:[r('t_vaer',['court'])],text:'The Court took Vaer’s Tongue. Recover it from Maudrin’s forces at the Strike (S23), or through Ansel Quay.'}]),
 bell('ossa','Ossa (memory)',[
  {when:[r('t_ossa',['ila','party'])],text:'Take the Tongue to the Ossa Belfry under the Mere: the Tidewarden’s air pocket or the ferry-stair (S3).'},
  {when:[r('t_ossa',['belfry'])],text:'The Tongue is at the belfry. The Ringer only has to reach it.'},
  {when:[r('t_ossa',['armory'])],text:'In the Dawn Order armory. Rook’s win at the oath-duel (S6) returns it; then the Tidewarden ferries the Ringer.'},
  {when:[r('t_ossa',['court'])],text:'In the Court’s keeping. Steal it from the vault (S5, Situation 4), bargain for it with Maudrin, or take it at the Strike (S23).'},
  {when:[r('t_ossa',['venn'])],text:'Aboard Master Venn’s Gilded Heron. Recover it before the ship clears the Seam (S3): board her, buy it back, or have Brannagh Wick deny her a pilot.'},
  {when:[r('t_ossa',['abroad','lost'])],text:'Gone from Corvane. A voyage to Athkatla, or the safety valve: the Heron wrecks in the Stormwall and the Mere returns the Tongue weeks later.'}]),
 bell('calla','Calla (harvest)',[
  {when:[r('t_calla',['vault'])],text:'In the Tithe-Ledger Room on the shelf marked HARVEST, WITHHELD. The S5 vault (DC 15 Thieves’ Tools or Ansel Quay), Ilam Bray’s service key (S7), or a return to Hallowmere later (Situation 21: Wren’s route or Bet’s unsearched carts).'},
  {when:[r('t_calla',['party'])],text:'You hold Calla’s Tongue. Ring the Old Granary at Kell’s Crossing, three days up the North Road (S9). Toll: a Gift.'},
  {when:[r('t_calla',['bell'])],text:'Fitted at the Old Granary. It can be rung there again.'},
  {when:[r('t_calla',['court'])],text:'The Court moved it. Ansel Quay knows where.'}]),
 bell('hieme','Hieme (winter)',[
  {when:[r('t_hieme',['sexton'])],text:'In the Glass Sexton’s crown. Listen to his confession (S13) and he gives it; or end his winter-moment; or defeat his shell.'},
  {when:[r('t_hieme',['party'])],text:'Climb the Frost Spire and ring it (S14). Toll: a Memory.'},
  {when:[r('t_hieme',['bell'])],text:'Fitted at the Frost Spire.'},
  {when:[r('t_hieme',['court'])],text:'Isolde took it for the Court (S15). Recover it from her, or at the Strike (S23).'}]),
 bell('thrane','Thrane (storm)',[
  {when:[r('t_thrane',['kessa'])],text:'In Kessa’s Tongue-Hall. Win the steppe contest and swear to return it (S17A or S20); or steal it (DC 15 Stealth past the riders); or Yenna Garrow smuggles it for a favor.'},
  {when:[r('t_thrane',['party'])],text:'Ring it at the Lightning Shafts in Brassfall (S19A or S21). Toll: a Sense for one day. The Stormwall loosens.'},
  {when:[r('t_thrane',['bell'])],text:'Fitted at the Lightning Shafts.'},
  {when:[r('t_thrane',['court'])],text:'The Court’s strike force took it. Recover it at the Strike (S23).'}]),
 bell('mirel','Mirel (dreams)',[
  {when:[r('t_mirel',['librarian'])],text:'The Librarian of the Sealed Book trades it for a dream never told, or a Gift (S5); or steal it from the Sealed Stacks (DC 16).'},
  {when:[r('t_mirel',['courier'])],text:'The Librarian’s courier waits at the Sleeping Hall with the same offer (S16B or S20).'},
  {when:[r('t_mirel',['party'])],text:'Ring it at the Sleeping Hall on Vael Tor (S19B or S21). Toll: a Fear for one day.'},
  {when:[r('t_mirel',['bell'])],text:'Fitted at the Sleeping Hall.'},
  {when:[r('t_mirel',['court'])],text:'The Court took it. Recover it at the Strike (S23).'}]),
 {label:'Ysh is still unstruck',when:[r('ysh',['unstruck'])],routes:[{text:'Once Ysh is struck, the Concord is gone; the table chooses Remake or Unmake.'}]},
 {label:'The party controls the Tuning Key',when:[r('key',['party'])],routes:[
  {when:[r('key',['palace'])],text:'Before Maudrin leaves Hallowmere: her palace vault (Situation 4). Ansel knows the schedule; DC 16 lock, DC 14 to cut the tether.'},
  {when:[r('key',['maudrin'])],text:'On Maudrin’s chain in a silence-stone case. Take it at the Strike (S23, DC 16 Sleight of Hand once she has been struck) or at the summit (S24).'},
  {when:[r('key',['court'])],text:'Secured by the Court. Only a rescue or theft chapter brings it back.'}]}];
// Every ending needs someone at the Hush Shrine; "reached" marks the closing state the table records when the ending happens.
const shrine={label:'Someone has come down the Stairs of the Hush',when:[r('shrine',['reached'])],routes:[{text:'The Stairs of the Hush under Vael Tor (S25). The party needs the Key, or must take it from Maudrin on the stairs or at the bell.'}]};
const keyHeld={label:'The party controls the Tuning Key',when:[r('key',['party'])],routes:concord[7].routes};
module.exports=[
 {id:'concord',title:'The Concord',tone:'Bittersweet',summary:'All six regional bells rung, Ysh unstruck, the party holding the Key, and a willing Ringer who seats it without striking and accepts the Great Toll (asked in private, always refusable). The world is restored, imperfectly; the Ringer becomes the Seventh’s voice.',reached:[r('ysh',['concord'])],requires:[...concord,shrine]},
 {id:'second-dawn',title:'The Second Dawn',tone:'Mixed, realistic',summary:'The party seals the Key in the shrine’s recess, unstruck: one uninterrupted minute, no Toll. Only the domains whose bells were rung are stabilised; the more bells, the fuller the restoration. With no bell rung it is a stalemate, not a dawn: tell the table before they choose it.',reached:[r('ysh',['sealed']),r('key',['sealed'])],requires:[keyHeld,{label:'Ysh is still unstruck',when:[r('ysh',['unstruck'])],routes:[{text:'Once Ysh is struck, only the Hush Unbound remains.'}]},shrine]},
 {id:'unbound',title:'The Hush Unbound',tone:'Hopeful and strange, or sad and beautiful',summary:'Someone strikes Ysh with the Key and pays all six Tolls. Oum wakes, and the players choose Remake or Unmake together (Unmake needs everyone’s agreement; otherwise Remake). If Maudrin strikes, she pays the Tolls and the players still choose.',reached:[r('ysh',['struck']),r('oum',['remake','unmake'])],requires:[{label:'Someone with the Key is at Ysh',when:[r('key',['party','maudrin'])],routes:[{when:[r('key',['palace','court'])],text:'The Key is locked away. Take it (Situation 4, the Strike S23) or let Maudrin carry it to the shrine.'}]},{label:'Ysh has not been sealed',when:[r('ysh',['unstruck','struck'])]},shrine]},
 {id:'empty-choir',title:'The Empty Choir',tone:'Dark, quiet',summary:'The Court secures the unstruck Key and seals the shrine, and the group chooses to end its resistance. A clock or a lost fight never chooses this ending; defeat becomes escape, capture or rescue instead.',reached:[r('key',['court']),r('resistance',['ended'])],requires:[{label:'The Court holds the Key',when:[r('key',['palace','maudrin','court'])]},{label:'Ysh is unstruck',when:[r('ysh',['unstruck'])]},{label:'The table chooses to end its resistance',when:[r('resistance',['ended'])],routes:[{text:'Only by the players’ choice: a surrender at the Strike (S23), a deal with Maudrin at the summit (S24), or walking away at the bell (S26).'}]}]}];
