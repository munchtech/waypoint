import type { WikiPage } from './memory';

// Book pages keep the book's own headings ("19. HUSHMAN TOBIAS QUILL", "THE QUIET COURT"). On screen a person's list number
// goes and capitals become Title Case; section numbers ("1.4", "B.6") stay, since the book refers to them.
const small = /^(?:a|an|and|as|at|but|by|for|from|in|into|of|on|or|the|to|under|with)$/;
const kept = /^(?:[IVX]+|DM|PC|NPC|XP|HP|AC|DC)$/;
function decap(text: string) {
  if (!/\p{Lu}{4}/u.test(text) || /\p{Ll}/u.test(text)) return text;
  const words = text.split(/(\s+)/);
  return words
    .map((word, i) => {
      const bare = word.replace(/[^\p{L}]/gu, '');
      if (!bare || kept.test(bare)) return word;
      const low = word.toLocaleLowerCase(),
        before = words.slice(0, i).join('').trimEnd();
      if (small.test(low) && before && !/[:([]$/.test(before)) return low;
      return low.replace(/(^|[^\p{L}'’])(\p{L})/gu, (_, a, b) => a + b.toLocaleUpperCase());
    })
    .join('');
}
export function pageName(page: Pick<WikiPage, 'title' | 'kind'>) {
  const title = page.kind === 'Lore' ? page.title : page.title.replace(/^\d+\.\s+/, '');
  // A bracketed note or a quotation is judged apart from the name it follows: "PELLMOOR (Village)".
  return title
    .split(/(\([^)]*\)|"[^"]*"|“[^”]*”)/)
    .map((part) => (/^["“]/.test(part) ? part : decap(part)))
    .join('');
}
