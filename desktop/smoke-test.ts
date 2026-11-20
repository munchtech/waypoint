// The packaged app's self-check (Waypoint.exe --smoke-test): runs in an isolated data folder once the renderer has loaded,
// prints "Native smoke passed" and quits, or prints "Smoke failed" and exits with code 1.
import { app, type BrowserWindow } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { dataDir, rules, state } from './runtime';
import { route } from './routes';

// Through the renderer's bridge: reads the campaigns, then records, streams and decodes a short synthetic audio clip.
const rendererCheck = `(async()=>{const saved=await window.waypoint.request('/api/campaigns','GET');if(saved.status!==200)throw new Error(JSON.stringify(saved));const created=await window.waypoint.request('/api/recordings/start','POST',JSON.stringify({campaignId:'isolated-test',sessionId:'isolated-session',title:'Synthetic audio test',consent:true}));if(created.status!==200)throw new Error(JSON.stringify(created));const id=created.body.id;const ctx=new AudioContext();await ctx.resume();const osc=ctx.createOscillator();const dest=ctx.createMediaStreamDestination();osc.connect(dest);osc.start();const rec=new MediaRecorder(dest.stream,{mimeType:'audio/webm;codecs=opus'});const chunks=[];rec.ondataavailable=e=>chunks.push(e.data);await new Promise(resolve=>{rec.onstop=resolve;rec.start();setTimeout(()=>rec.stop(),400)});osc.stop();await ctx.close();const bytes=new Uint8Array(await new Blob(chunks).arrayBuffer());let binary='';for(const n of bytes)binary+=String.fromCharCode(n);const written=await window.waypoint.request('/api/recordings/chunk','POST',JSON.stringify({id,sequence:0,data:btoa(binary)}));if(written.status!==200)throw new Error(JSON.stringify(written));const stopped=await window.waypoint.request('/api/recordings/stop','POST',JSON.stringify({id}));if(stopped.status!==200||stopped.body.bytes<100)throw new Error('Audio did not persist');const response=await fetch('waypoint-audio://recording/'+id,{headers:{Range:'bytes=0-15'}});if(response.status!==206||(await response.arrayBuffer()).byteLength!==16)throw new Error('Audio streaming failed');const media=new Audio('waypoint-audio://recording/'+id);media.muted=true;await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Audio decode timed out')),8000);media.onloadeddata=()=>{clearTimeout(timer);resolve(true)};media.onerror=()=>{clearTimeout(timer);reject(new Error('Audio decode failed'))};media.load()});return {id,campaigns:saved.status,audioBytes:stopped.body.bytes,audioStreaming:true,audioDecoded:true,title:document.title};})()`;

