// Builds the player handouts from handouts/*.body.html with one shared stylesheet and one "four handouts" box:
// node tools/build-handouts.cjs  →  outputs/Player-Primer/the-seventh-bell.html, the-ringing-land.html, and handouts/map.dc.html for the Design canvas.
// Every page goes through the revision 7 rename ("Tongue" → "Heart"), so a slip in a source can't reach the players.
const fs=require('fs'),path=require('path');
const P=require(path.join(__dirname,'../paths.cjs'));
const root=path.join(__dirname,'..'),dir=path.join(root,'handouts'),out=path.join(P.outputs,'Player-Primer');
const {rename}=require(path.join(root,'pack/terms.cjs'));
const css=fs.readFileSync(path.join(dir,'handout.css'),'utf8');
const set=[
 ['about','What’s It About?','https://claude.ai/artifact/R4LVdx2fPVsDNhFJ7oPpyw','Start here: the short pitch, session zero and your character.'],
 ['bell','The Seventh Bell','https://claude.ai/artifact/JmEQ5Q3C8FuZF6aUVnGTVK','How the campaign works: the bells, their Hearts, the Toll, magic and who’s who.'],
 ['land','The Ringing Land','https://claude.ai/artifact/Xc59dpxwaKKbxo5VhpcR2v','The world: Pellmoor Landing, the ships, and memory as money.'],
 ['map','The Map of Corvane','https://claude.ai/artifact/R4EEruQ9mDXuuTnaFSH2Gp','Where everything is, and how many days it takes to get there.']];
const setBox=here=>`<nav class="set" aria-label="The four handouts"><p class="label">The four handouts</p><ol>${set.map(([id,t,url,what])=>id===here?`<li class="here"><b>${t}</b> (this page). ${what}</li>`:`<li><a href="${url}">${t}</a>. ${what}</li>`).join('')}</ol></nav>`;
const footer='<footer>The Seventh Bell · a campaign of Corvane · player handout, no spoilers</footer>';
const page=(title,body,here)=>rename(`<title>${title}</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n<style>\n${css}</style>\n\n<main>\n${body.replace('<!--SET-->',setBox(here)).trim()}\n ${footer}\n</main>\n`);
const read=f=>fs.readFileSync(path.join(dir,f),'utf8');
fs.writeFileSync(path.join(out,'the-seventh-bell.html'),page('The Seventh Bell',read('seventh-bell.body.html'),'bell'));
fs.writeFileSync(path.join(out,'the-ringing-land.html'),page('The Ringing Land',read('ringing-land.body.html'),'land'));
// The map is a Design canvas artboard: a fluid page with the same stylesheet inside <helmet>.
const map=rename(`<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<title>The Map of Corvane</title>\n<script src="./support.js"></script>\n</head>\n<body>\n<x-dc>\n<helmet>\n<style>\n${css.replace(/@media \(prefers-color-scheme:dark\)\{[^\n]*\n/,'').replace(/:root\[data-theme="dark"\][^\n]*\n/,'')}a:hover{color:#4d3112}\n</style>\n</helmet>\n<main>\n${read('map.body.html').replace('MAPSRC','/_blob/27a95131c206804e4db855c0ad2c4220').replace('<!--SET-->',setBox('map')).trim()}\n ${footer}\n</main>\n</x-dc>\n<script type="text/x-dc" data-dc-script data-props='{"$preview":{"width":1280,"height":3720}}'>\nclass Component extends DCLogic {\nrenderVals() {\nreturn {};\n}\n}\n</script>\n</body>\n</html>\n`);
fs.writeFileSync(path.join(dir,'map.dc.html'),map);
// A plain-page copy of the map for local review (capture-page.cjs); the canvas itself needs the Design runtime.
fs.writeFileSync(path.join(dir,'map-preview.html'),page('The Map of Corvane',read('map.body.html').replace('MAPSRC','corvane-map.webp'),'map'));
console.log('handouts built');
// The player site's fixed pages for the update pack (Waypoint writes site.html from them): the same bodies, with in-site links,
// ids prefixed per page so anchors never collide, and the map image carried as data.
const siteSet=here=>`<nav class="set" aria-label="The four handouts"><p class="label">The four handouts</p><ol>${set.map(([id,t,,what])=>{const sid={about:'start-here',bell:'the-seventh-bell',land:'the-ringing-land',map:'map'}[id];return id===here?`<li class="here"><b>${t}</b> (this page). ${what}</li>`:`<li><a href="#${sid}">${t}</a>. ${what}</li>`}).join('')}</ol></nav>`;
const sitePage=(id,title,summary,file,here)=>({id,title,summary,body:rename(read(file).replace('<!--SET-->',siteSet(here)).replace('MAPSRC','IMG:corvane-map').replace(/ id="([a-z0-9-]+)"/g,` id="${id}-$1"`).replace(/ href="#([a-z0-9-]+)"/g,(m,a)=>['start-here','the-seventh-bell','the-ringing-land','map','wiki','home'].includes(a)?m:` href="#${id}-${a}"`).trim())});
const glossary=JSON.parse(fs.readFileSync(path.join(dir,'glossary.json'),'utf8')).terms;
const site={title:'The Seventh Bell',css,glossary,pages:[
 sitePage('start-here','What’s It About?','Start here: the short pitch, session zero and your character.','start-here.body.html','about'),
 sitePage('the-seventh-bell','The Seventh Bell','How the campaign works: the bells, their Hearts, the Toll, magic and who’s who.','seventh-bell.body.html','bell'),
 sitePage('the-ringing-land','The Ringing Land','The world: Pellmoor Landing, the ships, and memory as money.','ringing-land.body.html','land'),
 sitePage('map','The Map of Corvane','Where everything is, and how many days it takes to get there.','map.body.html','map')],
 images:[{name:'corvane-map',dataUrl:'data:image/webp;base64,'+fs.readFileSync(path.join(dir,'corvane-map.webp')).toString('base64')}]};
fs.writeFileSync(path.join(dir,'site.json'),JSON.stringify(site));
console.log('site pages built',(JSON.stringify(site).length/1024).toFixed(0)+' KB');
