// Maps: add a map image, place, name, link, share, drag and nudge pins, show the map to players, and follow a wiki page's
// "On the map" back to its pin. Checks the layout at 1420 and 900 wide.
//   node_modules/electron/dist/electron.exe scripts/ui-maps.cjs [--out dir]
const fs = require('node:fs'),
  path = require('node:path'),
  assert = require('node:assert/strict');
const { openSession, run, sleep } = require('./ui-harness.cjs');
const { navigator } = require('./ui-nav.cjs');

run(async (args) => {
  const out = args.out ? path.resolve(args.out) : null;
  if (out) fs.mkdirSync(out, { recursive: true });
  const s = await openSession({ fixture: 'seventh-bell' });
  const wait = async (expr, what = expr, ms = 6000) => {
    for (let t = 0; t < ms; t += 100) {
      if (await s.run(expr)) return;
      await sleep(100);
    }
    throw new Error('Timed out waiting for ' + what);
  };
  const go = navigator(s.run, wait);
  const shot = async (name) => out && s.shot(path.join(out, name + '.png'));
  const campaign = () => s.state.snapshot.campaigns.find((c) => c.id === s.state.snapshot.active);
  const maps = () => campaign().memory.maps || [];
  const noOverflow = async (where) =>
    assert(
      await s.run(
        "document.documentElement.scrollWidth<=document.documentElement.clientWidth+2&&[...document.querySelectorAll('.map-side,.map-tools,.maps-bar')].every(e=>e.scrollWidth<=e.clientWidth+2)",
      ),
      'Horizontal overflow ' + where,
    );
  // A click or drag as real mouse input, at a point given as fractions of the map image.
  const stagePoint = async (fx, fy) => {
    const r = await s.run(
      "(()=>{const r=document.querySelector('.map-stage').getBoundingClientRect();return {x:r.left,y:r.top,w:r.width,h:r.height}})()",
    );
    return { x: Math.round(r.x + r.w * fx), y: Math.round(r.y + r.h * fy) };
  };
  const mouse = (type, p, modifiers = []) =>
    s.win.webContents.sendInputEvent({
      type,
      x: p.x,
      y: p.y,
      button: 'left',
      clickCount: 1,
      modifiers,
    });
  try {
    const page = campaign().memory.pages.find((p) => p.kind === 'NPC');
    assert(page, 'The fixture has an NPC page');
    await go('Maps');
    await wait("document.querySelector('.maps-empty h2')?.textContent==='Add your first map'");
    await noOverflow('on the empty page');
    await shot('maps-empty-1420');

    // Add a map: a 3000×1500 PNG drawn in the page, so it is shrunk to 2400 wide and stored as WebP.
    await s.run(`(()=>{const c=document.createElement('canvas');c.width=3000;c.height=1500;const g=c.getContext('2d');
      g.fillStyle='#d8cfb4';g.fillRect(0,0,3000,1500);g.fillStyle='#6f8fa3';g.fillRect(0,900,3000,600);
      g.strokeStyle='#4b3b26';g.lineWidth=12;for(let i=0;i<12;i++){g.beginPath();g.arc(400+i*220,500,90,0,6.28);g.stroke()}
      c.toBlob(b=>{const dt=new DataTransfer();dt.items.add(new File([b],'old_harbour-chart.png',{type:'image/png'}));
      const i=document.querySelector('input[type=file][accept^="image/png"]');i.files=dt.files;i.dispatchEvent(new Event('change',{bubbles:true}))},'image/png')})()`);
    await wait(
      "document.querySelector('.map-stage img')?.complete&&document.querySelector('.map-stage img').naturalWidth>0",
      'the map image',
    );
    assert.equal(
      await s.run('document.querySelector(\'input[aria-label="Map name"]\').value'),
      'old harbour chart',
    );
    await s.settle(300);
    let m = maps()[0];
    assert.match(m.image, /^data:image\/webp;base64,/);
    assert.deepEqual([m.width, m.height], [2400, 1200]);

    // Place a pin with Add pin and a click on the map.
    assert.equal(await s.clickText('Add pin'), 'ok');
    await s.settle(100);
    let at = await stagePoint(0.3, 0.4);
    mouse('mouseDown', at);
    mouse('mouseUp', at);
    await wait("!!document.querySelector('.pin-editor')", 'the pin editor');
    await s.settle(200);
    let p = maps()[0].pins[0];
    assert(
      Math.abs(p.x - 0.3) < 0.01 && Math.abs(p.y - 0.4) < 0.01,
      'Pin placed where clicked: ' + p.x + ',' + p.y,
    );
    assert.equal(p.shared, false, 'A new pin is hidden from players');

    // Name it, link the NPC page, and share it.
    assert.equal(
      await s.setValue('.pin-editor label:nth-of-type(1) input', 'Smugglers <quay>'),
      'ok',
    );
    assert.equal(await s.setValue('.pin-editor select', page.id), 'ok');
    assert.equal(
      await s.setValue('.pin-editor textarea', 'The tithe boat docks here at night.'),
      'ok',
    );
    await s.run("document.querySelector('.pin-editor input[type=checkbox]').click()");
    await s.settle(250);
    p = maps()[0].pins[0];
    assert.deepEqual([p.label, p.pageId, p.shared], ['Smugglers <quay>', page.id, true]);
    assert.equal(
      await s.run("document.querySelector('.map-pin.selected span').textContent"),
      'Smugglers <quay>',
    );

    // A second pin stays hidden.
    await s.clickText('Add pin');
    await s.settle(100);
    at = await stagePoint(0.7, 0.75);
    mouse('mouseDown', at);
    mouse('mouseUp', at);
    await wait('document.querySelectorAll(".map-pin").length===2', 'the second pin');
    await s.settle(200);
    assert.equal(maps()[0].pins.length, 2);

    // Drag the first pin from (0.3, 0.4) to (0.5, 0.6). The pin's tip is the bottom centre of its button.
    const tip = await s.run(
      "(()=>{const r=document.querySelectorAll('.map-pin')[0].getBoundingClientRect();return {x:Math.round(r.left+r.width/2),y:Math.round(r.bottom-6)}})()",
    );
    const to = await stagePoint(0.5, 0.6);
    mouse('mouseDown', tip);
    await sleep(50);
    for (let i = 1; i <= 6; i++) {
      mouse(
        'mouseMove',
        {
          x: Math.round(tip.x + ((to.x - tip.x) * i) / 6),
          y: Math.round(tip.y + ((to.y - tip.y) * i) / 6),
        },
        ['leftButtonDown'],
      );
      await sleep(40);
    }
    mouse('mouseUp', to);
    await s.settle(300);
    p = maps()[0].pins[0];
    assert(
      Math.abs(p.x - 0.5) < 0.02 && Math.abs(p.y - 0.6) < 0.02,
      'Pin dragged: ' + p.x + ',' + p.y,
    );
    const dragged = { x: p.x, y: p.y };

    // Nudge it with the arrow keys.
    await s.run("document.querySelectorAll('.map-pin')[0].focus()");
    await s.key('ArrowRight');
    await s.key('ArrowDown', ['shift']);
    await s.settle(200);
    p = maps()[0].pins[0];
    assert(
      Math.abs(p.x - (dragged.x + 0.005)) < 1e-6 && Math.abs(p.y - (dragged.y + 0.02)) < 1e-6,
      'Arrow keys nudge',
    );

    // Show to players: the image and the shared pin's name, and nothing of the hidden pin or the note.
    await s.clickText('Show to players');
    await wait(
      '/Showing old harbour chart/.test(document.querySelector(".maps-view [role=status]")?.textContent||"")',
      'the show message',
    );
    assert.equal(s.state.player.image, maps()[0].image);
    assert.deepEqual(s.state.player.pins, [{ x: p.x, y: p.y, label: 'Smugglers <quay>' }]);
    assert(!JSON.stringify(s.state.player).includes('tithe boat'), 'DM notes stay hidden');

    // Zoom in: the map grows inside its scroll area, and the page does not scroll sideways.
    const before = await s.run(
      "document.querySelector('.map-stage').getBoundingClientRect().width",
    );
    await s.run('document.querySelector(\'button[aria-label="Zoom in"]\').click()');
    await s.settle(150);
    const after = await s.run("document.querySelector('.map-stage').getBoundingClientRect().width");
    assert(Math.abs(after / before - 1.5) < 0.02, 'Zoom 150%: ' + after / before);
    await noOverflow('at 150% zoom');
    await s.run('document.querySelector(\'button[aria-label="Zoom out"]\').click()');
    await s.run("[...document.querySelectorAll('.map-pin')][0].click()");
    await s.settle(200);
    await noOverflow('at 1420');
    await shot('maps-pins-1420');
    await s.resize(900, 760);
    await noOverflow('at 900');
    await shot('maps-pins-900');
    await s.resize(1420, 940);

    // Open page goes to the wiki page; the reader's "On the map" comes back to the pin.
    const shown = await s.run(
      "document.querySelector('.pin-editor select').selectedOptions[0].textContent.split(' · ')[0]",
    );
    assert.equal(await s.clickText('Open page'), 'ok');
    await wait(
      "document.querySelector('.breadcrumb span:last-of-type')?.textContent==='Wiki editor'",
      'the wiki editor',
    );
    await go('Campaign hub');
    await s.setValue('input[aria-label="Search campaign reader"]', shown);
    await s.settle(300);
    assert.equal(
      await s.run(
        `(()=>{const b=[...document.querySelectorAll('.reader-contents button')].find(b=>b.textContent.includes(${JSON.stringify(shown)}));if(!b)return 'MISSING';b.click();return 'ok'})()`,
      ),
      'ok',
    );
    await wait(
      "[...document.querySelectorAll('.reader-related h3')].some(h=>h.textContent==='On the map')",
      'On the map in the reader',
    );
    assert.equal(
      await s.clickText('old harbour chart · Smugglers <quay>', { within: '.campaign-reader' }),
      'ok',
    );
    await wait(
      "document.querySelector('.breadcrumb span:last-of-type')?.textContent==='Maps'&&!!document.querySelector('.map-pin.selected')",
      'the pin back on the map',
    );
    assert.equal(
      await s.run("document.querySelector('.pin-editor label:nth-of-type(1) input').value"),
      'Smugglers <quay>',
    );

    // Done closes the pin editor.
    await s.run("document.querySelector('.pin-editor .text-button').click()");
    // Remove a pin, then the map, with its confirmation.
    await s.run("[...document.querySelectorAll('.map-pin')][1].click()");
    await s.settle(100);
    assert.equal(await s.clickText('Remove pin'), 'ok');
    await s.settle(200);
    assert.equal(maps()[0].pins.length, 1);
    assert.equal(await s.clickText('Remove this map'), 'ok');
    await s.settle(100);
    assert.match(
      await s.run("document.querySelector('.map-remove p').textContent"),
      /A restore point can bring it back/,
    );
    assert.equal(await s.clickText('Keep it'), 'ok');
    await s.settle(100);
    assert.equal(maps().length, 1);
    await s.clickText('Remove this map');
    await s.settle(100);
    assert.equal(await s.clickText('Remove map'), 'ok');
    await wait("!!document.querySelector('.maps-empty')", 'the empty page after removing');
    await s.settle(200);
    assert.equal(maps().length, 0);
    console.log(
      'Maps passed: add and shrink an image, place, name, link, share, drag and nudge pins, show shared pins only, zoom, open the page and come back from the reader, remove pin and map, no overflow at 1420 or 900.',
    );
  } catch (error) {
    if (out) await s.shot(path.join(out, 'failure.png'));
    throw error;
  } finally {
    s.close();
  }
});
