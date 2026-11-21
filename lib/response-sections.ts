const headings = 'SAY NOW|ASK|IF THEY SUCCEED|IF THEY FAIL|NEXT OPENING';
export function responseSections(body: string) {
  const matches = [...body.matchAll(new RegExp(`(?:^|\\n|[ \\t]+)(${headings}):[ \\t]*`, 'g'))];
  if (matches.length < 2) return [{ label: '', text: body }];
  const sections: { label: string; text: string }[] = [];
  const intro = body.slice(0, matches[0].index).trim();
  if (intro) sections.push({ label: '', text: intro });
  matches.forEach((m, i) =>
    sections.push({
      label: m[1],
      text: body.slice(m.index! + m[0].length, matches[i + 1]?.index ?? body.length).trim(),
    }),
  );
  return sections;
}

export type TextBlock =
  | { kind: 'text'; text: string }
  | { kind: 'table'; head: string[]; rows: string[][] };
const tableRule = /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?$/;
const cells = (line: string) =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/(?<!\\)\|$/, '')
    .split(/(?<!\\)\|/)
    .map((c) => c.trim().replace(/\\\|/g, '|'));
// Splits card text into plain runs and Markdown tables (a header row, a --- rule, then rows), so a card's paper tables
// show as tables instead of rows of pipes. Anything that is not a well-formed table stays text.
export function textBlocks(text: string): TextBlock[] {
  const lines = text.split('\n'),
    out: TextBlock[] = [];
  let plain: string[] = [];
  const flush = () => {
    const t = plain.join('\n').trim();
    if (t) out.push({ kind: 'text', text: t });
    plain = [];
  };
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('|') && tableRule.test((lines[i + 1] || '').trim())) {
      const head = cells(lines[i]);
      let j = i + 2;
      const rows: string[][] = [];
      while (j < lines.length && lines[j].trim().startsWith('|')) rows.push(cells(lines[j++]));
      flush();
      out.push({
        kind: 'table',
        head,
        rows: rows.map((r) => head.map((_, k) => r[k] || '')),
      });
      i = j - 1;
    } else plain.push(lines[i]);
  }
  flush();
  return out;
}
