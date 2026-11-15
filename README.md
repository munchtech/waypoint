# Waypoint

A local desktop companion for running a D&D campaign. Waypoint is an Electron app for Windows. Campaigns, rules, recordings and settings stay on this computer.

## What it does

- **Session**: the session desk (session notes and guide, prepared plays, combat reference, table card), the Foresight playbook (plays, world state, forecast, endings) and Live mode for running the game.
- **Campaign**: the campaign reader, the world wiki editor, the outline and sessions, the party roster and table preferences.
- **Journal**: session notes and recordings with local transcription, discoveries to review, and the confirmed chronicle.
- **Library**: saved ideas and the rules library (an SRD 5.1 and 5.2 subset, plus JSON import).
- **Players**: handouts, the player site (one `site.html` the DM uploads) and a separate player display window.
- **Local AI (optional)**: drafts paths, cards and recaps through ComfyUI, Ollama or LM Studio on this machine. Only loopback addresses are accepted, and nothing generated becomes canon until the DM confirms it.
- **Restore points**: kept automatically on open, before update packs, and during editing.

The Seventh Bell campaign ships with the app as an update pack (`lib/packs/seventh-bell-v7.json`), built from the sources in `campaign/`.

## Repository layout

| Path | What it holds |
|---|---|
| `app/page.tsx`, `app/globals.css` | The UI shell and the single stylesheet. |
| `components/` | Views and dialogs. `components/ui/` is scaffold from the original starter and is mostly unused. |
| `lib/` | Domain logic: the campaign schema, playbook, wiki memory, update packs, rules, search. |
| `desktop/` | The Electron main process (`main.ts`), the SQLite stores, the local AI engine, recordings, the renderer entry and `electron-builder.json`. |
| `campaign/` | The Seventh Bell sources and build tools. See `campaign/README.md`. |
| `scripts/` | The build, the check runner, the test suites and their fixtures. |
| `docs/visual-design.md` | Palette, stylesheet rules and the visual check tools. |

## Build and run

Requires Node 22.13 or newer.

```
npm install
node scripts/build-desktop.mjs
node_modules/electron/dist/electron.exe desktop/build --preview-test
```

`--preview-test` uses a throwaway data folder. Without it the development build opens the real campaign data in `%APPDATA%\Waypoint`.

## Checks

```
node scripts/verify.mjs
```

Runs TypeScript, ESLint, the build, the unit suites and the Electron UI suites, and prints one pass or fail line per step. `--quick` skips the Electron steps, `--skip-build` reuses the last build, `--only name,name` filters steps, and `--tour` adds the screenshot tour. Logs go to a temp folder, or to `--logs <dir>`.

The suites read their campaign fixtures from `scripts/fixtures/`, so they run from a fresh clone. The Electron suites use isolated data folders and never touch `%APPDATA%\Waypoint`.

## Packaging

```
node scripts/build-desktop.mjs
node node_modules/electron-builder/cli.js --config desktop/electron-builder.json
```

This produces a portable `Waypoint.exe` in `../waypoint-packaged`. Session transcription expects a `Waypoint-Speech` folder beside the executable.

## Version

The app version lives in `package.json` only. `scripts/build-desktop.mjs` writes it into the packaged app's manifest.

## Data

Everything is stored in `%APPDATA%\Waypoint`:

| File | Contents |
|---|---|
| `waypoint.sqlite` | Campaigns, the previous save and restore points. |
| `rules.sqlite` | The rules library, including imported collections. |
| `recordings/` | Session audio and transcripts. |
| `local-ai.json`, `site.json` | Local AI settings and the player site's location. |

## Legacy web scaffold

Waypoint began as a web app. The Next, Vinext and Cloudflare pieces (`app/api/`, `db/`, `drizzle/`, `examples/`, the Wrangler config, and the `dev`, `build` and `start` npm scripts) are left over from that version and are not part of the desktop build. The desktop app does not read `.env.local`.

## Licences

The bundled rules data is an SRD subset under CC BY 4.0. See `desktop/data/SRD-NOTICE.txt`. Waypoint is not endorsed by Wizards of the Coast.
