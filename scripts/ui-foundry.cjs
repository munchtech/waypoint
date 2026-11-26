// The Foundry VTT export in the Campaign hub: the summary follows the parts chosen, saving sends only those parts, and the macro is there to copy.
//   node_modules/electron/dist/electron.exe scripts/ui-foundry.cjs
const assert = require('node:assert/strict');
const { openSession, doStep, run, sleep } = require('./ui-harness.cjs');
run(async () => {
  const s = await openSession({ fixture: 'seventh-bell' });
  for (let i = 0; i < 50 && !s.state.snapshot?.campaigns?.length; i++) await sleep(100);
  assert.equal(await doStep(s, ['nav', 'Campaign hub']), 'ok');
  for (let i = 0; i < 50 && !(await s.run("!!document.querySelector('.foundry-panel')")); i++)
    await sleep(100);
  const panel = (js) => s.run(`(()=>{const p=document.querySelector('.foundry-panel');${js}})()`);
  const summary = () => panel("return p.querySelector('.book-actions .muted').textContent");
  const count = (text) => Number(/^(\d+) journal entr/.exec(text)?.[1] || 0);
  const toggle = async (labels) => {
    for (const label of labels)
      await panel(
        `const l=[...p.querySelectorAll('fieldset label')].find(l=>l.textContent.trim()===${JSON.stringify(label)});l.querySelector('input').click()`,
      );
    await sleep(100);
  };
  assert.equal(
    await panel("return p.querySelector('h3').textContent.trim()"),
    'Foundry VTT export',
  );
  const all = await summary();
  assert(count(all) > 100, 'The whole campaign is counted: ' + all);
  await toggle(['Wiki pages']);
  const less = await summary();
  assert(count(less) > 0 && count(less) < count(all), 'Without the wiki, fewer entries: ' + less);
  await toggle(['Handouts', 'Session plans', 'Roll tables', 'Stat blocks']);
  assert.equal(await summary(), 'Nothing to export with these choices.');
  assert.equal(await panel("return p.querySelector('.button.primary').disabled"), true);
  await toggle(['Wiki pages']);
  assert.equal(await s.clickText('Save for Foundry', { within: '.foundry-panel' }), 'ok');
  for (let i = 0; i < 50 && !s.state.foundry; i++) await sleep(100);
  const sent = s.state.foundry;
  assert.equal(sent.bundle.format, 'waypoint-foundry');
  assert.match(sent.fileName, /^[\w.-]+\.foundry\.json$/);
  assert.equal(
    sent.bundle.journal.length,
    count(all) - count(less),
    'Only the wiki pages are sent',
  );
  assert.equal(sent.bundle.tables.length + sent.bundle.actors.length, 0);
  await sleep(200);
  assert.equal(
    await panel("return p.querySelector('.book-message[role=status]')?.textContent||''"),
    'Saved to C:/Waypoint/' + sent.fileName,
  );
  assert.equal(await s.clickText('Show the import macro', { within: '.foundry-panel' }), 'ok');
  await sleep(100);
  const macro = await panel(
    "const t=p.querySelector('textarea[aria-label=\"Import macro\"]');return t&&t.offsetParent!==null?t.value:''",
  );
  assert(
    macro.startsWith('// Waypoint import for Foundry VTT.'),
    'The macro shows: ' + macro.slice(0, 60),
  );
  console.log(
    'Foundry export UI passed: the summary follows the parts chosen, nothing chosen disables saving, saving sends only the chosen parts and reports where, and the macro shows.',
  );
  s.close();
});
