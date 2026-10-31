# Waypoint

A private DM companion built with React, Vinext, and the OpenAI Responses API.

## Included workflows
- Multiple campaigns and flexible campaign outlines.
- Session notes imported from TXT/Markdown or pasted directly.
- Four AI-generated possible player paths, with dialogue, responses, consequences, and fallback clues.
- Context-aware NPCs, encounters, locations, clues, loot, and twists.
- Confirmed-event chronicle with editable enjoyment feedback.
- Reviewed recap extraction; drafts are never automatically made canon.
- Next-session generation using the recorded history and explicit table preferences.
- Dice tray and temporary initiative tracker.
- Browser-local persistence with JSON export/import.

## Local development
Run `npm run dev`. The ignored `.env.local` contains OPENAI_API_KEY. Never commit or expose it. Production uses the Sites secret of the same name. Active OpenAI API billing is required; a ChatGPT subscription alone does not enable API billing.

## Checks
- `node node_modules/typescript/bin/tsc --noEmit`
- `node scripts/test-app.mjs`
- `node scripts/test-routes.mjs`
- `node scripts/test-app.mjs --api` (requires the local server and active API billing)
- `npm run build`

The route contract tests use isolated response fixtures. No browser campaign data is changed. Live generation currently uses gpt-4.1-mini with structured outputs and `store:false`.

## Storage and scope
Data stays in this browser/device. Export backups before clearing site data or switching devices. Suggestions and generated cards remain drafts; only DM-confirmed events are passed as canon. Adaptation uses recorded context and preferences, not model training. Initiative and dice history reset when their dialog closes.

## Verification at delivery
TypeScript, production build, domain checks, and isolated route checks passed. Desktop and mobile layouts were visually checked. A real request reached OpenAI but returned `billing_not_active`; generated content quality cannot be verified until account billing is activated.
