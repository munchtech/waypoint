const headings='SAY NOW|ASK|IF THEY SUCCEED|IF THEY FAIL|NEXT OPENING';
export function responseSections(body:string){
 const matches=[...body.matchAll(new RegExp(`(?:^|\\n|[ \\t]+)(${headings}):[ \\t]*`,'g'))];
 if(matches.length<2)return [{label:'',text:body}];
 const sections:{label:string;text:string}[]=[];
 const intro=body.slice(0,matches[0].index).trim();if(intro)sections.push({label:'',text:intro});
 matches.forEach((m,i)=>sections.push({label:m[1],text:body.slice(m.index!+m[0].length,matches[i+1]?.index??body.length).trim()}));
 return sections;
}
