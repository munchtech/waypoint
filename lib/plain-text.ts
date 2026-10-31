// A short plain-text preview of Markdown for cards and lists. Structure markers are removed and the words are kept,
// so a card never shows stray asterisks, table pipes or list dashes.
export function plainPreview(markdown:string,limit=160){
 const text=markdown.replace(/\r/g,'').replace(/```[\s\S]*?```/g,' ').split('\n').map(line=>line
  .replace(/^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/,'')
  .replace(/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/,'')
  .replace(/^\s{0,3}#{1,6}\s+/,'')
  .replace(/^\s*>+\s?/,'')
  .replace(/^\s*[-*+]\s+\[[ xX]\]\s+/,'')
  .replace(/^\s*(?:[-*+]|\d+[.)])\s+/,'')
  // table rows keep their filled cells; empty cells and empty rows disappear
  .replace(/^.*\|.*$/,row=>row.split('|').map(cell=>cell.trim()).filter(Boolean).join(' · '))
 ).join(' ')
  .replace(/!?\[([^\]]*)\]\([^)]*\)/g,'$1')
  .replace(/\*\*([^*]+)\*\*|__([^_]+)__/g,'$1$2')
  .replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,;:!?]|$)/g,'$1$2')
  .replace(/(^|[\s(])_([^_\n]+)_(?=[\s).,;:!?]|$)/g,'$1$2')
  .replace(/~~([^~]+)~~/g,'$1')
  .replace(/`([^`]*)`/g,'$1')
  // a mark left open by cutting the text, or never closed in the source
  .replace(/(^|\s)\*+(?=\S)/g,'$1').replace(/\*\*/g,'')
  .replace(/\s+/g,' ').trim();
 if(text.length<=limit)return text;
 const cut=text.slice(0,limit),space=cut.lastIndexOf(' ');
 return (space>limit*0.6?cut.slice(0,space):cut).replace(/[\s,;:·-]+$/,'')+'…';
}
