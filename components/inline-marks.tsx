import {useMentionRenderer} from './campaign-links';
// Text written for the table, such as read-aloud lines, often carries Markdown emphasis. Only bold and italic marks
// are formatted; nothing else is interpreted, so this stays safe for any text. Every mention links, since it is read mid-scene.
export default function InlineMarks({text}:{text:string}){
 const mention=useMentionRenderer(undefined,true),seen=new Set<string>();
 const parts=text.split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*)/g);
 return <>{parts.map((part,i)=>part.length>4&&part.startsWith('**')&&part.endsWith('**')?<strong key={i}>{mention(part.slice(2,-2),seen)}</strong>:part.length>2&&part.startsWith('*')&&part.endsWith('*')?<em key={i}>{mention(part.slice(1,-1),seen)}</em>:mention(part,seen))}</>;
}
