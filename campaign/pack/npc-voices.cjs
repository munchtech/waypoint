// Revision 7.12: for every named NPC, what the characters see on first meeting (to read aloud) and things the NPC can say,
// so a first-time DM has words ready when players talk to them, and a line that points stuck players at the next lead.
// lore.cjs puts each "look" before the page's Voice line and the lines before its Wants line.
// Each line is speech; lore.cjs wraps it in quotes. Ondra speaks only in hymn lines, with " / " between them.
module.exports = [
  {id:'sb-c1c8e4fee6502412', // Ila Harrow
   look:`A thin girl in a ferry coat several sizes too big stands at the very end of the old dock, sleeves rolled back four times. Her eyes are gray and fixed on the water, and her hands are folded tight. When the light shifts, her shadow doesn't quite move with it.`,
   lines:[
    ['Greeting',`You're not from the Old Shore. Your boots are too clean. What do you want?`],
    ['Asked about the hum',`It hums. Low, like someone humming with their mouth shut. Four beats, then a gap. I counted.`],
    ['Asked about her father',`Everyone says Da drowned. Da was the best pilot on the Old Shore. Pilots don't drown on a still night.`],
    ['If the players are stuck',`Mother Sallow keeps the ferry ledger. Every crossing, for hundreds of years. If Da went out that night, it's written down. Or ask Brannagh at the Pilots' Hall. She was his boss.`],
    ['If someone says "don\'t worry"',`One, two, three, four... Don't. That's what people say right before something bad happens.`],
    ['Once she trusts them',`Da left me something. I'm not supposed to show anyone. You'll tell me the truth about it? Even the bad parts?`]]},
  {id:'sb-7d90e0f92bf832a7', // Mother Sallow
   look:`A small, wiry old woman sits in the doorway of a reed-hut, shelling something into a bowl. Her hands are stained green to the wrist. An unlit pipe hangs from the corner of her mouth, and she watches you come the way a heron watches a fish.`,
   lines:[
    ['Greeting',`Strangers on the Old Shore. Either you're lost or you're selling. Which?`],
    ['Asked about the ledger',`Every crossing since the first ferry. Who went out, who came back. The water forgets. The ledger doesn't.`],
    ['Asked about the Court',`The Court counts what we remember and calls it a tax. A tax on remembering. Fish would laugh at it.`],
    ['If the players are stuck',`Three ways to learn anything on this shore: read the ledger, ask the pilots, or sit still and listen to the water. One of the three always talks.`],
    ['If someone speaks a dead person\'s name',`Say it again. Slower. Names are the only thing the Mere gives back.`],
    ['Asked about the stone she keeps',`There's a stone on the Memory Shore I keep clean. Don't ask me whose. I'll tell you when I remember.`],
    ['If charmed or flattered',`Save the honey for the Quays. Tell me something hard and true and we'll get along.`]]},
  {id:'sb-2d0812c8012139db', // Brother Eld
   look:`A tall friar with rounded shoulders stands in the chapel doorway, wiping his fingers on a cloth already black with ink. His face is kind, and very practised at looking sorry.`,
   lines:[
    ['Greeting',`Welcome, travellers. "The Ninefold keep a door for every stranger." Have you come to give, or to pray?`],
    ['Asked about the Tithe',`The Tithe is a mercy, truly. We give what weighs on us, and we walk lighter. So the book says.`],
    ['Asked about Ila or the village children',`The Harrow girl? Troubled, poor thing. Children hear all sorts in the reeds. I pray for them. I keep a list, for my prayers.`],
    ['If the players are stuck',`For the village's comings and goings, ask Mother Sallow; she keeps the ferry ledger. Hushman Quill keeps the other ledger, at the Landing House.`],
    ['If confronted with the children\'s names',`Stop. Please. Tell me first that I can still be forgiven. Then I'll tell you everything.`],
    ['If threatened',`"The quiet shall inherit the hall." Please, there's no need for that. I'll help. What do you need?`]]},
  {id:'sb-74b354c032f8f361', // Captain Dessa Rook
   look:`A broad, weathered woman in a cloak that was once the color of sunrise and has faded to the gray of old ash. She stands like someone who has been at attention for twenty years and has forgotten how to stop.`,
   lines:[
    ['Greeting',`State your names and your business. We don't have time for anything else.`],
    ['Asked about the dawn',`We swore to keep the dawn. We've kept a dusk instead, for longer than most of our knights have been alive. Ask any of them how that sits.`],
    ['Asked about Ser Haldric',`Ser Haldric is the senior knight of this Order. That's all we'll say about Ser Haldric. In public.`],
    ['If the players are stuck',`You want something from the Dawn Order, bring us an oath, a writ, or proof. Proof of what's being taken from this city would open more doors than the other two.`],
    ['If they protect someone innocent',`That was well done. We don't say that often. We'll remember it.`],
    ['If pushed to break a rule',`Careful. We bend rules. We don't break oaths.`]]},
  {id:'sb-6b6484b93ab7ab80', // Ser Haldric Mose
   look:`A handsome knight in armor so polished it throws the lamplight back twice over. He is buffing a gauntlet with a soft cloth, and he smiles at you before you've said a word.`,
   lines:[
    ['Greeting',`Friends! Hallowmere has so few visitors. Whatever you need, the Dawn Order is at your service, for the good of all.`],
    ['Asked about Vaer\'s Heart',`It's safe. Perfectly safe, in my keeping. The dawn will come when it's time, and not a moment before.`],
    ['Asked about Captain Rook',`The Captain is a fine soldier. Tired, of course. Some of us think the Order needs fresh light.`],
    ['If the players are stuck',`Help me and I'll help you. The Captain has called me to an oath-duel. Stand with me, and every door in Hallowmere opens for you.`],
    ['Making an offer',`Let's not be enemies. Tell me what you want, I'll tell you what it costs, and everyone goes home happy.`],
    ['If exposed or cornered',`You think the Captain frightens me? I have friends in the Court who don't need oaths.`]]},
  {id:'sb-24aea1701bba67cd', // Chancellor Maudrin Vesk (her bargain line is already on the page)
   look:`An elegant white-haired woman in dove-gray silk sits very still. Her gloves are pale stone, and where her hands rest the room seems a little quieter, as if the air itself has stopped to listen to her.`,
   lines:[
    ['Greeting (use their names)',`Please, sit. You've come a long way, and I know your names already. Let's not waste each other's time.`],
    ['Asked about the Silence',`The bells broke this world once. I keep it from breaking again. That is all the Silence is: a door kept shut.`],
    ['Asked about the Key',`Some things are better kept by someone who understands them. I understand it very well.`],
    ['If the players are stuck (a slip she lets them have)',`If you want an audience, write to Ansel, my steward. He keeps my calendar, and my ledgers.`],
    ['If they refuse her bargain',`That's a shame. I did ask first. Remember, later, that I asked first.`],
    ['If cornered',`Do you think I enjoy this? Someone has to hold the door shut. If not me, tell me who.`]]},
  {id:'sb-604f141fc3833c2f', // Corin Aldeth
   look:`A thin man in a scorched leather apron, his hands shiny with old burns. His head is tilted, one ear turned toward you, as though you are making a sound only he can hear. He is humming.`,
   lines:[
    ['Greeting',`You've rung one. I can hear it on you. Which bell? Tell me what it sounded like.`],
    ['Asked about the Seventh Bell',`Six bells mend a world. The seventh wakes it. Do you want to stop the unravelling, or just slow it down?`],
    ['If they gave a memory to the Tithe without a fight',`You handed it over? Without a fight? Then you paid them to forget you.`],
    ['If they have rung a bell',`My grandmother rang the first handbell at Vael Tor. They called her mad. She was only early.`],
    ['If the players are stuck',`Ask me plainly. Anything about the bells. I'll answer straight; it's the Court that lies.`],
    ['If they stand against him',`Then you're the Court's after all. Stand aside, or stand in the sound.`]]},
  {id:'sb-95958d33cca050ae', // Thane Oru Kessa
   look:`A huge bearded man with bronze wire braided through his hair sits on a camp stool far too small for him. His face is weathered and open, and he's grinning like he already knows how this ends. Now and then sparks crawl across the knuckles of his right hand.`,
   lines:[
    ['Greeting',`Riders! Sit. Drink. Tell me something true and I'll tell you something useful.`],
    ['Offering a wager',`A wager, rider: I say you can't finish that cup standing up. Loser owes the winner a favour.`],
    ['Asked about the Court',`The Court taxes my clans in memories. My grandmother's songs sit on a shelf in Hallowmere. I want them back, and I want the shelf.`],
    ['If the players are stuck',`You want into the Old Works? Ask Yenna Garrow at the horse lines. Her father dug those shafts. She knows more than she tells me.`],
    ['If lied to',`You lied to me in my own tent. Get out, before I decide what that costs.`],
    ['Asked about his hand',`Nothing. A tickle from the Heart. Don't tell the clans, rider, or I'll tell them you cheat at dice.`]]},
  {id:'sb-8fe1e47955a9ef60', // Lysse Carrow
   look:`A young woman with ink on her cheek and a bone pin in her hair hurries past under a satchel of books so heavy it drags one shoulder down. She drops one, apologizes to it, and picks it up.`,
   lines:[
    ['Greeting',`Oh! You're not Hushmen. Good. Sorry. Hello. Are you here to read, or to ask? Most people only ask.`],
    ['Asked about the Quiet Night',`Every account says the bells caused it. Every one. Which is odd, because they all cite the same source, and the source is missing. Sorry. That's interesting to me.`],
    ['Asked about the archive',`Everything that's catalogued, I've read. The Sealed Stacks aren't catalogued. Nobody's allowed in. I'm sure that's... fine.`],
    ['If the players are stuck',`If it was Tithed, it was filed. If it was filed, it's here. Give me a name and a year and I'll find you the shelf.`],
    ['Asked about Edda Thorne',`Edda Thorne's diary would answer everything. Everyone says it was burned. Nobody says who watched it burn.`],
    ['If Hushmen appear',`Please, not here, they'll... I can't. The back stairs. Go. Go.`]]},
  {id:'sb-99d5e62a4dc08351', // Ondra Sallow, the Cantor: hymn lines only
   look:`A pale woman rises from the water to the waist, long hair plastered to a sodden ferry-coat. Her skin is the gray of river stone and her eyes are far too bright. When she opens her mouth she does not speak. She sings.`,
   lines:[
    ['Greeting',`Who comes down to the water's edge / with names upon their tongue, / or empty-handed, empty-mouthed, / forgetting all they've sung?`],
    ['If someone speaks a dead person\'s name',`Say it twice and say it true, / and the Mere will sing it too.`],
    ['If the players are stuck',`The ledger keeps what the water lost; / the keeper's blood is mine. / Go ask the one with green-dyed hands / to read the oldest line.`],
    ['Bargaining',`One true memory of one you've lost, / and the deep will open wide.`],
    ['If they have forgotten their dead',`You gave your dead to the shelf and the stone; / now give the rest to me.`],
    ['If they offer to release her',`Remember me. Ondra. Remember me, / and let the water go.`]]},
  {id:'sb-bb93b0c927c2b0dc', // The Glass Sexton
   look:`In the middle of the hall stands a figure of clear glass in ceremonial robes, a Sexton's crown on its head with a cold blue stone set in the brow. Inside the glass, very close to the surface, is a human face. Its eyes move to follow you.`,
   lines:[
    ['Greeting',`Ah, the congregation arrives at last, though late, and few, and with snow upon their shoulders, as every congregation in this place has always arrived, and so I shall begin, as I always begin, with silence.`],
    ['Threatening',`Kneel, or be kept as I am kept, beautiful and still and finished, which is the only perfect state a soul may reach.`],
    ['Pleading',`Please. Thaw the moment only a little, enough that I may say the thing I have carried, for I have confessed to the frost for nearly four hundred years and the frost does not absolve.`],
    ['If the players are stuck',`The winter lives in what I wear upon my brow, and if you would end this sermon, children, look there.`],
    ['Once the winter-moment breaks',`It was not the bells. Hear me. It was the Key, the Key, and my Cassia carried it home, and I know where it sleeps.`]]},
  {id:'sb-9450ca26e27fd64c', // Tam Harrow, heard only in a Mere Memory
   look:`A broad ferryman stands in the memory with his sleeves rolled, laughing at something, a laugh like a bucket dropped on a dock. He doesn't see you. He's busy, and he's happy, and he keeps glancing toward a small gray-eyed girl on the dock.`,
   lines:[
    ['In the memory, to Ila',`Count the knots for me, Ila. Good girl. Never trust a rope you haven't counted.`],
    ['If the memory turns to the Heart',`It goes back to the Choir. It was always theirs. I only borrowed it off the people who stole it first.`],
    ['If the players are stuck',`If anything happens, the Belfry. Brannagh knows the way.`],
    ['Last words in the memory',`Tell her I wasn't lost. Tell her I knew exactly where I was going.`]]},
  {id:'sb-34c4167aee555810', // Old Garrow
   look:`A gray-bearded miner flickers into view in the dark of the tunnel, holding up a lamp that burns blue. He is not quite solid, and his lamplight doesn't touch the walls. He squints at you like a foreman at a late shift.`,
   lines:[
    ['Greeting',`Lads and lasses! You're late, you're loud, and you're standing where the roof came down. Move.`],
    ['Asked about the dead lightning',`Sealed it myself. Every shaft. Too well, maybe. Should've filled the lot with rock and walked away.`],
    ['If the players are stuck',`Want through? Follow the lamp, step where I step, and don't touch the blue seams. Simple. Even for you lot.`],
    ['Asked about his family',`My girl's out with the horse-clans. Yenna. If you see her, tell her her old man's sorry. She'll know what for.`],
    ['If they mention the Court or an inspector',`Inspectors. Counted my men like sacks of ore. Get out of my mine.`],
    ['Goodbye',`Go on, then. Shift's over. Mind your heads.`]]},
  {id:'sb-e8700e46e11e09a3', // Yara Thenn
   look:`A woman with a shaved head and fingerless leather gloves crouches over a flower made of ice, working at its stem with a fine-toothed saw. Inside each glass petal, something tiny is moving. She doesn't look up.`,
   lines:[
    ['Greeting',`Mind your feet. That patch is worth more than your boots. What are you buying?`],
    ['Asked about the glass-flowers',`Each one's a moment the cold caught. Somebody's breakfast. Somebody's kiss. Sells by the petal.`],
    ['Asked about the Frost Spire',`Nobody's mapped the Spire. Anyone who says they have is selling you a napkin. I'd pay good coin for a real map.`],
    ['If the players are stuck',`Paths up here freeze, thaw, and freeze different. I know every one that's open today. Price is a tool, not coin. Got a good knife?`],
    ['Haggling',`Coin's nice. Coin doesn't cut ice. Trade me something useful and I'll throw in the route.`],
    ['Asked about the flower she keeps',`That one's not for sale. It's nothing. Somebody laughing. Leave it.`]]},
  {id:'sb-0c4ea1fe0f6d050d', // Lady Isolde Drave
   look:`A woman in silver jewelry and a gray lace mask drifts through the room with a glass of something steaming. She has noticed you, decided what you're worth, and is already on her way over.`,
   lines:[
    ['Greeting',`New faces! How rare, and how refreshing. Tell me everything. I promise to repeat only the interesting parts.`],
    ['Asked about the Court',`The Court is a family, darling. Everyone hates each other and no one ever leaves.`],
    ['Selling information',`Secrets are like wine: dearer when they're old, and better shared. What are you pouring?`],
    ['If the players are stuck',`If you want to know where something is kept in this city, ask who holds the keys. Maudrin's steward, Ansel, is a sweet little man who worries terribly about money.`],
    ['If out-talked',`Well. Aren't you clever. I'll remember that, and I don't mean it kindly.`],
    ['If they mention her son',`Leave my son out of this, or I'll put you in it.`]]},
  {id:'sb-7c01e4271fffe177', // Jonah Bray
   look:`A thin boy of nine or so, with very big eyes, sits on a step turning a little wooden bird over and over in his hands. When he sees you watching, he holds it tighter.`,
   lines:[
    ['Greeting',`Hello. Hello. Are you nice? Some people are nice.`],
    ['Asked about the bird',`It's a bird. I don't know where it came from. I always had it. I think somebody made it for me.`],
    ['Asked about his family',`I want to remember my mum's face. I know I had one. Everybody has one.`],
    ['If the players are stuck',`There's a man with gray gloves who looks at my bird. He doesn't hurt me. He just looks, and then he goes away.`],
    ['Repeating what he hears',`"Tell no one"? Tell no one. Okay. I'll tell no one.`],
    ['If Hushmen come',`The gloves are coming. Can I stand behind you?`]]},
  {id:'sb-0c02f526d66aff34', // Ilam Bray
   look:`A gray-faced Hushman stands a little apart from the others, silence-stone gloves on his hands. Pale curls of fresh wood shavings cling to his coat pocket, as if he's been whittling something in secret.`,
   lines:[
    ['Greeting',`Papers? Papers. Sorry. Do you have... papers?`],
    ['If he sees the wooden bird',`That bird. Who... who made that bird? Sorry. Sorry. It doesn't matter.`],
    ['Asked about being a Hushman',`I wear the gloves. I don't remember putting them on. Is that strange? Sorry.`],
    ['If the players are stuck',`The boy on the steps, with the bird. Is anyone looking after him?`],
    ['If reunited with Jonah',`Jonah. His name is Jonah. Take this: the back door of the Ledger Room. Go, before I forget again.`],
    ['If threatened',`Please. I just follow the others. I don't want to. Sorry.`]]},
  {id:'sb-8f467299abbcb6a6', // The Tidewarden
   look:`A hooded figure stands in a narrow boat that does not rock. Water runs from the blade of its oar and never runs out. When it speaks, it sounds like water moving over stones.`,
   lines:[
    ['Greeting',`Every crossing has a price. Every price is a memory. Which will you carry less of?`],
    ['Asked about the price',`Not gold. Gold sinks. Give me something true, and I will row.`],
    ['Asked about the Mere',`The Mere keeps what it is given and gives back what it is asked for. Few know how to ask.`],
    ['If the players are stuck',`What you seek stands under the water like a finger pointing up. Follow the finger down.`],
    ['If lied to',`That is not a true memory. The water knows. Try again, or swim.`],
    ['Asked who he is',`The body on the sandbank was a ferryman once. So was I. Ask me which of us is rowing.`]]},
  {id:'sb-05a5ed45d00c57f5', // Hushman Tobias Quill (his quota line is in the session plan)
   look:`A pale man in gray gloves steps out of the fog with a satchel of forms under one arm. A smooth gray stone hangs at his throat, and his smile is very sharp and very polite.`,
   lines:[
    ['Greeting',`Good evening. Hushman Quill, Office of Tithes. This won't take long if everyone has their papers.`],
    ['Explaining the forms',`Form nine is a voluntary Tithe. Form ten is an involuntary one. I recommend nine. Everyone chooses nine, eventually.`],
    ['Asked about bell-work',`Any humming, ringing, chiming, tolling or resonance is to be reported. Have you heard anything hum?`],
    ['If offered a bribe',`How generous. I'll note you as cooperative. Cooperative people have so much less paperwork.`],
    ['If refused or threatened',`I see. I'll need your names, spelled correctly. The Court hates a misspelling.`],
    ['Asked about Master Venn',`Master Venn is a valued friend of the Landing House. His cargoes are always in order. I check them personally.`],
    ['If his sister is mentioned',`I don't have a sister. Why would you say that?`]]},
  {id:'sb-8067f4512864d0f5', // Wren Caddock
   look:`A plain, freckled woman sits by the fire with a lap full of mending, her needle flashing. She's smiling before you reach her, and already making room on the bench.`,
   lines:[
    ['Greeting',`Come in, come in, sit! You're new. Where from? How long are you staying? Sorry, I always ask too much.`],
    ['Fishing for names',`And who else are you working with? Just so I know who to look out for.`],
    ['Asked about her family',`My girl sews better than I do already. I'd do anything to keep her out of all this.`],
    ['If the players are stuck',`If you need the Ledger Room, talk to Ansel Quay. He's Maudrin's steward, but he's a friend. Tell him Wren sent you.`],
    ['If confronted',`Yes. I gave them names. I also told the Bellwrights when the raids were coming. Ask who's still alive, and why.`],
    ['If treated cruelly',`Fine. Do what you like. I've been waiting two years for someone to find out.`]]},
  {id:'sb-d95a9b2e9694d149', // Ansel Quay
   look:`A stooped little man in ink-stained cuffs peers at you over spectacles he clearly doesn't need, pushes them up his nose, and peers again. He holds a ledger to his chest like a shield.`,
   lines:[
    ['Greeting',`The Chancellor is not receiving. Appointments are made in writing. In triplicate.`],
    ['Asked about the Ledger Room (whispering)',`There is no... that is, the Ledger Room is closed to the public. Entirely. Mostly.`],
    ['If offered a bribe or safety',`If something were to happen to the Chancellor, a man would need somewhere to go. The coast, perhaps. Somewhere with no bells.`],
    ['If the players are stuck',`The Hushmen take the long road from the palace to the Tor. Every time. The Chancellor dislikes surprises.`],
    ['If Wren\'s name comes up',`Wren sent you? Then perhaps we can speak. Quietly. Very quietly.`],
    ['If threatened',`Please, I'm a clerk. I file things. I'm not worth the trouble.`]]},
  {id:'sb-b7f08ffa226e696a', // Bet Ostrow
   look:`A small, round old woman with flour to the elbows shapes loaves faster than you can follow. Between loaves her fingers tap out a little rhythm on the dough, the same rhythm every time.`,
   lines:[
    ['Greeting',`You look hungry. Everyone looks hungry. Here, take this. It's yesterday's, but it's good.`],
    ['When bread is broken',`Oh. There I go again. Don't mind me. I never know why I do that.`],
    ['Asked about the Last Ringing',`A bell? I never rang a bell. I'd remember a thing like that. Wouldn't I?`],
    ['If the players are stuck',`My hands know a tune. Watch. I don't know where it's from. My mother said it was a harvest song.`],
    ['If a bell sounds near her',`Sorry. Sorry. Did somebody... no. It's nothing.`],
    ['Goodbye',`Come back tomorrow. There's always more bread than people.`]]},
  {id:'sb-b0f92748217e1595', // The Librarian of the Sealed Book
   look:`On a lectern in the dark lies a book with blank pages. When you open it, the first page shows you your own face, a little older and a little sadder than the one you have. Then words begin to appear, as if someone just out of sight were writing them.`,
   lines:[
    ['Greeting (the words appear on the page)',`A reader. At last, a reader. Ask, and give, and I will be read.`],
    ['Its price',`One question for one true memory. Write it in me, and I will answer in your hand.`],
    ['Asked about Mirel\'s Heart',`It belongs to whoever reads it last. I have read it ten thousand times.`],
    ['If the players are stuck',`You came for what I keep. I would trade it for a dream you have never told anyone. Tell it to me, and no one else will ever read it.`],
    ['Asked what it is',`I was pages once. Tuning pages, in a careful hand. They could not bear to burn me, so they bound me.`],
    ['If attacked',`You would burn a book for not saying what you wanted. You are exactly like them.`]]},
  {id:'sb-ff1d8fd85ca3b0f1', // Yenna Garrow
   look:`A sun-darkened rider is brushing down a horse outside a tent with a red horse-skull over the door. A long bronze braid hangs down her back. She gives you a short nod and goes back to work.`,
   lines:[
    ['Greeting',`You're not clan. Did the Thane send you, or are you lost?`],
    ['Asked about her father',`My father dug the Old Works. Died there when I was small. People say the mine's haunted. People say a lot of things.`],
    ['If the players are stuck',`The Old Works? Go at night. Listen for a man swearing at you. Follow him.`],
    ['Asked about Kessa\'s war',`Every month the Thane wants more riders. Every month fewer come back. Somebody has to say it to him.`],
    ['If they carry a debt honestly',`You owe, and you say so. That's rare. I'll help you.`],
    ['If they bring word from Old Garrow',`He said that? He said sorry? Give me a moment.`]]},
  {id:'sb-c101d5ed83b87eeb', // Tristan Vesk
   look:`A soft-spoken man in gray stands at the edge of the room, never quite in the middle of it. He smiles when you look at him, and the smile stops just short of his eyes.`,
   lines:[
    ['Greeting',`You're the ones everyone is talking about. Forgive me. I like to meet people before they become important.`],
    ['Flattering them',`People like you shouldn't take orders. People like you should give them. I could arrange that.`],
    ['Asked about Maudrin',`My cousin is a great woman. Great women tire. When she does, someone must be ready.`],
    ['If the players are stuck',`Tell me what you need, and I'll tell you who has it. I always know who has it. The price is a small favour, later.`],
    ['Making a deal',`Let's put it in writing. Carefully. Every word in its place.`],
    ['When he breaks a deal',`Nothing personal. A better offer came along, and I'm a practical man.`]]},
  {id:'v6-npc-brannagh', // Pilot-Mistress Brannagh Wick
   look:`A short, weather-beaten woman of about sixty stands at the far end of the Pilots' Hall with a coil of sounding-line over one shoulder. She's counting under her breath, and she doesn't stop when you come in.`,
   lines:[
    ['Greeting',`...four, five, slack on six. Right. Who's asking, and what ship are they off?`],
    ['Asked about Tam Harrow',`Tam was the best pilot I had. Knew every drowned street under this harbour by its old name. Don't tell me he drowned on a flat-calm night, lad.`],
    ['Asked about piloting',`Every ship out of this Mere goes with one of mine, or she goes onto the rooftops. Nobody leaves without my say.`],
    ['If the players are stuck (and Ila trusts them)',`Tam took his boat out the night he died. No cargo, no ship to pilot. I told the Landing House nothing. He was headed for the old belfry, out where it's deep. Ask the girl if he ever said why.`],
    ['Asked about Venn\'s ship',`The Heron? Pretty hull. She sails when I say. I can find a reason to keep her a day, if you give me a reason.`],
    ['If they break their word',`You broke your word on my water. Don't ask me for a pilot again.`]]},
  {id:'v6-npc-sela', // Reckoner Sela Maunt (her line about the Heart is already on the page)
   look:`Behind a counter scored with fine notches, a tired woman in a gray apron peers through a jeweller's lens at a small sealed jar. Three tuning forks stick up from her breast pocket. She taps one on the counter, listens, and writes something down.`,
   lines:[
    ['Greeting',`Weighing or selling? Either way, set it on the counter and don't shake it.`],
    ['Explaining memory money',`A mote's a passing thing. A keep's a proper memory, sealed. A heartkeep's the kind you'd cry to lose: red wax, priced by appraisal, love.`],
    ['Asked about paying a Tithe in gold',`Some folk try to pay the Court in gold. The Court doesn't care for it. I don't know anything about it, and neither do you.`],
    ['Shown a forged keep',`Hear that? Rings flat. Somebody sealed a dream in there and called it a memory.`],
    ['If they show her the Heart',`Put that away. Now. Don't let anyone on the Tally see it, and especially not the man two stalls down.`],
    ['If the players are stuck',`Questions about the Old Shore, ask Brannagh at the Pilots' Hall. She knows every family on the water.`],
    ['If they are kind to her',`If you ever sold something you want back, come round the back. We don't talk about the back.`]]},
  {id:'v6-npc-venn', // Master Orsolo Venn
   look:`A man in plum velvet, absurd in this gray country, rises to greet you with both hands out. There's a ring on every finger, and he checks a silent brass pocket-clock before he has finished smiling.`,
   lines:[
    ['Greeting',`Friends! Welcome, welcome. You're fresh off a ship, I can tell. Let me be the first to help you spend your money.`],
    ['If he hears of the Heart',`A humming relic? Friend, I have a buyer who would weep. Name your price. Then double it, because I like you.`],
    ['Making his offer',`Six hundred gold, today, and no questions. The Heron sails in three days. After that, my offer sails too.`],
    ['If refused',`Of course, of course. Think it over. I'll write down that you said no. I write everything down.`],
    ['If it turns violent or public',`Friends, friends. Business is business. Let's not make it a scene.`],
    ['Asked about the Court',`The Court and I understand each other. The Landing House stamps what I ship. Officer Quill is a great friend of trade.`]]},
  {id:'v6-npc-aurelie', // Sister Aurelie Dawnmantle
   look:`A young woman in faded rose-and-gold vestments sweeps the step of a small mission house hung with painted sun-discs. She looks up at you with real, unguarded delight, as though visitors are the best thing that could happen to her today.`,
   lines:[
    ['Greeting',`Welcome to the Dawn Mission! Are you hurt? Hungry? Lost? We do all three.`],
    ['Asked about Hallowmere',`When the sun comes back to Hallowmere, I mean to be standing in the square to see it.`],
    ['Asked about her writ',`Four times I've asked the Court for a writ to Hallowmere. Four times, "not this season." I'm starting to think they mean every season.`],
    ['Asked to heal',`A small donation, or a true story about a sunrise. Honestly, I'd rather have the story.`],
    ['If they mention Vaer\'s bell',`A bell that brings back the dawn? Tell me everything. Tell me twice. I'm coming with you.`],
    ['If the players are stuck',`Nobody travels inland without a writ, unless the Court itself names you in one. If anyone from the Court ever writes to you, look closely at the seal.`]]},
  {id:'v6-npc-hadrik', // Brother Hadrik Voss
   look:`A man in gray robes sits cross-legged outside a canvas shrine, a censer smoking steadily beside him. A pendant shaped like a skeletal hand hangs at his chest. He is watching the Mere, not you.`,
   lines:[
    ['Greeting',`The dead of this water do not rest. Have you come to help me, or to argue?`],
    ['Asked about the Drowned Choir',`"Every soul is owed its judgment." These ones refuse theirs. I will give it to them.`],
    ['Asked about his plan',`On the night they sing, I bless the water. The singing stops, and they go where they belong.`],
    ['If argued with from his own faith',`The Doomguide does say the dead are owed remembrance. You're telling me that's what they're asking for.`],
    ['If asked about his brother',`My brother went into the sea and never came out. No grave. No judgment. Don't talk to me about the restless dead.`],
    ['If talked down',`Then I'll sit with them instead. Kelemvor can wait one night.`]]},
];
