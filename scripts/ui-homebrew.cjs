// Homebrew creatures: copy a library creature, rename and edit it, pin it, follow the session desk's pinned reference
// back to the editor, open the original, and remove the copy. Checks the layout at 1420 and 900 wide.
//   node_modules/electron/dist/electron.exe scripts/ui-homebrew.cjs [--out dir]
const fs = require('node:fs'),
  path = require('node:path'),
  assert = require('node:assert/strict');
const { openSession, run, sleep } = require('./ui-harness.cjs');
const { navigator } = require('./ui-nav.cjs');

run(async (args) => {
  const out = args.out ? path.resolve(args.out) : null;
  if (out) fs.mkdirSync(out, { recursive: true });
  const s = await openSession({ fixture: 'seventh-bell' });
  const wait = async (expr, what = expr, ms = 8000) => {
    for (let t = 0; t < ms; t += 100) {
      if (await s.run(expr)) return;
      await sleep(100);
    }
    throw new Error('Timed out waiting for ' + what);
  };
  const go = navigator(s.run, wait);
  const shot = async (name) => out && s.shot(path.join(out, name + '.png'));
  const campaign = () => s.state.snapshot.campaigns.find((c) => c.id === s.state.snapshot.active);
  const homebrew = () => campaign().memory.homebrew || [];
  const pinnedIds = () =>
    campaign().sessions.flatMap((x) => (x.ruleReferences || []).map((r) => r.id));
  const heading = "document.querySelector('.rule-detail h2')?.textContent";
  const noOverflow = async (where) =>
    assert(
      await s.run(
        "document.documentElement.scrollWidth<=document.documentElement.clientWidth+2&&[...document.querySelectorAll('.rule-detail,.rules-results,.homebrew-fields,.homebrew-editor .rule-actions')].every(e=>e.scrollWidth<=e.clientWidth+2)",
      ),
      'Horizontal overflow ' + where,
    );
  try {
    assert.equal(homebrew().length, 0, 'The fixture starts with no homebrew');
    await go('Rules library');
    await wait("document.querySelector('.rule-result')", 'the rules results');
    assert.equal(
      await s.setValue('.rules-library input[aria-label="Search rules"]', 'Goblin Warrior'),
      'ok',
    );
    await wait(
      "[...document.querySelectorAll('.rule-result')].some(b=>b.querySelector('strong')?.textContent==='Goblin Warrior')",
      'Goblin Warrior in the results',
    );
    assert.equal(
      await s.run(
        "(()=>{const b=[...document.querySelectorAll('.rule-result')].find(b=>b.querySelector('strong')?.textContent==='Goblin Warrior');b.click();return 'ok'})()",
      ),
      'ok',
    );
    await wait(heading + "==='Goblin Warrior'", 'the Goblin Warrior entry');

    // Copy it: the copy opens in the editor and heads the results under "Your homebrew".
    assert.equal(await s.clickText('Make a homebrew copy', { within: '.rule-detail' }), 'ok');
    await wait("document.querySelector('.homebrew-editor')", 'the homebrew editor');
    await s.settle(200);
    let hb = homebrew();
    assert.equal(hb.length, 1);
    assert.deepEqual([hb[0].name, hb[0].base], ['Goblin Warrior (homebrew)', 'Goblin Warrior']);
    assert.match(hb[0].id, /^hb-/);
    assert.ok(hb[0].from, 'The copy remembers its original');
    assert.equal(await s.run(heading), 'Goblin Warrior (homebrew)');
    assert.equal(
      await s.run(
        "[...document.querySelectorAll('.rules-group-label')].map(e=>e.textContent).join('|')",
      ),
      'Your homebrew|Library',
    );
    assert.ok(
      await s.run(
        "document.querySelector('.homebrew-result.selected')?.textContent.includes('Goblin Warrior (homebrew)')",
      ),
    );
    assert.ok(
      await s.run("document.body.innerText.includes('added to your homebrew')"),
      'The copy is announced',
    );

    // Edit it: name, CR and a new trait save as they are typed; a cleared name is never saved.
    const nameField = '.homebrew-fields label:nth-child(1) input',
      crField = '.homebrew-fields label:nth-child(2) input',
      bodyField = '.homebrew-body textarea';
    assert.equal(await s.setValue(nameField, ''), 'ok');
    await s.settle(150);
    assert.equal(homebrew()[0].name, 'Goblin Warrior (homebrew)', 'An empty name is not saved');
    assert.equal(await s.setValue(nameField, 'Reed Goblin Sneak'), 'ok');
    assert.equal(await s.setValue(crField, '1/2'), 'ok');
    const body =
      homebrew()[0].body + '\n\nTraits\nReed-step. The sneak moves through reeds without a sound.';
    assert.equal(await s.setValue(bodyField, body), 'ok');
    await s.settle(250);
    hb = homebrew();
    assert.deepEqual([hb[0].name, hb[0].cr, hb[0].body], ['Reed Goblin Sneak', '1/2', body]);
    await wait(heading + "==='Reed Goblin Sneak'", 'the renamed heading');
    assert.ok(
      await s.run("document.querySelector('.homebrew-preview').textContent.includes('Reed-step')"),
      'The preview shows the new trait',
    );

    // Pin it to the session.
    assert.equal(await s.clickText('Pin to session', { within: '.homebrew-editor' }), 'ok');
    await s.settle(250);
    assert.ok(pinnedIds().includes(hb[0].id), 'The homebrew creature is pinned');
    assert.ok(
      await s.run(
        "(()=>{const b=document.querySelector('.homebrew-editor .rule-actions .primary');return b.disabled&&b.textContent.includes('On this session’s desk')})()",
      ),
      'The pin button shows it is pinned',
    );
    await noOverflow('in the editor at 1420');
    await shot('homebrew-editor-1420');
    await s.resize(900, 900);
    await s.settle(300);
    await noOverflow('in the editor at 900');
    await shot('homebrew-editor-900');
    await s.resize(1420, 900);
    await s.settle(300);

    // The session desk's pinned reference leads back to the editor.
    await go('Session desk');
    assert.equal(await s.clickText('Combat', { within: '.tabs' }), 'ok');
    await wait(
      "[...document.querySelectorAll('h3')].some(h=>h.textContent==='Pinned creature references')",
      'the pinned references',
    );
    assert.ok(
      await s.run("document.body.innerText.includes('Reed Goblin Sneak · 2024')"),
      'The pinned snapshot carries the new name',
    );
    await shot('homebrew-combat-pinned');
    assert.equal(await s.clickText('Edit in the Rules library'), 'ok');
    await wait(
      heading + "==='Reed Goblin Sneak'&&!!document.querySelector('.homebrew-editor')",
      'the editor again',
    );

    // The original opens in the same pane; the copy is one click away.
    assert.equal(await s.clickText('Open the original', { within: '.homebrew-editor' }), 'ok');
    await wait(
      heading + "==='Goblin Warrior'&&!document.querySelector('.homebrew-editor')",
      'the original',
    );
    assert.equal(await s.clickSelector('.homebrew-result'), 'ok');
    await wait("!!document.querySelector('.homebrew-editor')", 'the copy again');

    // Removing asks first; Keep it leaves the copy, Remove copy takes it away.
    assert.equal(await s.clickText('Remove this homebrew copy'), 'ok');
    await s.settle(100);
    assert.ok(
      await s.run(
        "document.querySelector('.homebrew-editor .map-remove p')?.textContent.startsWith('Remove Reed Goblin Sneak?')",
      ),
    );
    await shot('homebrew-remove-confirm');
    assert.equal(await s.clickText('Keep it'), 'ok');
    await s.settle(100);
    assert.equal(homebrew().length, 1);
    assert.equal(await s.clickText('Remove this homebrew copy'), 'ok');
    await s.settle(100);
    assert.equal(await s.clickText('Remove copy'), 'ok');
    await s.settle(250);
    assert.equal(homebrew().length, 0);
    assert.ok(
      await s.run(
        "!document.querySelector('.homebrew-editor')&&!document.querySelector('.homebrew-result')&&document.body.innerText.includes('removed from your homebrew')",
      ),
    );

    // The pinned snapshot stays on the desk, now pointing at the library instead of an editor.
    await go('Session desk');
    assert.equal(await s.clickText('Combat', { within: '.tabs' }), 'ok');
    await wait(
      "document.body.innerText.includes('Reed Goblin Sneak · 2024')",
      'the pinned snapshot',
    );
    assert.ok(
      await s.run(
        "!document.body.innerText.includes('Edit in the Rules library')&&document.body.innerText.includes('Open full library entry')",
      ),
    );
    console.log(
      'Homebrew passed: copy, rename and edit with an empty name kept out, pin, back from the session desk, open the original, remove with a confirmation, no overflow at 1420 or 900.',
    );
  } finally {
    s.close();
  }
});
