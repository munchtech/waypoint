// Screenshot tour: walks every screen and the main dialogs, saving one PNG per state.
//   node_modules/electron/dist/electron.exe scripts/ui-tour.cjs --out shots/after [--width 1420] [--height 940]
//     [--fixture demo|seventh-bell|<file>] [--only <name fragment>] [--compare shots/before]
// With --compare, each PNG is compared pixel for pixel with the same name in the other folder.
const fs=require('node:fs'),path=require('node:path');
const {nativeImage}=require('electron');
const {openSession,runStates,tourStates,run}=require('./ui-harness.cjs');
run(async args=>{
 const out=path.resolve(args.out||'ui-tour'),width=Number(args.width||1420),height=Number(args.height||940),fixture=args.fixture||'demo';
 fs.mkdirSync(out,{recursive:true});
 const list=args.only?tourStates.filter(s=>s.name.includes(args.only)):tourStates;
 const s=await openSession({width,height,fixture,build:args.build?path.resolve(args.build):undefined});
 let different=0,compared=0;
 const results=await runStates(s,list,async(state,info)=>{
  const file=path.join(out,state.name+'.png');await s.shot(file);
  let note='';
  if(args.compare){
   const other=path.join(path.resolve(args.compare),state.name+'.png');
   if(fs.existsSync(other)){
    const a=nativeImage.createFromPath(file),b=nativeImage.createFromPath(other),sa=a.getSize(),sb=b.getSize();
    compared++;
    if(sa.width!==sb.width||sa.height!==sb.height){different++;note=' SIZE '+sa.width+'x'+sa.height+' vs '+sb.width+'x'+sb.height}
    else{
     const x=a.toBitmap(),y=b.toBitmap();let n=0;for(let i=0;i<x.length;i+=4)if(x[i]!==y[i]||x[i+1]!==y[i+1]||x[i+2]!==y[i+2])n++;
     if(n){different++;note=' DIFF '+n+' px ('+(100*n/(sa.width*sa.height)).toFixed(3)+'%)'}else note=' identical';
    }
   }else note=' (no baseline)';
  }
  console.log(state.name.padEnd(26),info.missing.length?'MISSING '+info.missing.join(','):'ok',info.alive?'':'APP-GONE',note);
 });
 const missing=results.filter(r=>r.missing.length||!r.alive);
 console.log(`${results.length} states captured at ${width}x${height} in ${out}`+(args.compare?`; ${compared} compared, ${different} different`:'')+(missing.length?`; ${missing.length} with missing controls`:''));
 s.close();
 if(missing.length||different)process.exitCode=1;
});
