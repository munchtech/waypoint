# Waypoint

A desktop companion for running a D&D campaign. Waypoint is an Electron app for Windows. Campaigns, rules, recordings and settings are stored on this computer.

## What it does

- **Session**: the session desk (session notes and guide, prepared plays, combat reference, table card), the Foresight playbook (plays, world state, forecast, endings) and Live mode for running the game.
- **Campaign**: the campaign reader, the world wiki editor, the outline and sessions, the party roster and table preferences.
- **Journal**: session notes and recordings with local transcription, discoveries to review, and the confirmed chronicle.
- **Library**: saved ideas and the rules library (an SRD 5.1 and 5.2 subset, plus JSON import).
- **Players**: handouts, the player site (one `site.html` the DM uploads) and a separate player display window.
- **Claude (optional)**: drafts paths, cards and recaps through the Anthropic API, using the DM's own API key. Campaign context is sent to Anthropic only when a generate button is pressed, and nothing generated becomes canon until the DM confirms it. See [Claude](#claude) below.
- **Restore points**: kept automatically on open, before update packs, and during editing.
- **Light and dark themes**: dark by default; Theme in the sidebar switches to light and back.
- **Now**: on Possibilities, pick the scene the table is in and only its paths stay open; the arrows step to the next scene. All sessions lists each session's paths in its own group, drawn when opened.

The Seventh Bell campaign ships with the app as an update pack (`desktop/data/packs/seventh-bell-v7.json`), built from the sources in `campaign/`. The app reads packs as files when Foresight opens: a new revision saved in the packs folder (Foresight → Open packs folder, which is `%APPDATA%\Waypoint\packs`) replaces the shipped pack with the same id, with no rebuild.

## Repository layout

| Path | What it holds |
|---|---|
| `app/page.tsx`, `app/globals.css` | The UI shell and the single stylesheet. |
| `components/` | Views and dialogs. |
| `lib/` | Domain logic: the campaign schema, playbook, wiki memory, update packs, rules, search. |
| `desktop/` | The Electron main process (`main.ts`), the SQLite stores, the Claude engine (`cloud-engine.ts`), recordings, the renderer entry and `electron-builder.json`. |
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

## Claude

Generation uses the official Anthropic SDK from the main process (`desktop/cloud-engine.ts`).

- **Key**: pasted once under AI & backups. It is encrypted with Electron `safeStorage` (Windows DPAPI, tied to the Windows account) and kept in `ai-key.bin`. The renderer never receives it back; it only learns whether a key is saved.
- **Billing**: Anthropic bills the key per request. This is separate from any Claude subscription.
- **Models**: Claude Opus 5.5 (default), Claude Sonnet 5.5 or Claude Haiku 5.5, chosen in the same dialog.
- **Request**: the task instructions go in a cached system block, the campaign context in the user turn, and the reply is constrained to a JSON schema and validated again before anything is saved. Opus and Sonnet requests opt in to Anthropic's server-side fallback, so a request the model declines is retried on the recommended fallback model.
- **Checks**: `node scripts/test-cloud-engine.mjs` needs no key or network. Add `--live` with `ANTHROPIC_API_KEY` set in the environment to send one real request, which costs a few cents.

## Packaging

```
node scripts/build-desktop.mjs
node node_modules/electron-builder/cli.js --config desktop/electron-builder.json --publish never
```

This writes the installer `Waypoint-Setup-<version>.exe`, its `.blockmap` and `latest.yml` to `../waypoint-packaged`. The installer needs no administrator rights: it installs Waypoint for the current Windows account in `%LOCALAPPDATA%\Programs\Waypoint` and adds Start menu and desktop shortcuts. Uninstalling keeps `%APPDATA%\Waypoint`. Add `--win portable` to build the portable `Waypoint.exe` instead, which never updates itself.

Session transcription needs the `Waypoint-Speech` folder, which is too large to ship in the app. The installed app looks for it at `%LOCALAPPDATA%\Waypoint\Waypoint-Speech` (an update replaces the install folder, so it must not go there); the portable exe looks beside itself.

## Updates

The installed app checks the latest release of `munchtech/waypoint` on GitHub when it opens and every six hours, and downloads a newer one in the background. The update installs when Waypoint closes, or straight away from **Restart to update** in the sidebar. AI & backups → Updates shows the running version and the status. The repository is public, so no token is involved.

To release a version: raise `version` in `package.json`, build the installer as above, then create a GitHub release tagged `v<version>` and attach the three files from `../waypoint-packaged`. The installer is not code-signed, so Windows SmartScreen warns on the first install; updates are checked against the SHA-512 in `latest.yml`.

## Version

The app version lives in `package.json` only. `scripts/build-desktop.mjs` writes it into the packaged app's manifest.

## Data

Everything is stored in `%APPDATA%\Waypoint`:

| File | Contents |
|---|---|
| `waypoint.sqlite` | Campaigns (one row per campaign, session, event, card, wiki page and note, with a search index), the previous save and restore points. |
| `waypoint-before-v2.sqlite` | The campaign save as it was before the upgrade to row storage, kept once. |
| `packs/` | Update packs you add. A pack here replaces the shipped pack with the same id. |
| `rules.sqlite` | The rules library, including imported collections. |
| `recordings/` | Session audio and transcripts. |
| `ai.json`, `ai-key.bin` | The chosen Claude model, and the encrypted Anthropic API key. |
| `appearance.json` | The chosen theme, dark (the default) or light. |
| `site.json` | The player site's location. |

## Licences

The bundled rules data is an SRD subset under CC BY 4.0. See `desktop/data/SRD-NOTICE.txt`. Waypoint is not endorsed by Wizards of the Coast.
