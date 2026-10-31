// Computed-style regression check. Renders two builds side by side through the same states and compares
// every element's computed style, box position and size, including ::before, ::after and ::placeholder.
//   node_modules/electron/dist/electron.exe scripts/ui-styles.cjs --a <baseline desktop/build copy> [--b desktop/build]
//     [--fixture demo|seventh-bell] [--widths 1700,1420,1150,1020,900,760,600] [--height 940] [--pseudo] [--allstates]
// --pseudo also forces :hover, :focus/:focus-visible and :active on every interactive element (Chrome DevTools Protocol).
// A clean run means the stylesheet change cannot be seen on any compared screen. Scrollbar styling and
// animation are not computed styles; compare the ui-tour screenshots for those.
const path=require('node:path');
const {root,openSession,runStates,tourStates,run}=require('./ui-harness.cjs');
const fingerprintJS=`(()=>{
 const hash=s=>{let h1=0xdeadbeef,h2=0x41c6ce57;for(let i=0;i<s.length;i++){const c=s.charCodeAt(i);h1=Math.imul(h1^c,2654435761);h2=Math.imul(h2^c,1597334677)}h1=Math.imul(h1^(h1>>>16),2246822507)^Math.imul(h2^(h2>>>13),3266489909);h2=Math.imul(h2^(h2>>>16),2246822507)^Math.imul(h1^(h1>>>13),3266489909);return (4294967296*(2097151&h2)+(h1>>>0)).toString(36)};
 const detail=new Map();const interactive='button,a,input,select,textarea,summary,[tabindex],[role=button]';
 const describe=(el,pseudo)=>{
  const cs=getComputedStyle(el,pseudo||null);const parts=[];
  // Custom properties are skipped: anything that reads one shows up through the resolved value of the property that uses it.
  for(let i=0;i<cs.length;i++){const p=cs[i];if(p.startsWith('--'))continue;parts.push(p+':'+cs.getPropertyValue(p).replace(/file:\\/\\/\\/[^")]*\\/renderer\\//g,'R/'))}
  if(!pseudo){const r=el.getBoundingClientRect();parts.push('rect:'+[r.x,r.y,r.width,r.height].map(v=>Math.round(v*100)/100).join(','))}
  return parts.join('\\n');
 };
 const out=[];
 const visit=(el,key)=>{
  const s=describe(el);detail.set(key,s);out.push([key,hash(s)]);
  for(const pseudo of ['::before','::after','::placeholder']){
   const c=getComputedStyle(el,pseudo).content;
   if(pseudo==='::placeholder'?(el.placeholder):(c&&c!=='none'&&c!=='normal')){const ps=describe(el,pseudo);detail.set(key+pseudo,ps);out.push([key+pseudo,hash(ps)])}
  }
  let i=0;for(const child of el.children){if(['SCRIPT','STYLE','NOSCRIPT'].includes(child.tagName))continue;visit(child,key+'.'+i++)}
 };
 visit(document.body,'b');
 const label=key=>{let el=document.body;const idx=key.split('::')[0].split('.').slice(1).map(Number);const names=['body'];for(const i of idx){el=[...el.children].filter(c=>!['SCRIPT','STYLE','NOSCRIPT'].includes(c.tagName))[i];if(!el)break;names.push(el.tagName.toLowerCase()+(typeof el.className==='string'&&el.className?'.'+el.className.trim().split(/\\s+/).join('.'):''))}return names.slice(-4).join(' > ')+(key.includes('::')?'::'+key.split('::')[1]:'')};
 window.__fp={detail,label,hash,describe,interactive};
 return out;
})()`;
// Fingerprint of an interactive element and its subtree, used after forcing a pseudo-class on it.
const pseudoFingerprintJS=index=>`(()=>{const {hash,describe,interactive}=window.__fp;const el=document.querySelectorAll(interactive)[${index}];if(!el)return null;const parts=[];const walk=(e,n)=>{if(n>40)return;parts.push(describe(e));for(const c of e.children)walk(c,n+1)};walk(el,0);return {h:hash(parts.join('|')),label:(el.tagName.toLowerCase()+'.'+(typeof el.className==='string'?el.className.trim().split(/\\s+/).join('.'):'')+' "'+el.textContent.trim().slice(0,24)+'"')}})()`;
async function forceCompare(a,b,pseudoSets){
 const mismatches=[];let compared=0;
 for(const w of [a,b]){const d=w.win.webContents.debugger;if(!d.isAttached())d.attach('1.3');await d.sendCommand('DOM.enable');await d.sendCommand('CSS.enable')}
 const nodes=[];
 for(const w of [a,b]){const d=w.win.webContents.debugger;const doc=await d.sendCommand('DOM.getDocument',{depth:-1});const found=await d.sendCommand('DOM.querySelectorAll',{nodeId:doc.root.nodeId,selector:await w.run('window.__fp.interactive')});nodes.push(found.nodeIds)}
 const count=Math.min(nodes[0].length,nodes[1].length);
 if(nodes[0].length!==nodes[1].length)mismatches.push({what:'interactive element count',a:nodes[0].length,b:nodes[1].length});
 for(const set of pseudoSets)for(let i=0;i<count;i++){
  const res=[];
  for(let k=0;k<2;k++){const w=k?b:a,d=w.win.webContents.debugger;
   await d.sendCommand('CSS.forcePseudoState',{nodeId:nodes[k][i],forcedPseudoClasses:set});
   res.push(await w.run(pseudoFingerprintJS(i)));
   await d.sendCommand('CSS.forcePseudoState',{nodeId:nodes[k][i],forcedPseudoClasses:[]});}
  compared++;
  if(res[0]&&res[1]&&res[0].h!==res[1].h)mismatches.push({what:':'+set.join(':')+' on '+res[0].label});
 }
 return {compared,mismatches};
}
run(async args=>{
 const height=Number(args.height||940),fixture=args.fixture||'demo';
 const widths=String(args.widths||'1700,1420,1150,1020,900,760,600').split(',').map(Number);
 const buildA=path.resolve(args.a||'desktop/build-baseline'),buildB=path.resolve(args.b||path.join(root,'desktop/build'));
 const a=await openSession({build:buildA,width:widths[0],height,fixture}),b=await openSession({build:buildB,width:widths[0],height,fixture});
 let elements=0,pseudoChecks=0,problems=0,states=0;
 for(const width of widths){
  await a.resize(width,height);await b.resize(width,height);
  const list=(args.allstates||width===1420||width===900)?tourStates:tourStates.filter(s=>s.view);
  const seen=[];
  for(const state of list){
   const stepResults=[];
   for(const w of [a,b]){const r=await runStates(w,[{...state,close:false}],null);stepResults.push(r[0])}
   const fa=await a.run(fingerprintJS),fb=await b.run(fingerprintJS);
   states++;elements+=fa.length;
   const mapB=new Map(fb);const bad=[];
   if(fa.length!==fb.length)bad.push({what:'element count',a:fa.length,b:fb.length});
   for(const [key,h] of fa){if(mapB.has(key)&&mapB.get(key)!==h)bad.push({key})}
   if(args.pseudo&&(width===1420||width===900)){const r=await forceCompare(a,b,[['hover'],['focus','focus-visible'],['active']]);pseudoChecks+=r.compared;for(const m of r.mismatches)bad.push(m)}
   let shown=0;
   for(const m of bad){
    problems++;if(shown++>=6)continue;
    if(m.key){
     const [da,db]=[await a.run(`window.__fp.detail.get(${JSON.stringify(m.key)})`),await b.run(`window.__fp.detail.get(${JSON.stringify(m.key)})`)];
     const la=da.split('\n'),lb=new Map(db.split('\n').map(l=>[l.slice(0,l.indexOf(':')),l.slice(l.indexOf(':')+1)]));
     const diffs=la.map(l=>[l.slice(0,l.indexOf(':')),l.slice(l.indexOf(':')+1)]).filter(([p,v])=>lb.get(p)!==v).slice(0,6).map(([p,v])=>`${p}: ${v} -> ${lb.get(p)}`);
     console.log(`  [${width}px ${state.name}] ${await a.run(`window.__fp.label(${JSON.stringify(m.key)})`)}\n      ${diffs.join('\n      ')}`);
    }else console.log(`  [${width}px ${state.name}] ${JSON.stringify(m)}`);
   }
   seen.push(state.name+(bad.length?`:${bad.length}`:''));
   if(state.close)for(const w of [a,b])await runStates(w,[{name:'close',steps:[['key','Escape'],['wait',200]]}],null);
  }
  console.log(`${String(width).padStart(5)}px  ${list.length} states  ${seen.filter(s=>s.includes(':')).length?'DIFFERENCES in '+seen.filter(s=>s.includes(':')).join(', '):'identical'}`);
 }
 console.log(`Compared ${states} states and ${elements} element fingerprints${args.pseudo?` plus ${pseudoChecks} forced hover/focus/active checks`:''}: ${problems} differences.`);
 a.close();b.close();if(problems)process.exitCode=1;
});
