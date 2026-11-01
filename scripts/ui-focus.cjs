// Keyboard and focus check for every dialog and for Live mode.
//   node_modules/electron/dist/electron.exe scripts/ui-focus.cjs [--fixture demo|seventh-bell]
// For each dialog: where focus lands on open, whether Tab and Shift+Tab stay inside it, whether Escape closes it
// and whether focus returns to the control that opened it. For Live mode: the first Tab stops through the desk.
const {openSession,run,sleep}=require('./ui-harness.cjs');
const describeJS=`(()=>{const e=document.activeElement;if(!e||e===document.body)return 'body';const name=e.getAttribute('aria-label')||(e.textContent||'').trim().slice(0,28)||e.getAttribute('placeholder')||e.getAttribute('title')||'';return e.tagName.toLowerCase()+(e.id?'#'+e.id:'')+' "'+name+'"'})()`;
const insideJS=`(()=>{const e=document.activeElement;return !!e&&!!e.closest('.modal,dialog')})()`;
const dialogs=[
 {name:'Edit session plan',pre:[['nav','Session desk']],open:['click','Edit session plan']},
 {name:'Record an event',pre:[['nav','Chronicle']],open:['click','Record an event']},
 {name:'Import recap',pre:[['nav','Chronicle']],open:['click','Import recap']},
 {name:'New campaign',pre:[['nav','Session desk']],open:['click','New campaign']},
 {name:'AI & backups',pre:[['nav','Session desk']],open:['click','AI & backups']},
 {name:'Wrap up session',pre:[['nav','Session desk']],open:['click','Wrap up session']},
 {name:'Quick navigation',pre:[['nav','Session desk']],open:['key','K',['control']],opener:'none'},
];
run(async args=>{
 const s=await openSession({fixture:args.fixture||'demo'});
 const {doStep}=require('./ui-harness.cjs');
 s.win.webContents.focus();
 let problems=0;
 const press=async(key,mods=[])=>{await s.key(key,mods);await sleep(60)};
 for(const d of dialogs){
  for(const step of d.pre)await doStep(s,step);await s.settle(200);
  const opener=await s.run(`(()=>{const T=${JSON.stringify(d.open[1])};const el=[...document.querySelectorAll('button')].find(b=>b.offsetParent!==null&&b.textContent.trim().replace(/\\d+$/,'').trim()===T);if(el)el.focus();return ${JSON.stringify(describeJS)}&&(document.activeElement?document.activeElement.tagName.toLowerCase()+' "'+(document.activeElement.textContent||'').trim().slice(0,24)+'"':'none')})()`);
  await doStep(s,d.open);await sleep(250);
  const landed=await s.run(describeJS);
  const stops=[landed];let escaped=false;
  for(let i=0;i<40;i++){await press('Tab');const inside=await s.run(insideJS);const at=await s.run(describeJS);if(!inside){escaped=true;stops.push('OUTSIDE: '+at);break}if(at===landed&&i>0){break}stops.push(at)}
  await press('Tab',['shift']);await press('Tab',['shift']);const backInside=await s.run(insideJS);
  await press('Escape');await sleep(300);
  const closed=await s.run("!document.querySelector('.modal')&&!document.querySelector('dialog[open]')");
  const returned=await s.run(describeJS);
  const issues=[];
  if(escaped)issues.push('Tab leaves the dialog');if(!backInside)issues.push('Shift+Tab leaves the dialog');if(!closed)issues.push('Escape does not close it');
  if(d.opener!=='none'&&closed&&!returned.includes(d.open[1].slice(0,8)))issues.push('focus did not return to "'+d.open[1]+'" (now '+returned+')');
  problems+=issues.length;
  console.log(`${d.name.padEnd(18)} opener=${opener.padEnd(30)} focus lands on ${landed}\n   ${stops.length} stops: ${stops.slice(0,8).join(' > ')}${stops.length>8?' …':''}\n   after Escape: ${closed?'closed':'STILL OPEN'}, focus on ${returned}${issues.length?'\n   PROBLEMS: '+issues.join('; '):''}`);
  if(!closed){await s.run("document.querySelector('.modal-close')?.click()");await sleep(200)}
 }
 // Rules library: arrow keys walk the results; the book list closes with Escape and gives focus back.
 await doStep(s,['nav','Rules library']);await s.settle(800);
 await s.run("document.querySelector('.rule-result').focus()");
 const resultIndex=()=>s.run("[...document.querySelectorAll('.rule-result')].indexOf(document.activeElement)");
 await press('ArrowDown');await press('ArrowDown');const walked=await resultIndex();
 await press('End');const atEnd=await s.run("[...document.querySelectorAll('.rule-result')].indexOf(document.activeElement)===document.querySelectorAll('.rule-result').length-1");
 await press('Home');const atHome=await resultIndex();
 await s.run("document.querySelector('.rules-books>button').click()");await sleep(250);
 const booksOpen=await s.run("!!document.querySelector('#rules-book-panel')&&document.activeElement.id==='book-search'");
 await press('Escape');await sleep(250);
 const booksClosed=await s.run("!document.querySelector('#rules-book-panel')&&document.activeElement===document.querySelector('.rules-books>button')");
 const rulesIssues=[];if(walked!==2)rulesIssues.push('ArrowDown reached result '+walked+', expected 2');if(!atEnd)rulesIssues.push('End does not reach the last result');if(atHome!==0)rulesIssues.push('Home does not return to the first result');if(!booksOpen)rulesIssues.push('Browse books should open with the search field focused');if(!booksClosed)rulesIssues.push('Escape should close Browse books and return focus to its button');
 problems+=rulesIssues.length;console.log('\nRules library keyboard: '+(rulesIssues.length?'PROBLEMS: '+rulesIssues.join('; '):'arrow keys, Home/End and the Browse books popover work.'));
 // Live mode: the Tab path from the top of the page.
 await doStep(s,['nav','Session desk']);await doStep(s,['click','Live mode']);await sleep(400);
 await s.run("document.activeElement&&document.activeElement.blur();window.scrollTo(0,0)");
 const path=[];for(let i=0;i<28;i++){await press('Tab');path.push(await s.run(describeJS))}
 console.log('\nLive mode Tab path (first 28 stops):\n   '+path.join('\n   '));
 const live=await s.run("({bannerHidden:getComputedStyle(document.querySelector('.page-heading')||document.body).display==='none',markers:!!document.querySelector('.table-markers.compact'),exit:[...document.querySelectorAll('.topbar button')].some(b=>b.textContent.includes('Exit live mode'))})");
 console.log('Live mode flags:',JSON.stringify(live));
 console.log(problems?`${problems} dialog problems`:'All dialogs trap focus, close on Escape and return focus.');
 s.close();if(problems)process.exitCode=1;
});
