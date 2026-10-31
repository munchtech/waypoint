import {z} from 'zod';
import MarkdownIt from 'markdown-it';
export const displaySchema=z.object({title:z.string().max(200),body:z.string().max(30000)}).strict();
const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
// Players see formatted words only: raw HTML stays escaped, links show as plain text, and images show their alt text.
const markdown=new MarkdownIt({html:false,linkify:false,breaks:true});
markdown.renderer.rules.link_open=()=>'';
markdown.renderer.rules.link_close=()=>'';
markdown.renderer.rules.image=(tokens,index)=>escape(tokens[index].content);
export function playerDocument(value:unknown){
 const data=displaySchema.parse(value);
 return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>Waypoint · Player display</title><style>body{margin:0;background:#152b25;color:#edf1e4;font:20px/1.8 Georgia,serif}main{max-width:900px;margin:auto;padding:70px 55px}small{font:12px system-ui;letter-spacing:3px;color:#bacb9c}h1{font-weight:normal;font-size:46px;line-height:1.2}article{overflow-wrap:anywhere}article p{margin:0 0 .9em}article h2,article h3{font-weight:normal;color:#f4e7c1;margin:1.2em 0 .4em}article blockquote{margin:0 0 .9em;padding-left:20px;border-left:3px solid #6f8f6a;color:#dbe5c9;font-style:italic}article ul,article ol{margin:0 0 .9em;padding-left:1.4em}article strong{color:#ffffff}article table{border-collapse:collapse;margin:0 0 1em;font-size:.9em}article th,article td{border:1px solid #3f5d52;padding:6px 14px;text-align:left}article th{background:#1d3a32;color:#f4e7c1;font-weight:normal}footer{margin-top:70px;color:#a6b795;font:12px system-ui}</style></head><body><main><small>WAYPOINT · YOUR SHARED STORY</small><h1>${escape(data.title)}</h1><article>${markdown.render(data.body)}</article><footer>Presented by your dungeon master</footer></main></body></html>`;
}
