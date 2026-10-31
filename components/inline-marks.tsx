// Text written for the table, such as read-aloud lines, often carries Markdown emphasis. Only bold and italic marks
// are formatted; nothing else is interpreted, so this stays safe for any text.
export default function InlineMarks({text}:{text:string}){
 const parts=text.split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*)/g);
 return <>{parts.map((part,i)=>part.length>4&&part.startsWith('**')&&part.endsWith('**')?<strong key={i}>{part.slice(2,-2)}</strong>:part.length>2&&part.startsWith('*')&&part.endsWith('*')?<em key={i}>{part.slice(1,-1)}</em>:part)}</>;
}
