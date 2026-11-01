// Where the campaign tools read and write. The repo holds the sources; the built book, pack and handouts go to the outputs folder,
// and the copy of the live campaign used to check edit anchors stays outside the repo (it is private data, never committed).
const path=require('path');
const repo=path.join(__dirname,'..'),make=path.join(repo,'../..');
module.exports={
 app:repo,
 packs:path.join(repo,'lib/packs'),
 outputs:path.join(make,'outputs'),
 // The DM's live campaign with revision 7 installed (2026-10-31): anchors are checked against what the DM actually has.
 snapshot:path.join(make,'work/foresight/db/live-20261031-2334/snapshot.json'),
 // The untouched v5 campaign: the imported paths a fresh install retires are read from it.
 baseline:path.join(make,'work/foresight/db/current-snapshot.json'),
 v5book:'C:/Users/munch/Documents/Codex/2026-10-22/au/outputs/the-seventh-bell-v5.md'};
