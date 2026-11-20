// Foresight walk-through on an isolated copy of a campaign: offer → review → install → brief → plays → state → forecast → ledger → live lookup → ripple.
//   node_modules/electron/dist/electron.exe scripts/ui-foresight.cjs --fixture <campaign backup.json> --out <dir> [--width 1420 --height 940]
const fs = require('node:fs'),
  path = require('node:path');
const { openSession, run, doStep } = require('./ui-harness.cjs');
run(async (args) => {
  const out = path.resolve(args.out || 'ui-foresight'),
    width = Number(args.width || 1420),
    height = Number(args.height || 940);
  fs.mkdirSync(out, { recursive: true });
  const s = await openSession({ width, height, fixture: args.fixture || 'seventh-bell' });
  const fails = [];
  const check = (name, ok, detail = '') => {
    console.log((ok ? 'ok  ' : 'FAIL') + ' ' + name + (detail ? ' · ' + detail : ''));
    if (!ok) fails.push(name);
  };
  const text = (sel) =>
    s.run(
      `(()=>{const e=document.querySelector(${JSON.stringify(sel)});return e?e.innerText:''})()`,
    );
  const shot = async (n) => s.shot(path.join(out, n + '.png'));
  // Start from Session 1, whatever session the fixture last had open.
  const sessionSelect = 'select[aria-label="Current session"]',
    nav = async (view) => {
      const result = await doStep(s, ['nav', view]);
      await s.settle(500);
      return result;
    };
  const first = await s.run(
    `document.querySelector(${JSON.stringify(sessionSelect)})?.options[0]?.value||''`,
  );
  if (first) {
    await s.setValue(sessionSelect, first);
    await s.settle(300);
  }
  check('the playbook opens from the Session workspace', (await nav('Foresight')) === 'ok');
  await s.settle(400);
  check('the bundled update is offered', (await text('.update-offer')).includes('revision 7'));
  await shot('01-offer');
  check('review opens', (await s.clickText('Review the update')) === 'ok');
  await s.settle(500);
  const review = await text('.update-review');
  check(
    'review lists the playbook and wiki changes',
    /Install the playbook/.test(review) && /World wiki/.test(review),
  );
  check('no conflicts on this campaign', !/Skipped: your text has changed/.test(review));
  await shot('02-review');
  const installLabel = await s.run(
    `[...document.querySelectorAll('.update-review button')].map(b=>b.textContent).find(t=>/^Install/.test(t))||''`,
  );
  check(
    'install button counts the changes',
    /Install \d+ changes/.test(installLabel),
    installLabel,
  );
  await s.clickText(installLabel);
  await s.settle(900);
  check('installed: prep brief shows', (await text('.brief-sheet')).includes('PREP BRIEF'));
  const saved = s.state.snapshot.campaigns.find((c) => c.name.startsWith('The Seventh Bell'));
  check(
    'the saved campaign has the playbook',
    !!saved?.memory?.playbook,
    saved?.memory?.playbook?.version,
  );
  check(
    'Session 1 plan now opens at the port',
    /Pellmoor Landing comes into sight/.test(saved?.sessions?.[0]?.plan || ''),
  );
  check(
    'the IsoForge kit is gone from the plan, and the guide is there',
    !/IsoForge/i.test(saved.sessions[0].plan) &&
      saved.sessions[0].plan.includes('## Running this session (new DM guide)'),
  );
  await shot('03-brief');
  await s.run("document.querySelector('main').scrollTop=0;window.scrollTo(0,900)");
  await s.settle(300);
  await shot('04-brief-lower');
  await s.run('window.scrollTo(0,0)');
  check(
    'an encounter shows its 2024 difficulty',
    /(Low|Moderate|High|Trivial|Beyond High) · \d+ XP/.test(await text('.encounter-card')),
  );
  await s.clickSelector('.creature-list .combatant-toggle');
  await s.settle(700);
  const stats = await text('.creature-stats');
  check(
    'a creature’s stat block opens',
    /campaign stat block|base reference|2024/i.test(stats),
    stats.slice(0, 80).replace(/\s+/g, ' '),
  );
  await s.run("document.querySelector('.creature-stats')?.scrollIntoView({block:'start'})");
  await shot('05-statblock');
  await s.run('window.scrollTo(0,0)');
  // "All plays" leads to the session's Possibilities, where every prepared play can be searched.
  await s.clickText('All plays');
  await s.settle(500);
  // Now: choosing the scene the table is in narrows Session 1's paths to it; the other scenes stay closed.
  const cards = () => s.run("document.querySelectorAll('.session-paths [data-play-id]').length");
  const allCards = await cards();
  const sceneSelect = 'select[aria-label="Current scene"]';
  const secondScene = await s.run(
    `document.querySelector(${JSON.stringify(sceneSelect)})?.options[2]?.value||''`,
  );
  check('the session’s scenes are offered', !!secondScene);
  await s.setValue(sceneSelect, secondScene);
  await s.settle(300);
  const sceneCards = await cards();
  check(
    'Now shows only the current scene',
    sceneCards > 0 && sceneCards < allCards,
    sceneCards + ' of ' + allCards,
  );
  await s.clickSelector('button[aria-label="Next scene"]');
  await s.settle(200);
  check(
    'next scene moves on',
    (await s.run(`document.querySelector(${JSON.stringify(sceneSelect)}).value`)) !== secondScene,
  );
  await shot('05b-now-scene');
  await s.setValue(sceneSelect, '');
  await s.settle(200);
  // Every session's paths: only the current session's group is drawn until another is opened.
  await s.setValue('select[aria-label="Which plays"]', 'All sessions');
  await s.settle(400);
  const groups = await s.run(
    "[...document.querySelectorAll('.session-paths details.scene-group')].map(d=>d.open)",
  );
  check(
    'all sessions are grouped, one open',
    groups.length > 20 && groups.filter(Boolean).length === 1 && (await cards()) === allCards,
    groups.length + ' groups, ' + (await cards()) + ' cards drawn',
  );
  await s.setValue('select[aria-label="Which plays"]', 'This session');
  await s.settle(300);
  await s.setValue('.session-paths input[aria-label="Search prepared paths"]', 'bribe');
  await s.settle(400);
  check('search finds the bribe play', (await text('.session-paths')).includes('They bribe Quill'));
  await s.clickSelector('.session-paths .branch-head');
  await s.settle(300);
  await shot('06-play-open');
  await nav('Foresight');
  await s.clickText('World state');
  await s.settle(400);
  check('world state lists the Hearts', /Ossa.s Heart/.test(await text('.world-state')));
  await shot('07-world-state');
  await s.clickText('Forecast');
  await s.settle(400);
  check(
    'forecast shows the Concord with routes',
    (await text('.forecast')).includes('The Concord') &&
      (await text('.forecast')).includes('Tidewarden'),
  );
  await shot('08-forecast');
  await nav('Party & preferences');
  await s.clickText('Add character');
  await s.settle(200);
  await s.setValue('.roster-table input[aria-label="Character name"]', 'Wren of Waterdeep');
  await s.settle(300);
  check(
    'roster accepts a character',
    s.state.snapshot.campaigns.some((c) =>
      (c.memory?.roster || []).some((r) => r.name === 'Wren of Waterdeep'),
    ),
  );
  await shot('09-party-ledger');
  // The player site panel: nothing is public until the DM sends it.
  await nav('Player site');
  await s.settle(300);
  const site = await text('.player-site');
  check(
    'the player site panel shows what is public and what is ready',
    /Player site/.test(site) && /On the wiki now/.test(site) && /Nothing public yet/.test(site),
  );
  await shot('09b-player-site');
  const firstEntry = await s.run(
    `document.querySelector('.player-site .wiki-list li strong')?.textContent||''`,
  );
  await s.clickSelector('.player-site .wiki-list .button.primary');
  await s.settle(700);
  check(
    'Send to wiki writes the entry into site.html',
    !!firstEntry &&
      (s.state.siteHtml || '').includes(
        '<h3>' + firstEntry.replace(/&/g, '&amp;').replace(/'/g, '&#39;') + '</h3>',
      ) &&
      !/Unlocks as you discover\.<\/strong>/.test(s.state.siteHtml || ''),
    firstEntry,
  );
  check(
    'the sent entry is listed as public',
    /On the wiki now\s*1 entry/.test(await text('.player-site')),
  );
  await shot('09c-sent');
  await nav('Session desk');
  // The guide in the session notes: a play link opens that play's card in place, ready to record.
  await s.clickText('Session notes');
  await s.settle(600);
  check(
    'the session notes have play links',
    (await s.run(`document.querySelectorAll('.book-text .play-link').length`)) > 10,
  );
  await s.clickSelector('.book-text .play-link');
  await s.settle(400);
  await s.run("document.querySelector('.book-text .play-card')?.scrollIntoView({block:'center'})");
  await s.settle(300);
  check(
    'a play link opens its card in place',
    (await text('.book-text .play-card')).includes('The party did this'),
  );
  await shot('09d-plan-play');
  await s.clickSelector('.book-text .play-link.open');
  await s.settle(300);
  check(
    'clicking it again closes it',
    !(await s.run(`!!document.querySelector('.book-text .play-card')`)),
  );
  // The notes bar: a session clock that reads the plan's timeline, quick record on a card, and "Something else happened".
  check(
    'the notes bar offers Something else happened and the table card',
    /Something else happened/.test(await text('.notes-bar')) &&
      /Print table card/.test(await text('.notes-bar')),
  );
  await s.clickText('Start the clock', { within: '.notes-bar' });
  await s.settle(300);
  check(
    'the session clock starts and says where a session usually is',
    /0:00/.test(await text('.session-clock')) &&
      /Usually by now/i.test(await text('.session-clock')),
    (await text('.session-clock')).slice(0, 90),
  );
  await s.run('window.scrollBy(0,600)');
  await s.settle(300);
  await shot('09e-notes-bar');
  const before = s.state.snapshot.campaigns.find((c) => c.memory?.playbook).events.length;
  await s.clickSelector('.book-text .play-link');
  await s.settle(300);
  await s.clickSelector('.book-text .quick-record');
  await s.settle(600);
  check(
    'Quick record adds a chronicle line without a dialog',
    s.state.snapshot.campaigns.find((c) => c.memory?.playbook).events.length === before + 1 &&
      !(await s.run(`!!document.querySelector('.modal')`)),
  );
  await s.clickText('Something else happened', { within: '.notes-bar' });
  await s.settle(400);
  check(
    'Something else happened opens the outcome editor',
    /What actually happened/.test(await text('.modal')),
  );
  await s.clickText('Close & keep draft');
  await s.settle(300);
  check(
    "the notes bar can jump between the guide's scenes",
    (await s.run(`document.querySelectorAll('.scene-jump option').length`)) > 6,
  );
  await s.clickText('Live mode');
  await s.settle(600);
  check(
    "live mode puts the session's table card in the right rail",
    /Table card/.test(await text('.rail-card')) &&
      !(await s.run(`!!document.querySelector('.desk-pulse')`)),
  );
  await s.run('window.scrollTo(0,0)');
  await s.settle(200);
  await shot('09f-live-rail');
  await s.clickText('Exit live mode');
  await s.settle(400);
  await s.clickText('Possibilities');
  await s.settle(400);
  check(
    'Possibilities are grouped by the guide scenes',
    (await s.run('document.querySelectorAll(".scene-group").length')) >= 5 &&
      /Scene 1: The old dock/.test(await text('.scene-group')),
  );
  await shot('09g-possibilities-scenes');
  await s.clickText('Live mode');
  await s.settle(500);
  check(
    'live-mode markers take one row',
    !!(await s.run('document.querySelector(".table-markers.compact")')),
  );
  await s.setValue('.live-lookup input', 'bribe quill');
  await s.settle(400);
  check('live lookup answers', (await text('.live-lookup')).includes('They bribe Quill'));
  await shot('10-live-lookup');
  await s.clickSelector('.live-lookup .branch-head');
  await s.settle(300);
  await s.clickText('The party did this', { within: '.live-lookup' });
  await s.settle(500);
  check('the ripple dialog opens', (await text('.modal')).includes('World changes to record'));
  await shot('11-ripple');
  await s.clickText('Apply without a chronicle entry');
  await s.settle(500);
  const after = s.state.snapshot.campaigns.find((c) => c.memory?.playbook);
  check(
    'the change is recorded in world state',
    after.memory.playbook.state.quill === 'bribed' && after.memory.playbook.log.length === 1,
  );
  await s.clickText('Exit live mode');
  await s.settle(300);
  await nav('Foresight');
  // The recorded bribe's "Down the line" note names Session 4, so it should be waiting in that session's brief.
  const pick = async (v) => {
    await s.setValue(sessionSelect, v);
    await s.settle(500);
  };
  const fourth =
    (await s.run(
      `document.querySelector(${JSON.stringify(sessionSelect)})?.options[3]?.value||''`,
    )) || s.state.snapshot.campaigns.find((c) => c.memory?.playbook)?.sessions?.[3]?.id;
  if (fourth) await pick(fourth);
  check(
    'a recorded choice comes back in a later brief',
    /Quill/.test(await text('.coming-back')),
    (await text('.coming-back')).slice(0, 80),
  );
  await shot('12-coming-back');
  if (first) await pick(first);
  await s.clickText('World state');
  await s.settle(300);
  check('history can undo it', (await text('.state-log')).includes('They bribe Quill'));
  await s.clickText('Undo', { within: '.state-log' });
  await s.settle(400);
  check(
    'undo restored the fact',
    s.state.snapshot.campaigns.find((c) => c.memory?.playbook).memory.playbook.state.quill ===
      'routine',
  );
  const overflow = await s.run(
    'document.documentElement.scrollWidth>document.documentElement.clientWidth+1',
  );
  check('no horizontal overflow', !overflow);
  console.log(
    fails.length
      ? fails.length + ' failed'
      : 'Foresight walk-through passed at ' + width + 'x' + height + '.',
  );
  s.close();
  if (fails.length) process.exitCode = 1;
});
