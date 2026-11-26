// Where the campaign tools read and write. The repo holds the sources; the built pack and handouts go to the outputs folder,
// and the copy of the live campaign used to check edit anchors stays outside the repo (it is private data, never committed).
const path = require('path');
const repo = path.join(__dirname, '..'),
  make = path.join(repo, '../..');
module.exports = {
  app: repo,
  packs: path.join(repo, 'desktop/data/packs'),
  outputs: path.join(make, 'outputs'),
  // The DM's live campaign with revision 7.2 installed (2026-11-01): anchors are checked against what the DM actually has.
  snapshot: path.join(make, 'work/foresight/db/live-20261101-0055/snapshot.json'),
  // The untouched v5 campaign: the imported paths a fresh install retires are read from it.
  baseline: path.join(make, 'work/foresight/db/current-snapshot.json'),
};
