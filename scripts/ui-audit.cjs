// Layout and accessibility audit for every screen and the main dialogs.
//   node_modules/electron/dist/electron.exe scripts/ui-audit.cjs [--width 1420] [--height 940] [--fixture demo|seventh-bell] [--json out.json]
// Checks per state: WCAG AA contrast of visible text against its effective background (text on gradients is skipped
// and counted), buttons without an accessible name, form fields without a label, text under 11px, and horizontal overflow.
const fs=require('node:fs');
const {openSession,runStates,tourStates,run}=require('./ui-harness.cjs');
const auditJS=`(()=>{
 const parse=c=>{const n=(c.match(/[0-9.]+/g)||[]).map(Number);if(n.length<3||n.some(Number.isNaN))return null;return {r:n[0],g:n[1],b:n[2],a:n.length>3?n[3]:1}};
 const lum=({r,g,b})=>{const f=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)};return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b)};
 const blend=(top,bot)=>({r:top.r*top.a+bot.r*(1-top.a),g:top.g*top.a+bot.g*(1-top.a),b:top.b*top.a+bot.b*(1-top.a),a:1});
 const bgOf=el=>{const stack=[];let e=el;while(e&&e.nodeType===1){if(getComputedStyle(e).backgroundImage!=="none")return null;const c=parse(getComputedStyle(e).backgroundColor);if(c&&c.a>0)stack.push(c);if(c&&c.a>=1)break;e=e.parentElement}let base={r:255,g:255,b:255,a:1};for(let i=stack.length-1;i>=0;i--)base=blend(stack[i],base);return base};
 const low=[],all=[],small=[];let checked=0,gradientSkips=0;
 const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
 let n;while(n=walker.nextNode()){
  const t=n.textContent.trim();if(!t||t.length<2)continue;const el=n.parentElement;if(!el)continue;
  const cs=getComputedStyle(el);if(cs.visibility==='hidden'||cs.display==='none')continue;const rect=el.getBoundingClientRect();if(rect.width===0||rect.height===0)continue;
  if(el.closest('[disabled],.button:disabled'))continue;
  const size=parseFloat(cs.fontSize);if(size<11)small.push({t:t.slice(0,30),size});
  const fg0=parse(cs.color);if(!fg0)continue;const op=parseFloat(cs.opacity||1);
  const bg=bgOf(el);if(!bg){gradientSkips++;continue}const fg=blend({...fg0,a:fg0.a*op},bg);
  const L1=lum(fg),L2=lum(bg);const ratio=(Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05);
  const weight=parseInt(cs.fontWeight,10);const large=size>=24||(size>=18.66&&weight>=700);
  checked++;all.push({t:t.slice(0,30),r:Math.round(ratio*100)/100,size});
  if(ratio<(large?3:4.5))low.push({t:t.slice(0,40),r:Math.round(ratio*100)/100,size,color:cs.color,bg:'rgb('+Math.round(bg.r)+','+Math.round(bg.g)+','+Math.round(bg.b)+')'});
 }
 const visible=e=>e.offsetParent!==null||e.getClientRects().length>0;
 const unnamed=[...document.querySelectorAll('button,[role=button]')].filter(b=>visible(b)&&!b.textContent.trim()&&!b.getAttribute('aria-label')&&!b.getAttribute('title')&&!b.getAttribute('aria-labelledby')).map(b=>b.outerHTML.slice(0,90));
 const unlabeled=[...document.querySelectorAll('input,select,textarea')].filter(i=>visible(i)&&i.type!=='hidden'&&!i.getAttribute('aria-label')&&!i.getAttribute('aria-labelledby')&&!(i.id&&document.querySelector('label[for="'+i.id+'"]'))&&!i.closest('label')).map(i=>i.outerHTML.slice(0,90));
 const doc=document.documentElement;const overflow=doc.scrollWidth>doc.clientWidth+1;
 const main=document.querySelector('main');const mr=main?main.getBoundingClientRect():null;
 const wide=mr?[...main.querySelectorAll('*')].filter(e=>{const r=e.getBoundingClientRect();return visible(e)&&r.width>0&&r.right>mr.right+2&&!e.closest('[aria-hidden=true]')}).slice(0,5).map(e=>(e.getAttribute('class')||e.tagName.toLowerCase())+'|'+Math.round(e.getBoundingClientRect().right)):[];
 return {checked,gradientSkips,lowCount:low.length,low:low.slice(0,6),lowest:all.sort((a,b)=>a.r-b.r).slice(0,3),smallText:small.length,smallSample:small.slice(0,3),unnamedButtons:unnamed.length,unnamedSample:unnamed.slice(0,3),unlabeledInputs:unlabeled.length,unlabeledSample:unlabeled.slice(0,3),overflowX:overflow,wideSample:wide};
})()`;
run(async args=>{
 const width=Number(args.width||1420),height=Number(args.height||940);
 const s=await openSession({width,height,fixture:args.fixture||'demo',build:args.build?require('node:path').resolve(args.build):undefined});
 const report={};let problems=0;
 await runStates(s,tourStates,async(state,info)=>{
  const res=await s.run(auditJS);report[state.name]=res;
  const bad=res.lowCount+res.smallText+res.unnamedButtons+res.unlabeledInputs+(res.overflowX?1:0)+res.wideSample.length;problems+=bad;
  console.log(`${state.name.padEnd(26)} text:${String(res.checked).padStart(4)} low-contrast:${res.lowCount} small:${res.smallText} unnamed-buttons:${res.unnamedButtons} unlabeled-fields:${res.unlabeledInputs} overflow-x:${res.overflowX?'YES':'no'} gradient-skips:${res.gradientSkips}`+(info.missing.length?'  (state not reached: '+info.missing[0]+')':''));
  if(res.lowCount)console.log('   low:',JSON.stringify(res.low));
  if(res.smallText)console.log('   small:',JSON.stringify(res.smallSample));
  if(res.unnamedButtons)console.log('   unnamed:',JSON.stringify(res.unnamedSample));
  if(res.unlabeledInputs)console.log('   unlabeled:',JSON.stringify(res.unlabeledSample));
  if(res.wideSample.length)console.log('   wide:',JSON.stringify(res.wideSample));
 });
 if(args.json)fs.writeFileSync(args.json,JSON.stringify(report,null,1));
 console.log(`Audit at ${width}x${height}: ${problems} findings across ${Object.keys(report).length} states.`);
 s.close();if(problems)process.exitCode=1;
});
