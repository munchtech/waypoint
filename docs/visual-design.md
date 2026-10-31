# Waypoint 1.18 visual design

Midnight navigation (#172a3b), ivory reading surfaces (#fffdf8), teal actions (#235c62), and restrained brass orientation (#826031). This palette is a creative choice for the app, not a universal claim about color preference.

Research applied:
- Material Design color roles: distinguish surfaces, actions and foreground colors. https://m3.material.io/styles/color/the-color-system
- Nielsen Norman Group: consistent type, restrained palettes, hierarchy and grid alignment. https://www.nngroup.com/articles/why-does-design-look-good/
- W3C ordinary-text contrast threshold of 4.5:1. https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html

Measured selected pairs: body 12.74:1; secondary text 5.56:1; primary button 7.43:1; selected navigation 10.89:1; navigation 10.00:1; eyebrow 4.94:1; hero supporting text 5.19:1. These selected checks do not establish full WCAG conformance.

Implemented in app/globals.css, the single stylesheet (the earlier folio, finish, rules and observatory passes were merged into it in 1.32): semantic colors, narrative heading hierarchy, consistent controls, visible focus rings, reduced-motion support, and a full-width wiki grid until an editor opens. Cards and lists show plain-text previews (lib/plain-text.ts) with Markdown markers removed, without changing source content.

Verified: TypeScript; desktop interaction regression including 900/1420 widths; isolated Seventh Bell navigation and screenshots; selected navigation computed styles; packaged smoke including PDF extraction. Existing campaign data unchanged.

## Stylesheet and checks

- One stylesheet: app/globals.css. Rules stay in order only where two rules of equal specificity set the same property; edit an existing declaration in place instead of appending an override block. Tailwind supplies only its reset and theme tokens (utility generation is off).
- Visual tools (run with node_modules/electron/dist/electron.exe after node scripts/build-desktop.mjs): scripts/ui-tour.cjs (screenshots of every screen and dialog, optional pixel comparison), scripts/ui-audit.cjs (contrast, names, labels, overflow), scripts/ui-styles.cjs (computed-style comparison between two builds, with forced hover, focus and active states), scripts/ui-focus.cjs (dialog and Live mode keyboard paths), scripts/ui-announce.cjs (live-region announcements) and scripts/ui-player.cjs (the player window).
- scripts/verify.mjs runs every check above plus tsc, lint, the build, the unit suites, the Electron suites and the restore-points UI test, then prints one pass/fail line per step (--quick skips Electron, --tour adds screenshots, --only filters by name). About 4 minutes; logs go to a temp folder.
