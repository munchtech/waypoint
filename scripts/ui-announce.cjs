// Screen-reader announcements: dice rolls, table markers, notices and saves each reach a persistent live region.
//   node_modules/electron/dist/electron.exe scripts/ui-announce.cjs
const assert = require('node:assert/strict');
const { openSession, doStep, run, sleep } = require('./ui-harness.cjs');
run(async () => {
  const s = await openSession({ fixture: 'demo' });
  const live = (selector) =>
    s.run(
      `[...document.querySelectorAll(${JSON.stringify(selector + '[role=status][aria-live=polite]')})].map(e=>e.textContent.trim()).filter(Boolean).join(' | ')`,
    );
  // Dice: the roll is announced from a region that exists before the first roll; a typed roll is announced with its
  // dice, a bad one is explained, and the rolls are still there when the tray opens again.
  assert.equal(await doStep(s, ['click', 'Dice']), 'ok');
  await sleep(500);
  assert.equal(
    await s.run("document.querySelectorAll('.dice-tools .sr-only[role=status]').length"),
    1,
    'Dice region must exist before the first roll',
  );
  const rollButton = '.dice-tools > .button.primary';
  assert.equal(await s.clickSelector(rollButton), 'ok');
  await sleep(200);
  const roll = await live('.dice-tools .sr-only');
  assert.match(roll, /^Rolled 1d20: \d+$/, 'Roll announcement');
  const first = await s.run("document.querySelector('.dice-tools .sr-only').textContent");
  assert.equal(await s.clickSelector(rollButton), 'ok');
  await sleep(200);
  assert.notEqual(
    await s.run("document.querySelector('.dice-tools .sr-only').textContent"),
    first,
    'Second roll announced',
  );
  assert.equal(await s.setValue('.dice-typed input', '2d6+3'), 'ok');
  assert.equal(await s.clickText('Roll it', { within: '.dice-tools' }), 'ok');
  await sleep(200);
  const typed = (await live('.dice-tools .sr-only')).match(
    /^Rolled 2d6\+3: (\d+), dice (\d) and (\d)$/,
  );
  assert.ok(typed, 'Typed roll announcement');
  assert.equal(Number(typed[1]), Number(typed[2]) + Number(typed[3]) + 3, 'Typed roll total');
  assert.equal(await s.setValue('.dice-typed input', 'fireball'), 'ok');
  assert.equal(await s.clickText('Roll it', { within: '.dice-tools' }), 'ok');
  await sleep(150);
  assert.ok(
    await s.run(
      "document.querySelector('.dice-problem')?.textContent.startsWith('Type a roll like')&&document.querySelector('.dice-typed input').getAttribute('aria-invalid')==='true'",
    ),
    'A bad typed roll is explained',
  );
  await s.key('Escape');
  await sleep(300);
  assert.equal(await doStep(s, ['click', 'Dice']), 'ok');
  await sleep(400);
  assert.equal(
    await s.run(
      "document.querySelector('.roll-result span').firstChild.textContent+'|'+document.querySelectorAll('.roll-history span').length",
    ),
    '2d6+3|2',
    'Rolls are kept while Waypoint is open',
  );
  await s.key('Escape');
  await sleep(300);
  // Table markers announce what was saved and removed.
  await doStep(s, ['click', 'Table log']);
  await sleep(300);
  await doStep(s, ['click', 'Promise']);
  await sleep(200);
  assert.match(await live('.table-markers .sr-only'), /^Promise marker saved$/);
  await doStep(s, ['click', 'Ruling']);
  await sleep(200);
  assert.match(await live('.table-markers .sr-only'), /^Ruling marker saved$/);
  await s.run("document.querySelector('.marker-list button[aria-label^=Remove]').click()");
  await sleep(200);
  assert.match(await live('.table-markers .sr-only'), /marker removed$/);
  // A notice reaches the page-level region, and the visible toast stays out of the accessibility tree.
  await doStep(s, ['click', 'Edit session plan']);
  await sleep(400);
  await s.setValue('.session-editor input', 'A renamed session');
  await sleep(150);
  await doStep(s, ['click', 'Save session plan']);
  await sleep(500);
  const notice = await s.run("document.querySelector('.app>.sr-only[role=status]').textContent");
  assert(/Session notes saved/.test(notice), 'Notice announcement: ' + notice);
  assert.equal(
    await s.run("document.querySelector('.toast')?.getAttribute('aria-hidden')"),
    'true',
  );
  // Saving is announced once the writes have settled.
  await sleep(2000);
  const saved = await s.run(
    "[...document.querySelectorAll('.app>.sr-only[role=status]')].map(e=>e.textContent).join('|')",
  );
  assert(/All changes saved/.test(saved), 'Save announcement: ' + saved);
  console.log(
    'Announcements passed: dice rolls (clicked and typed, kept between openings), marker saved and removed, notices, and settled saves reach live regions; the toast is hidden from assistive tech.',
  );
  s.close();
});
