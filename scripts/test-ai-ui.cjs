const { app, BrowserWindow, ipcMain, nativeTheme } = require('electron');
// A detached Windows launcher may close its console pipe before tests finish.
// Ignore only that transport error; assertions and other stream errors still fail.
for (const stream of [process.stdout, process.stderr])
  stream.on('error', (error) => {
    if (error.code !== 'EPIPE') throw error;
  });
const path = require('node:path'),
  fs = require('node:fs'),
  os = require('node:os'),
  assert = require('node:assert/strict');
const isolated = fs.mkdtempSync(path.join(os.tmpdir(), 'waypoint-ai-ui-'));
app.setPath('userData', isolated);
let snapshot = null;
const ruleFixture = {
  id: 'rule-fixture',
  name: 'Test Beacon',
  kind: 'Spell',
  source: 'TEST',
  edition: '2014',
  page: '1',
  summary: 'Level 1 · Evocation',
  body: 'Casting time\n1 action\n\nDescription\nA light for the test party.',
  warnings: [],
};
// The stand-in main process: `ready` is "a key is saved". The fixture key is made up and never leaves this test.
const fixtureKey = 'sk-ant-api03-fixture-key-000000000000',
  models = [
    {
      id: 'claude-opus-5-5',
      label: 'Claude Opus 5.5',
      note: 'The most capable of the three. The default.',
    },
    {
      id: 'claude-sonnet-5-5',
      label: 'Claude Sonnet 5.5',
      note: 'Faster, at about half the cost of Opus.',
    },
  ];
let ready = false,
  posts = 0,
  asks = [],
  releaseAsk = null,
  tests = 0,
  savedKey = '',
  model = 'claude-opus-5-5';
