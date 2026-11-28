// Where each view lives in the five workspaces: [sidebar area, section tab]. Shared by the UI harness and the standalone UI suites,
// so a renamed tab is fixed here once.
const destinations = {
  'Session desk': ['Session', 'Run'],
  Foresight: ['Session', 'Prep'],
  'Next session': ['Session', 'Next'],
  'Campaign hub': ['Campaign', 'Read & explore'],
  'World wiki': ['Campaign', 'Wiki editor'],
  Maps: ['Campaign', 'Maps'],
  Campaign: ['Campaign', 'Outline & sessions'],
  'Party & preferences': ['Campaign', 'Party & preferences'],
  'Session journal': ['Journal', 'Notes & recordings'],
  Discoveries: ['Journal', 'Review discoveries'],
  Chronicle: ['Journal', 'Campaign history'],
  'Rules library': ['Library', 'Rules'],
  'Saved material': ['Library', 'Saved ideas'],
  'Player site': ['Players', 'Player site'],
  'Player handouts': ['Players', 'Handouts & display'],
};
// Builds go(view) from a suite's own run and wait helpers: opens the area in the sidebar, then its section tab, and waits for the breadcrumb.
function navigator(run, wait) {
  // The Session area's guide steps carry their name in <strong> beside a status line.
  const tabs = "[...document.querySelectorAll('.workspace-tabs button, .session-guide button')]",
    named = (label) =>
      `b=>(b.querySelector('strong')?.textContent||b.textContent.replace(/\\d+$/,''))===${JSON.stringify(label)}`;
  return async (view) => {
    const route = destinations[view];
    if (!route) throw Error('No route to ' + view);
    await run(
      `[...document.querySelectorAll('.sidebar nav .navitem')].find(b=>b.querySelector('span')?.textContent===${JSON.stringify(route[0])}).click()`,
    );
    await wait(`${tabs}.some(${named(route[1])})`);
    await run(`${tabs}.find(${named(route[1])}).click()`);
    await wait(
      `document.querySelector('.breadcrumb span:last-of-type')?.textContent===${JSON.stringify(route[1])}`,
    );
  };
}
module.exports = { destinations, navigator };
