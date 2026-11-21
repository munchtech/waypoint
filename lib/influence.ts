// The 2024 Influence action (Player's Handbook, Rules Glossary). A willing creature needs no check and an unwilling one
// refuses; a hesitant one is checked against DC 15 or its Intelligence score, whichever is higher. A Friendly creature gives
// Advantage on the check and a Hostile one Disadvantage, and a failed urging waits a day before it can be tried the same way.

// Reads the Intelligence score from stat block text: the library's "INT 10 (+0)" line, or a campaign block's ability table
// ("| STR | DEX | CON | INT | WIS | CHA |", a separator row, then the scores).
export function intelligenceOf(text: string): number | undefined {
  const inline = text.match(/\bINT\s+(\d{1,2})\b/);
  if (inline) return Number(inline[1]);
  const lines = text.split('\n');
  for (let i = 0; i + 2 < lines.length; i++) {
    const column = lines[i]
      .split('|')
      .map((cell) => cell.trim())
      .indexOf('INT');
    if (column < 0) continue;
    const score = lines[i + 2].split('|')[column]?.match(/\d+/);
    if (score) return Number(score[0]);
  }
  return undefined;
}

export const influenceDc = (intelligence: number) => Math.max(15, intelligence);