ipcMain.handle('waypoint:request', async (event, r) => {
  // Ask the campaign is the one generation this test answers: it reports progress, waits for the test, then replies
  // with the shape the main process returns after checking the pages.
  if (r.path === '/api/generate' && r.method === 'POST' && JSON.parse(r.body).mode === 'ask') {
    asks.push(JSON.parse(r.body));
    event.sender.send('waypoint:progress', { label: 'Writing the answer…' });
    await new Promise((resolve) => (releaseAsk = resolve));
    return {
      status: 200,
      body: {
        answer: 'The ferryman takes a silver coin for each crossing.',
        pages: [{ id: 'ferry-page', title: 'The Ferryman' }],
      },
    };
  }
  if (r.path === '/api/rules/search') {
    const query = JSON.parse(r.body || '{}');
    const matches =
      !query.query || ruleFixture.name.toLowerCase().includes(query.query.toLowerCase());
    return {
      status: 200,
      body: {
        entries: matches ? [ruleFixture] : [],
        total: matches ? 1 : 0,
        offset: 0,
        facets: {
          kinds: [{ value: 'Spell' }],
          sources: [{ value: 'TEST' }],
          editions: [{ value: '2014' }],
        },
      },
    };
  }
  if (r.path === '/api/rules/entry') return { status: 200, body: ruleFixture };
  if (r.path === '/api/rules/import')
    return { status: 200, body: { written: 1, skipped: 0, pages: 1, total: 2, failures: [] } };
  if (r.path === '/api/campaigns') {
    if (r.method === 'POST') snapshot = JSON.parse(r.body);
    return { status: 200, body: r.method === 'GET' ? snapshot : {} };
  }
  if (r.path === '/api/generate') {
    if (r.method === 'POST') {
      posts++;
      return { status: 500, body: { error: 'Test must never generate' } };
    }
    return { status: 200, body: { ready, provider: 'anthropic', model } };
  }
  if (r.path === '/api/ai-settings') {
    if (r.method === 'POST') {
      const value = JSON.parse(r.body || '{}');
      if (typeof value.apiKey === 'string') {
        if (!value.apiKey.startsWith('sk-ant-'))
          return { status: 502, body: { error: 'Fixture: not an Anthropic key' } };
        savedKey = value.apiKey;
        ready = true;
      }
      if (value.apiKey === null) {
        savedKey = '';
        ready = false;
      }
      if (value.model) model = value.model;
    }
    return {
      status: 200,
      body: { provider: 'anthropic', model, models, hasKey: ready, canStoreKey: true },
    };
  }
  if (r.path === '/api/ai-test') {
    tests++;
    return ready
      ? {
          status: 200,
          body: { ok: true, message: 'Connected. The fixture model is available to this key.' },
        }
      : { status: 502, body: { error: 'Save your Anthropic API key first.' } };
  }
  return { status: 200, body: r.path === '/api/campaigns' && r.method === 'GET' ? null : {} };
});
app.whenReady().then(async () => {
  nativeTheme.themeSource = 'light';
  const win = new BrowserWindow({
    show: false,
    width: 1420,
    height: 940,
    webPreferences: {
      offscreen: true,
      backgroundThrottling: false,
      preload: path.resolve('desktop/build/preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  const run = (s) => win.webContents.executeJavaScript(s);
  const wait = async (expression) => {
    for (let i = 0; i < 80; i++) {
      try {
        if (await run(expression)) return;
      } catch (e) {
        if (!/Script failed to execute/.test(String(e))) throw e;
      }
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error('Timed out: ' + expression);
  };
  // Resolves once the reloaded document has finished loading, so a poll cannot be answered by the page that is being replaced.
  const reload = async () => {
    const loaded = new Promise((r) => win.webContents.once('did-finish-load', r));
    win.webContents.reload();
    await loaded;
  };
  const go = require('./ui-nav.cjs').navigator(run, wait),
    deskTabs = "[...document.querySelectorAll('.desk-main>.tabs button')]";
  // The desk's panels sit under its tabs: the idea panel and the coach under Quick help, the prepared paths under Possibilities.
  const tab = async (name) => {
    await wait("!!document.querySelector('.desk-main>.tabs')");
    await run(`${deskTabs}.find(b=>b.textContent.startsWith(${JSON.stringify(name)})).click()`);
    await wait(
      `${deskTabs}.some(b=>b.getAttribute('aria-pressed')==='true'&&b.textContent.startsWith(${JSON.stringify(name)}))`,
    );
  };
  try {
    await win.loadFile(path.resolve('desktop/build/renderer/index.html'));
    const setInput = (selector, value) =>
      run(
        `(()=>{const e=document.querySelector(${JSON.stringify(selector)}),proto=e instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:e instanceof HTMLSelectElement?HTMLSelectElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event(e instanceof HTMLSelectElement?'change':'input',{bubbles:true}))})()`,
      );
    const settingsButton = (text) =>
      `[...document.querySelectorAll('.ai-settings button')].find(b=>b.textContent.trim()===${JSON.stringify(text)})`;
    const closeModal = async () => {
      await run("document.querySelector('.modal-close').click()");
      await wait("!document.querySelector('.modal')");
    };
    const keyField = '.ai-settings input[type=password]',
      generateOff = "document.querySelector('.improv-panel .button.primary').disabled",
      settingsNote = (text) =>
        `document.querySelector('.ai-settings .connection-ok')?.textContent.includes(${JSON.stringify(text)})`;
    // No key: the idea panel asks for one, and generation is off.
    await tab('Quick help');
    await wait("document.querySelector('.engine-start')!==null");
    assert.equal(posts, 0, 'Mount must not generate');
    assert(
      await run(
        "document.querySelector('.inspiration-engine').textContent.includes('Claude needs an API key')",
      ),
    );
    await setInput('#quick-prompt', 'A wandering mapmaker');
    assert(await run(generateOff));
    await run("document.querySelector('.engine-start').click()");
    await wait(
      'document.querySelector(\'.ai-settings select[aria-label="Claude model"] option\')!==null',
    );
    assert(await run(settingsButton('Save key') + '.disabled'), 'An empty key cannot be saved');
    // A key the main process rejects is reported, and stays in the field to be corrected.
    await setInput(keyField, 'sk-proj-fixture-from-another-provider');
    await run(settingsButton('Save key') + '.click()');
    await wait(
      "document.querySelector('.ai-settings .error-text')?.textContent.includes('not an Anthropic key')",
    );
    assert.equal(
      await run(`document.querySelector(${JSON.stringify(keyField)}).value`),
      'sk-proj-fixture-from-another-provider',
    );
    assert.equal(ready, false);
    // A saved key is cleared from the field and is not rendered anywhere afterwards.
    await setInput(keyField, fixtureKey);
    await run(settingsButton('Save key') + '.click()');
    await wait(settingsNote('Key saved'));
    assert.equal(savedKey, fixtureKey);
    assert.equal(await run(`document.querySelector(${JSON.stringify(keyField)}).value`), '');
    assert(
      await run(
        "document.querySelector('.ai-settings').textContent.includes('A key is saved on this computer')",
      ),
    );
    assert.equal(
      await run(`document.documentElement.outerHTML.includes(${JSON.stringify(fixtureKey)})`),
      false,
      'A saved key must not stay in the page',
    );
    await run(settingsButton('Test connection') + '.click()');
    await wait(settingsNote('Connected'));
    assert.equal(tests, 1);
    await setInput('.ai-settings select[aria-label="Claude model"]', 'claude-sonnet-5-5');
    await wait(settingsNote('Model saved'));
    assert.equal(model, 'claude-sonnet-5-5');
    await closeModal();
    await wait(
      "document.querySelector('.inspiration-engine').textContent.includes('Claude is connected')",
    );
    assert.equal(
      await run("document.querySelector('#quick-prompt').value"),
      'A wandering mapmaker',
    );
    assert.equal(await run(generateOff), false);
    await wait(
      "document.querySelector('.inspiration-engine small')?.textContent==='claude-sonnet-5-5'",
    );
    // Removing the key turns generation off again.
    await run("document.querySelector('.engine-settings').click()");
    await wait('!!' + settingsButton('Remove key'));
    await run(settingsButton('Remove key') + '.click()');
    await wait(settingsNote('Key removed'));
    assert.equal(ready, false);
    assert.equal(savedKey, '');
    await closeModal();
    await wait("document.querySelector('.engine-start')!==null");
    assert(await run(generateOff));
    // Asking to generate without a key opens the settings and sends nothing.
    await tab('Possibilities');
    await run(
      "[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Prepare paths')).click()",
    );
    await wait("document.querySelector('.ai-settings')!==null");
    assert.equal(posts, 0, 'Generation without a key must open settings without submitting');
    await closeModal();
    await tab('Quick help');
    await run(
      "[...document.querySelectorAll('.coach-situations button')].find(b=>b.textContent==='The roll fails').click()",
    );
    await wait("document.querySelector('.coach-tip').textContent.includes('time, exposure')");
    await run("document.querySelector('.table-coach>.text-button').click()");
    await wait(
      "document.querySelector('#quick-prompt').value.includes('A meaningful player check has failed')",
    );
    assert.equal(posts, 0, 'Coach templates must not generate');
    await run("document.querySelector('.prompt-draft-status button').click()");
    await wait("document.querySelector('#quick-prompt').value==='A wandering mapmaker'");
    snapshot.campaigns[0].sessions.push({
      ...snapshot.campaigns[0].sessions[0],
      id: 'draft-other',
      title: 'Another session',
    });
    snapshot.campaigns[0].cards.push({
      id: 'saved-fixture',
      kind: 'NPC',
      title: 'Mapmaker fixture',
      body: 'SAY NOW: Welcome. ASK: What brings you here? IF THEY FAIL: Offer another route.',
      readAloud: 'Welcome',
      consequence: 'A possible ally',
      source: 'Fixture',
    });
    await reload();
    await wait("document.querySelector('.recent-material-item')!==null");
    await tab('Quick help');
    assert.equal(
      await run("document.querySelector('#quick-prompt').value"),
      'A wandering mapmaker',
      'Prompt survives reload',
    );
    await run(
      "(()=>{const e=document.querySelector('select[aria-label=\"Current session\"]');e.value='draft-other';e.dispatchEvent(new Event('change',{bubbles:true}))})()",
    );
    await wait("document.querySelector('#quick-prompt').value===''");
    await run(
      "(()=>{const e=document.querySelector('#quick-prompt');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(e,'Second session prompt');e.dispatchEvent(new Event('input',{bubbles:true}))})()",
    );
    await run(
      "(()=>{const e=document.querySelector('select[aria-label=\"Current session\"]');e.selectedIndex=0;e.dispatchEvent(new Event('change',{bubbles:true}))})()",
    );
    await wait("document.querySelector('#quick-prompt').value==='A wandering mapmaker'");
    await run("document.querySelector('.recent-material-item').click()");
    await wait("document.querySelector('#modal-title')?.textContent==='Mapmaker fixture'");
    assert.equal(posts, 0, 'Recent material opens without generation');
    assert.equal(await run("document.querySelectorAll('.response-section').length"), 3);
    await run("document.querySelector('.pin-material').click()");
    await wait(
      "document.querySelector('.desk-reference')!==null&&!document.querySelector('.modal')",
    );
    assert.equal(snapshot.campaigns[0].sessions[0].pinnedCardId, 'saved-fixture');
    await reload();
    await wait(
      "document.querySelector('.desk-reference')?.textContent.includes('Mapmaker fixture')",
    );
    await run(
      "(()=>{const e=document.querySelector('select[aria-label=\"Current session\"]');e.value='draft-other';e.dispatchEvent(new Event('change',{bubbles:true}))})()",
    );
    await wait("!document.querySelector('.desk-reference')");
    await run(
      "(()=>{const e=document.querySelector('select[aria-label=\"Current session\"]');e.selectedIndex=0;e.dispatchEvent(new Event('change',{bubbles:true}))})()",
    );
    await wait("document.querySelector('.desk-reference')!==null");
    await run("document.querySelector('.unpin-material').click()");
    await wait("!document.querySelector('.desk-reference')");
    assert(
      snapshot.campaigns[0].cards.some((c) => c.id === 'saved-fixture'),
      'Unpin must preserve library content',
    );
    await run("document.querySelector('.recent-material-item').click()");
    await wait("document.querySelector('.modal')!==null");
    console.log(
      'Desk references passed: sections, pin, reload, session isolation and nondestructive unpin.',
    );

    await run("document.querySelector('.modal-close').click()");
    await wait("!document.querySelector('.modal')");

    snapshot.campaigns[0].events.push({
      id: 'wrap-event',
      sessionId: snapshot.campaigns[0].sessions[0].id,
      text: 'The party bargained with Voss.',
      style: 'Roleplay',
      enjoyment: 'Neutral',
      date: new Date().toISOString(),
    });
    await reload();
    await tab('Possibilities');
    await wait(
      "document.querySelector('.choice-follow-through strong')?.textContent.startsWith('1 choice')",
    );
    await run("document.querySelector('.wrap-session').click()");
    await wait("document.querySelector('.session-wrap-up')!==null");
    await run(
      "(()=>{const e=document.querySelector('.wrap-events select');e.value='Loved it';e.dispatchEvent(new Event('change',{bubbles:true}));})()",
    );
    await wait(
      "document.querySelector('.wrap-summary .wrap-loved strong').textContent==='1'",
    );
    await run(
      "(()=>{const e=document.querySelectorAll('.session-wrap-up textarea')[1];Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(e,'Who hired the courier?');e.dispatchEvent(new Event('input',{bubbles:true}))})()",
    );
    await run("document.querySelector('.finish-session').click()");
    await wait(
      "document.querySelector('.planner-debrief')?.textContent.includes('Who hired the courier?')",
    );
    assert.equal(snapshot.campaigns[0].sessions[0].done, true);
    assert.equal(snapshot.campaigns[0].events.length, 1);
    assert.equal(posts, 0);
    await reload();
    await wait("document.querySelector('.wrap-session')?.textContent==='Review session'");
    assert.equal(snapshot.campaigns[0].sessions[0].debrief.openQuestions, 'Who hired the courier?');
    console.log(
      'Wrap-up passed: enjoyment correction, persistent notes, session completion, planner carry-forward and no automatic AI or invented events.',
    );

    await tab('Possibilities');
    await run("document.querySelector('.branch-bottom .button:not(.quick-record)').click()");
    await wait("document.querySelector('#modal-title')?.textContent==='What actually happened?'");
    assert.equal(
      await run("document.querySelector('.modal textarea').value"),
      'Talk their way past the captain.',
      'Predicted consequence must not become prefilled history',
    );
    await run("document.querySelector('.modal-close').click()");
    await wait("!document.querySelector('.modal')");
    assert(await run("document.querySelector('.choice-follow-through')!==null"));
    await go('Chronicle');
    await wait('document.querySelector(\'input[aria-label="Search recorded events"]\')!==null');
    await run(
      "(()=>{const e=document.querySelector('input[aria-label=\"Search recorded events\"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,'unmatched-history');e.dispatchEvent(new Event('input',{bubbles:true}))})()",
    );
    await wait("document.querySelector('.history-empty')!==null");
    await go('Saved material');
    await wait("document.querySelector('.material-library')!==null");
    assert.equal(
      await run('document.querySelector(\'input[aria-label="Search saved material"]\').value'),
      '',
      'Searches must be independent',
    );
    await run(
      "(()=>{const e=document.querySelector('input[aria-label=\"Search saved material\"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,'unmatched-material');e.dispatchEvent(new Event('input',{bubbles:true}))})()",
    );
    await wait("document.querySelector('.library-empty')!==null");
    await run("document.querySelector('.library-empty button').click()");
    await wait("document.querySelector('.material-card')!==null");
    await run(
      "[...document.querySelectorAll('.library-filters button')].find(b=>b.textContent.startsWith('NPC')).click()",
    );
    await wait(
      "document.querySelector('.library-filters button[aria-pressed=true]').textContent.startsWith('NPC')",
    );
    await go('Session desk');
    await tab('Quick help');
    await wait("document.querySelector('#quick-prompt')!==null");

    await run(
      "[...document.querySelectorAll('.topbar button')].find(b=>b.textContent==='Live mode').click()",
    );
    await wait("document.querySelector('.app.live')!==null");
    assert.equal(
      await run("getComputedStyle(document.querySelector('.page-heading')).display"),
      'none',
    );
    // Live mode keeps the desk's tabs and adds the one-row moment markers above the open tab.
    assert(
      await run(
        "!!document.querySelector('.table-markers.compact')&&!!document.querySelector('.desk-main>.tabs')&&!!document.querySelector('.table-coach')",
      ),
    );
    for (const width of [900, 1420]) {
      win.setSize(width, 940);
      await new Promise((r) => setTimeout(r, 150));
      assert(
        await run('document.documentElement.scrollWidth<=document.documentElement.clientWidth+2'),
        'Live layout overflow',
      );
    }
    await go('Saved material');
    await wait("document.querySelector('.material-library')!==null");
    assert.notEqual(
      await run("getComputedStyle(document.querySelector('.page-heading')).display"),
      'none',
      'Live mode must not hide headings on other screens',
    );
    await run(
      "[...document.querySelectorAll('.topbar button')].find(b=>b.textContent==='Exit live mode').click()",
    );
    await wait("document.querySelector('#quick-prompt')!==null");
    const postsBeforeRules = posts;
    await go('Rules library');
    await wait("document.querySelector('.rule-result')!==null");
    const rulesLayout = await run(
      "(()=>{const bar=document.querySelector('.rules-toolbar').getBoundingClientRect(),list=document.querySelector('.rules-list').getBoundingClientRect(),pane=document.querySelector('.rules-results').getBoundingClientRect(),detail=document.querySelector('.rule-detail').getBoundingClientRect(),layout=document.querySelector('.rules-layout').getBoundingClientRect();return {barHeight:bar.height,listTop:list.top,sideBySide:Math.abs(pane.top-detail.top)<2&&detail.left>pane.right-1,bottom:layout.bottom,viewport:innerHeight}})()",
    );
    assert(
      rulesLayout.barHeight < 76,
      'Rules filters should sit in one row, got ' + rulesLayout.barHeight,
    );
    assert(
      rulesLayout.listTop < 460,
      'Rules list should start near the top, got ' + rulesLayout.listTop,
    );
    assert(rulesLayout.sideBySide, 'Rules list and detail should be two panes');
    assert(rulesLayout.bottom <= rulesLayout.viewport + 1, 'Rules panes should fit the window');
    assert(
      await run(
        '!!document.querySelector(\'select[aria-label="Filter rules by type"] option[value=All]\')',
      ),
    );
    await run("document.querySelector('.rule-result').click()");
    await wait("document.querySelector('.rule-detail h2')?.textContent==='Test Beacon'");
    await run("document.querySelector('.rule-book-link').click()");
    await wait(
      "document.querySelector('select[aria-label=\"Filter rules by book\"]').value==='TEST'",
    );
    assert.equal(
      await run('document.querySelector(\'input[aria-label="Search rules"]\').value'),
      '',
    );
    await run(
      "document.querySelector('.rules-books>button').click();document.querySelector('[aria-label=\"Clear book filter\"]').click()",
    );
    await wait(
      "document.querySelector('select[aria-label=\"Filter rules by book\"]').value==='All'",
    );
    await run("document.querySelector('.rules-book-grid button').click()");
    await wait("document.querySelector('.rules-book-active strong')?.textContent==='TEST'");
    await run('document.querySelector(\'[aria-label="Clear book filter"]\').click()');
    await win.webContents.insertCSS('*{animation:none!important;transition:none!important}');
    await new Promise((r) => setTimeout(r, 350));
    fs.writeFileSync(
      path.join(__dirname, '../.sites-runtime/library-books.png'),
      (await win.webContents.capturePage()).toPNG(),
    );
    assert(
      await run(
        "[...document.querySelectorAll('.rule-sections h4')].some(h=>h.textContent==='Casting time')",
      ),
      'Rule text should have labeled sections',
    );
    await run(
      "(()=>{const s=document.querySelector('select[aria-label=\"Filter rules by type\"]');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(s,'Spell');s.dispatchEvent(new Event('change',{bubbles:true}))})()",
    );
    await wait(
      "document.querySelector('select[aria-label=\"Filter rules by type\"]').value==='Spell'",
    );
    await run("document.querySelector('.rules-list-head .text-button').click()");
    await wait(
      "document.querySelector('select[aria-label=\"Filter rules by type\"]').value==='All'",
    );
    await run(
      "[...document.querySelectorAll('.rules-import-actions button')].find(b=>b.textContent==='Import JSON').click()",
    );
    await wait(
      "document.querySelector('.rules-library .info-box')?.textContent.includes('1 entry imported')",
    );
    assert.equal(posts, postsBeforeRules);
    await wait(
      "document.querySelector('.rule-result')&&!document.querySelector('.rule-result').disabled",
    );
    await run("document.querySelector('.rule-result').click()");
    await wait("document.querySelector('.rule-detail .rule-actions')!==null");
    for (const width of [900, 1420]) {
      win.setSize(width, 940);
      await new Promise((r) => setTimeout(r, 150));
      assert(
        await run('document.documentElement.scrollWidth<=document.documentElement.clientWidth+2'),
        'Rules library must fit the desktop window',
      );
    }
    await run("document.querySelector('.rule-actions .primary').click()");
    await wait("document.querySelector('.rule-actions .primary').disabled");
    await go('Session desk');
    await wait("document.querySelector('.session-rule')!==null");
    assert(
      await run("document.querySelector('.session-rule').textContent.includes('Test Beacon')"),
    );
    await reload();
    await wait("document.querySelector('.session-rule')!==null");
    await go('Rules library');
    await wait("document.querySelector('.rule-result')!==null");
    await run("document.querySelector('.rule-result').click()");
    await wait("document.querySelector('.rule-actions')!==null");
    await run(
      "[...document.querySelectorAll('.rule-actions button')].find(b=>b.textContent==='Use in a prompt').click()",
    );
    await wait("document.querySelector('#quick-prompt')?.value.includes('Reference: TEST (2014)')");
    assert.equal(posts, postsBeforeRules, 'Using a reference must not generate automatically');
    await run("document.querySelector('.session-rule .icon-button').click()");
    await wait("document.querySelector('.session-rule')===null");
    assert.equal(posts, postsBeforeRules);
    console.log(
      'Rules UI passed: browse, details, pin, restart persistence, explicit prompt handoff and nondestructive unpin with no generation.',
    );
    console.log(
      'Polish regressions passed: factual outcome prefill, history feedback, independent search, material filters and recorded-choice follow-through.',
    );
    await run(
      "(()=>{Storage.prototype.setItem=function(){throw new Error('Quota fixture')};const e=document.querySelector('#quick-prompt');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(e,'Keep this unsaved draft');e.dispatchEvent(new Event('input',{bubbles:true}))})()",
    );
    await wait(
      "document.querySelector('.improv-panel>.engine-error')?.textContent.includes('Copy it before closing')",
    );
    assert.equal(
      await run("document.querySelector('#quick-prompt').value"),
      'Keep this unsaved draft',
    );
    console.log(
      'Draft recovery passed: undo, restart recovery, session isolation and offline recent-material access.',
    );

    // Ask the campaign: the progress label shows while Claude writes, the answer names its pages, and a page opens.
    ready = true;
    const c0 = snapshot.campaigns[0];
    c0.memory = {
      notes: [],
      planner: { duration: '3 hours', focus: '', spotlight: '', locked: '' },
      ...c0.memory,
      pages: [
        ...(c0.memory?.pages || []),
        {
          id: 'ferry-page',
          title: 'The Ferryman',
          kind: 'NPC',
          body: 'Takes a silver coin for each crossing.',
          aliases: '',
          status: 'Confirmed',
          visibility: 'DM only',
          sourceId: '',
          quote: '',
          updated: new Date().toISOString(),
          history: [],
        },
      ],
    };
    await reload();
    await wait("document.querySelector('.ask-trigger')!==null");
    await run("document.querySelector('.ask-trigger').click()");
    await wait("document.querySelector('.ask-dialog textarea')!==null");
    await setInput('.ask-dialog textarea', 'What does the ferryman charge?');
    await wait("!document.querySelector('.ask-dialog button[type=submit]').disabled");
    await run("document.querySelector('.ask-dialog button[type=submit]').click()");
    await wait(
      "document.querySelector('.generating-progress')?.textContent==='Writing the answer…'",
    );
    assert.equal(asks.length, 1);
    assert(
      asks[0].context.wiki.some((p) => p.id === 'ferry-page'),
      'The matching page is sent',
    );
    assert.equal(asks[0].prompt, 'What does the ferryman charge?');
    releaseAsk();
    await wait("document.querySelector('.ask-answer')?.textContent.includes('silver coin')");
    assert(await run("!document.querySelector('.generating')"), 'The banner closes');
    await run("document.querySelector('.ask-pages button').click()");
    await wait(
      "!document.querySelector('.modal')&&!!document.querySelector('.reference-dialog')?.textContent.includes('The Ferryman')",
    );
    assert.equal(posts, 0, 'Only the question was sent');
    console.log(
      'Ask the campaign passed: question sent with its matching page, progress shown, answer and page link opened.',
    );
    console.log(
      'AI UI passed: no key disables generation, a rejected key is reported, a saved key is never shown again, connection test, model choice, prompt retained, key removal, generation guarded.',
    );
    app.exit(0);
  } catch (e) {
    console.error(e);
    app.exit(1);
  }
});
