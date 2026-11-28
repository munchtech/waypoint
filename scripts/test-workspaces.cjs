// Regression coverage for search destinations and the prep → play → review handoffs.
const assert = require('node:assert/strict');
const fs = require('node:fs'),
  path = require('node:path'),
  os = require('node:os');
const { openSession, doStep, run } = require('./ui-harness.cjs');
require('electron').app.on('window-all-closed', () => {});

run(async (args) => {
  const out = path.resolve(args.out || path.join(os.tmpdir(), 'waypoint-workspaces'));
  fs.mkdirSync(out, { recursive: true });
  const { demo } = await import('../.sites-runtime/campaign-tests/campaign.mjs');
  const campaign = structuredClone(demo),
    now = new Date().toISOString(),
    sid = campaign.sessions[0].id;
  campaign.memory = {
    pages: [
      {
        id: 'observatory',
        title: 'Silver Observatory',
        kind: 'Location',
        aliases: 'Moonwatch',
        body: 'The moon lens opens a portal above the harbor.',
        status: 'Confirmed',
        visibility: 'Party knows',
        sourceId: 'source',
        quote: 'The lens opens a portal.',
        updated: now,
        history: [],
      },
    ],
    notes: [
      {
        id: 'source',
        sessionId: sid,
        title: 'Harbor conversation',
        text: 'The lens opens a portal. A courier promised a sapphire key.',
        date: now,
        summary: 'A portal and a promise.',
        proposals: [
          {
            id: 'proposal',
            title: 'Sapphire key',
            kind: 'Item',
            body: 'The courier promised a sapphire key.',
            quote: 'A courier promised a sapphire key.',
            state: 'pending',
          },
        ],
      },
    ],
    planner: { duration: '3 hours', focus: '', spotlight: '', locked: '' },
    handouts: [
      {
        id: 'handout',
        title: 'Welcome to Moonwatch',
        body: 'You arrive at the Silver Observatory.',
        sourcePageIds: ['observatory'],
        updated: now,
      },
    ],
    roster: [
      {
        id: 'character',
        name: 'Iris Moonwatch',
        player: 'Morgan',
        level: 4,
        notes: 'Seeking the moon lens.',
      },
    ],
  };
  campaign.events = [
    {
      id: 'event',
      sessionId: sid,
      text: 'The party negotiated passage with the sapphire courier.',
      style: 'Roleplay',
      enjoyment: 'Neutral',
      date: now,
    },
  ];
  campaign.sessions[0].plan += '\n\nVisit the Silver Observatory. Moonwatch overlooks the harbor.';
  // A second campaign, found only through the desktop app's full-text search across campaigns.
  const other = structuredClone(demo);
  Object.assign(other, { id: 'ember', name: 'The Ember Coast', cards: [] });
  Object.assign(other.sessions[0], {
    id: 'ember-s1',
    title: 'Smugglers at dusk',
    plan: 'The coast road at dusk.',
    branches: [],
  });
  other.events = [
    {
      id: 'ember-event',
      sessionId: 'ember-s1',
      text: 'The smugglers hid lanterns in the tide caves.',
      style: 'Exploration',
      enjoyment: 'Neutral',
      date: now,
    },
  ];
  const fixture = path.join(out, 'fixture.json');
  fs.writeFileSync(
    fixture,
    JSON.stringify({ campaigns: [campaign, other], active: campaign.id, sessionId: sid }),
  );
  const s = await openSession({ fixture, width: Number(args.width || 1420), height: 940 });
  const text = (selector) =>
    s.run(`document.querySelector(${JSON.stringify(selector)})?.innerText||''`);
  s.win.webContents.on('console-message', (_event, _level, message) =>
    console.log('Renderer:', message),
  );
  const nav = async (view) => {
    console.log('Navigate', view);
    assert.equal(await doStep(s, ['nav', view]), 'ok', view);
    await s.settle(150);
  };
  const click = async (label, within = 'body') => {
    console.log('Click', label);
    assert.equal(await s.clickText(label, { within }), 'ok', label);
    await s.settle(150);
  };
  const search = async (query) => {
    console.log('Search', query);
    await s.key('K', ['control']);
    await s.settle(100);
    assert.equal(await s.setValue('.command-input input', query), 'ok');
    await s.settle(650);
  };
  const result = async (title) => {
    assert(
      await s.run(
        `(()=>{const label=[...document.querySelectorAll('.command-results strong')].find(e=>e.textContent===${JSON.stringify(title)});if(!label)return false;label.closest('button').click();return true})()`,
      ),
      title,
    );
    await s.settle(250);
  };
  try {
    assert.equal(
      await s.run(
        "document.querySelectorAll('.sidebar nav .navitem:not(.mobile-settings)').length",
      ),
      5,
    );
    await search('Moonwatch');
    assert.match(await text('.command-results'), /Silver Observatory/);
    assert.match(await text('.command-results'), /Iris Moonwatch/);
    assert.match(await text('.command-results'), /Welcome to Moonwatch/);
    assert.equal(await s.clickSelector('.command-results button'), 'ok');
    await s.settle(200);
    assert.match(await text('.reference-heading'), /Silver Observatory/);
    await click('Open wiki editor');
    assert.equal(
      await s.run("document.querySelector('.wiki-editor input').value"),
      'Silver Observatory',
    );
    await click('Source: Harbor conversation', '.wiki-editor');
    await click('Open source note', '.wiki-editor');
    assert.match(await text('.memory-workspace'), /Harbor conversation/);
    assert.equal(await s.run("document.querySelectorAll('.session-review').length"), 0);
    await click('Review discoveries (1)');
    assert.match(await text('.session-review'), /Sapphire key/);
    await click('Create reviewed page');
    await click('Open saved wiki page');
    assert.equal(await s.run("document.querySelector('.wiki-editor input').value"), 'Sapphire key');
    console.log('Passed discovery → wiki → source → review → saved page handoffs.');
    await search('sapphire courier');
    assert.match(await text('.command-results'), /negotiated passage/);
    await s.key('Escape');
    await s.settle(100);
    await search('Welcome to Moonwatch');
    await result('Welcome to Moonwatch');
    await click('Open the handout');
    assert.equal(
      await s.run("document.querySelector('.handout-workspace input:not([type=checkbox])').value"),
      'Welcome to Moonwatch',
    );
    await search('fireball');
    assert.match(await text('.command-results'), /Fireball/);
    assert.equal(await s.clickSelector('.command-results button'), 'ok');
    await s.settle(800);
    assert.equal(await text('.rule-detail h2'), 'Fireball');
    await s.shot(path.join(out, 'search-rule-destination.png'));
    console.log(
      'Passed global alias, roster, handout, event, and offline-rule search with exact destinations.',
    );
    await nav('Session desk');
    await click('Table log');
    await nav('Next session');
    assert.match(await text('.session-guide .selected strong'), /^Next$/);
    assert.equal(
      s.state.snapshot.campaigns[0].sessions.length,
      1,
      'Opening the planner must not generate a session',
    );
    await nav('Party & preferences');
    assert.equal(await s.run("document.querySelectorAll('.party-ledger').length"), 1);
    await s.shot(path.join(out, 'party-workspace.png'));
    console.log('Passed shared party home and outcome → next-session planner handoff.');
    await nav('Session desk');
    await click('Notes');
    assert.equal(await s.clickSelector('.desk-main .wiki-mention'), 'ok');
    await s.settle(200);
    assert.equal(await text('.reference-heading h2'), 'Silver Observatory');
    await s.shot(path.join(out, 'context-reference.png'));
    await click('Pin');
    await s.key('Escape');
    await s.settle(100);
    assert.match(await text('.desk-main .tabs .selected'), /Notes/);
    assert.match(await text('.handy-references'), /Silver Observatory/);
    await s.run('window.scrollTo(0,300)');
    await s.settle(100);
    const previousScroll = await s.run('window.scrollY');
    assert.equal(await s.clickSelector('.desk-main .wiki-mention'), 'ok');
    await s.settle(100);
    await click('Open wiki editor');
    assert.equal(
      await s.setValue('.wiki-editor textarea', 'A moon lens. Unfinished navigation draft.'),
      'ok',
    );
    await s.settle(100);
    assert.equal(await s.clickSelector('.workspace-back'), 'ok');
    await s.settle(200);
    assert.match(await text('.desk-main .tabs .selected'), /Notes/);
    assert(
      Math.abs((await s.run('window.scrollY')) - previousScroll) <= 5,
      'Back restores the prior scroll position',
    );
    await nav('World wiki');
    assert.match(
      await s.run("document.querySelector('.wiki-editor textarea').value"),
      /Unfinished navigation draft/,
    );
    await click('Save page');
    await search('Moonwatch');
    await s.setValue('select[aria-label="Search category"]', 'Handout');
    await s.settle(300);
    assert.match(await text('.command-results'), /Welcome to Moonwatch/);
    assert(
      await s.run(
        "[...document.querySelectorAll('.command-results strong')].every(label=>label.textContent==='Welcome to Moonwatch')",
      ),
    );
    await s.key('Escape');
    await s.settle(100);
    await s.key('K', ['control']);
    await s.settle(150);
    assert.match(await text('.command-results'), /Pinned/i);
    await s.key('Escape');
    await s.settle(100);
    await nav('Saved material');
    await nav('Campaign hub');
    await click('Library', '.sidebar');
    assert.match(await text('.workspace-tabs .selected'), /Saved ideas/);
    console.log(
      'Passed contextual previews, handy references, Back restoration, wiki draft recovery, search categories, and remembered workspace sections.',
    );
    await s.resize(900, 760);
    await nav('Session desk');
    await click('Notes');
    assert.equal(await s.clickSelector('.desk-main .wiki-mention'), 'ok');
    await s.settle(150);
    assert(
      await s.run(
        "document.querySelector('.reference-dialog').scrollWidth<=document.querySelector('.reference-dialog').clientWidth+2",
      ),
    );
    await s.shot(path.join(out, 'context-reference-900.png'));
    await s.key('Escape');
    await s.settle(100);
    for (const view of [
      'Session desk',
      'Campaign hub',
      'Session journal',
      'Discoveries',
      'Rules library',
      'Player handouts',
      'Maps',
    ]) {
      await nav(view);
      assert(
        await s.run('document.documentElement.scrollWidth<=document.documentElement.clientWidth+2'),
        'Horizontal overflow in ' + view,
      );
    }
    console.log('Passed narrow-window workspace navigation and page overflow checks.');
    await search('tide caves');
    assert.match(
      await text('.command-results'),
      /The Ember Coast · Event\s+Recorded event\s+The smugglers hid lanterns in the tide caves\.\s*$/i,
    );
    assert(
      await s.run(
        "(()=>{const b=[...document.querySelectorAll('.command-results button')].find(b=>b.querySelector('.search-kind')?.textContent==='The Ember Coast · Event');if(!b)return false;b.click();return true})()",
      ),
      'Other-campaign result',
    );
    await s.settle(400);
    assert.equal(
      await s.run('document.querySelector(\'select[aria-label="Choose campaign"]\').value'),
      'ember',
    );
    assert.match(await text('#main'), /tide caves/);
    console.log('Passed search across campaigns, opening the match in its own campaign.');
  } catch (error) {
    await s.shot(path.join(out, 'failure.png'));
    throw error;
  } finally {
    s.close();
  }

  const p = await openSession({ fixture: 'seventh-bell' });
  try {
    assert.equal(await doStep(p, ['nav', 'Foresight']), 'ok');
    await p.settle(800);
    assert.equal(await p.clickText('Review the update'), 'ok');
    await p.settle(300);
    const install = await p.run(
      "[...document.querySelectorAll('.update-review button')].find(b=>/^Install/.test(b.textContent.trim()))?.textContent.trim()",
    );
    assert(install);
    assert.equal(await p.clickText(install), 'ok');
    await p.settle(800);
    assert(await p.run("!!document.querySelector('.brief-sheet')"));
    assert.equal(await p.clickText('All plays'), 'ok');
    await p.settle(400);
    assert(await p.run("!!document.querySelector('.session-paths')"));
    assert.equal(await p.setValue('.path-search select', 'Anytime'), 'ok');
    await p.settle(200);
    assert((await p.run("document.querySelectorAll('[data-play-id]').length")) > 0);
    await p.shot(path.join(out, 'prepared-paths.png'));
    assert.equal(await doStep(p, ['nav', 'Party & preferences']), 'ok');
    await p.settle(300);
    assert(await p.run("!!document.querySelector('.party-ledger')"));
    console.log(
      'Passed bundled update installation, prep brief → prepared paths, anytime plays, and roster access.',
    );
    assert.equal(await doStep(p, ['nav', 'Session desk']), 'ok');
    await p.settle(200);
    assert.equal(await p.clickText('Combat'), 'ok');
    await p.settle(700);
    const combat = await p.run("document.querySelector('.session-combat').innerText");
    assert.match(combat, /4 × Hushman/);
    assert.match(combat, /Silence-Glove Strike/);
    assert.match(combat, /Pack Tactics/);
    assert.match(combat, /Heavy Crossbow/);
    assert.match(combat, /32 \(5d8 \+ 10\)/);
    await p.shot(path.join(out, 'combat-session.png'));
    const current = p.state.snapshot.campaigns.find((c) => c.memory?.playbook);
    const boarding = current.memory.playbook.encounters.find(
      (e) => e.title === 'Boarding the Gilded Heron',
    );
    assert(boarding);
    assert.equal(
      await p.setValue('select[aria-label="Current session"]', boarding.sessionId),
      'ok',
    );
    await p.settle(250);
    assert(
      await p.run(
        `(()=>{const title=[...document.querySelectorAll('.encounter-picker strong')].find(e=>e.textContent===${JSON.stringify(boarding.title)});if(!title)return false;title.closest('button').click();return true})()`,
      ),
    );
    await p.settle(900);
    const baseStats = await p.run("document.querySelector('.session-combat').innerText");
    assert.match(baseStats, /3 × Coster guard/);
    assert.match(baseStats, /Armor class/i);
    assert.match(baseStats, /Hit points/i);
    assert.match(baseStats, /Actions/i);
    assert.match(baseStats, /2024/);
    assert.equal(
      await p.run("document.querySelectorAll('.session-combat .creature-stats').length"),
      3,
    );
    await p.shot(path.join(out, 'combat-base-creatures.png'));
    await p.resize(900, 760);
    assert(
      await p.run('document.documentElement.scrollWidth<=document.documentElement.clientWidth+2'),
      'Combat stat blocks fit a narrow window',
    );
    await p.shot(path.join(out, 'combat-base-creatures-900.png'));
    console.log(
      'Passed combat roster, minion counts, campaign attacks and traits, and automatic full-stat loading for every base creature.',
    );
    await p.key('K', ['control']);
    await p.settle(100);
    assert.equal(await p.setValue('.command-input input', 'Tobias Quill'), 'ok');
    await p.settle(600);
    assert(
      await p.run(
        "(()=>{const result=[...document.querySelectorAll('.command-results button')].find(button=>button.querySelector('.search-kind')?.textContent==='NPC'&&/Tobias Quill/i.test(button.querySelector('strong')?.textContent||''));if(!result)return false;result.click();return true})()",
      ),
    );
    await p.settle(400);
    assert.match(
      await p.run("document.querySelector('.reference-combat').innerText"),
      /Silence-Glove Strike/,
    );
    assert.match(
      await p.run("document.querySelector('.reference-combat').innerText"),
      /Pack Tactics/,
    );
    await p.shot(path.join(out, 'npc-combat-profile.png'));
    await p.key('Escape');
    await p.settle(100);
    console.log('Passed NPC reference → named combat profile with full campaign abilities.');
  } finally {
    p.close();
  }
  console.log('All workspace and search regressions passed.');
});
