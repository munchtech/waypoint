# The Seventh Bell: campaign sources

Everything that builds the campaign content Waypoint ships: the Foresight playbook, the campaign book, the DM canon and the player handouts.

| Folder | What it holds |
|---|---|
| `pack/` | Playbook sources: plays per act, anytime plays, world-state flags, endings, stat blocks, wiki lore edits, the player wiki, and the Tongue → Heart rename list. `AUTHORING.md` explains the format. |
| `handouts/` | Player handout sources, the shared stylesheet, and the painted map. |
| `tools/` | The build scripts. |
| `ref/` | Session ids and the 2024 Monster Manual base stat blocks the playbook builds on. |
| `canon.md` | The DM canon (revision 7). Wins over the book where they disagree. |
| `paths.cjs` | Where the tools read and write outside the repo. |

## Building

Run from this folder, in order:

```
node tools/validate-pack.cjs pack/act1.json pack/act2-3.json pack/act4a.json pack/act4b.json pack/act5.json pack/anytime.json pack/anytime-early.json
node tools/build-handouts.cjs
node tools/build-pack.cjs
node tools/build-manuscript.cjs
```

- `build-handouts` writes the two HTML handouts to `outputs/Player-Primer`, the map canvas page, and the player site's pages.
- `build-pack` writes the update pack the app bundles (`lib/packs/seventh-bell-v7.json`) and a copy in `outputs`. It checks every edit anchor against a copy of the live campaign, which stays outside the repo.
- `build-manuscript` writes the campaign book to `outputs` (Part 13 is generated from the pack).

Then build the app from the repo root (`node scripts/build-desktop.mjs`) and run `node scripts/verify.mjs`.

Sources keep the word "Tongue"; `pack/terms.cjs` renames it to "Heart" in everything the tools write.