export async function runSmokeTest(win: BrowserWindow) {
  const { store, library } = state;
  try {
    const result = await win.webContents.executeJavaScript(rendererCheck);
    const ruleCheck = rules().search({});
    if (ruleCheck.total < 2000) throw new Error('Bundled rules library missing');
    const ruleSpell = rules().search({ query: 'fireball', kind: 'Spell', edition: '2014' });
    if (
      !ruleSpell.entries.length ||
      !rules().get(ruleSpell.entries[0].id).body.includes('Casting time')
    )
      throw new Error('Bundled rules lookup failed');
    Object.assign(result, { rulesEntries: ruleCheck.total });
    const aiSettings = (await route({ path: '/api/ai-settings', method: 'GET' })) as {
      status: number;
      body: { hasKey?: boolean; models?: unknown[] };
    };
    if (
      aiSettings.status !== 200 ||
      aiSettings.body.hasKey ||
      !Array.isArray(aiSettings.body.models) ||
      aiSettings.body.models.length !== 3
    )
      throw new Error('AI settings unavailable');
    const keyless = await route({ path: '/api/generate', method: 'POST', body: '{}' });
    if (keyless.status !== 503) throw new Error('Generation must need a saved key');
    Object.assign(result, { aiSettings: true });
    const listed = (await route({ path: '/api/restore-points', method: 'GET' })) as {
      status: number;
      body: { points?: unknown };
    };
    if (listed.status !== 200 || !Array.isArray(listed.body.points))
      throw new Error('Restore points unavailable');
    const kept = store!.read() as { campaigns: { name: string }[] };
    store!.save({
      ...kept,
      campaigns: kept.campaigns.map((c, i) => (i ? c : { ...c, name: c.name + ' (smoke edit)' })),
    });
    const point = (
      (await route({ path: '/api/restore-points', method: 'GET' })) as {
        body: { points: { id: number }[] };
      }
    ).body.points[0];
    const restored =
      point &&
      (await route({
        path: '/api/restore-points/read',
        method: 'POST',
        body: JSON.stringify({ id: point.id }),
      }));
    store!.save(kept);
    if (
      !restored ||
      restored.status !== 200 ||
      JSON.stringify(restored.body) !== JSON.stringify(kept)
    )
      throw new Error('Restore point round trip failed');
    Object.assign(result, { restorePoints: true });
    // The shipped update pack is read from the app's data folder, and saved campaigns are searchable.
    const packs = (await route({ path: '/api/packs', method: 'GET' })) as {
      status: number;
      body: { packs?: { id: string }[] };
    };
    const shipped = await route({
      path: '/api/packs/read',
      method: 'POST',
      body: JSON.stringify({ id: 'seventh-bell-v7' }),
    });
    if (!packs.body.packs?.some((p) => p.id === 'seventh-bell-v7') || shipped.status !== 200)
      throw new Error('Shipped update pack missing');
    const found = (await route({
      path: '/api/campaigns/search',
      method: 'POST',
      body: JSON.stringify({ query: kept.campaigns[0].name }),
    })) as { status: number; body: { hits?: unknown[] } };
    if (found.status !== 200 || !Array.isArray(found.body.hits))
      throw new Error('Campaign search unavailable');
    Object.assign(result, { packs: true, campaignSearch: true });
    const transcriptFile = path.join(dataDir, 'recordings', result.id + '.transcript.json');
    fs.writeFileSync(
      transcriptFile,
      JSON.stringify({ segments: [{ start: 0, end: 1, text: 'Captain Boss' }] }),
    );
    const revised = await library!.route('save-transcript', {
      id: result.id,
      transcript: {
        revision: 0,
        segments: [{ start: 0, end: 1, text: 'Captain Voss', speaker: 'DM' }],
      },
    });
    if (
      revised.revision !== 1 ||
      library!.list().length !== 1 ||
      !fs
        .readFileSync(
          path.join(dataDir, 'recordings', result.id + '.transcript-revision-0.json'),
          'utf8',
        )
        .includes('Captain Boss')
    )
      throw new Error('Transcript archive failed');
    fs.writeFileSync(
      path.join(dataDir, 'recordings', '22222222-2222-4222-8222-222222222222.json'),
      JSON.stringify({ id: 'malformed' }),
    );
    const audited = await library!.route('list', { campaignId: 'isolated-test' });
    if (audited.recordings.length !== 1 || audited.invalidRecordings !== 1)
      throw new Error('Invalid recording isolation failed');
    for (const width of [900, 1420]) {
      win.setSize(width, 940);
      await new Promise((r) => setTimeout(r, 180));
      const layout = await win.webContents.executeJavaScript(
        `({width:document.documentElement.clientWidth,content:document.documentElement.scrollWidth})`,
      );
      if (layout.content > layout.width + 2)
        throw new Error('Horizontal layout overflow at ' + width);
    }
    await route({
      path: '/api/player/show',
      method: 'POST',
      body: JSON.stringify({
        title: 'Isolated display test',
        body: '<script>test</script> Reviewed content only.',
      }),
    });
    const playerCheck = await state.playerWin!.webContents.executeJavaScript(
      `({bridge:typeof window.waypoint,body:document.body.innerText,scripts:document.scripts.length})`,
    );
    if (
      playerCheck.bridge !== 'undefined' ||
      playerCheck.scripts !== 0 ||
      !playerCheck.body.includes('Reviewed content only.')
    )
      throw new Error('Player isolation failed');
    await route({ path: '/api/player/clear', method: 'POST' });
    console.log('Native smoke passed', JSON.stringify({ ...result, playerIsolation: true }));
    fs.writeFileSync(
      path.join(dataDir, 'smoke-result.json'),
      JSON.stringify({ ...result, playerIsolation: true }),
    );
    app.quit();
  } catch (e) {
    console.error('Smoke failed', e);
    app.exit(1);
  }
}
