import { z } from 'zod';
export type RuleEntry = {
  id: string;
  name: string;
  kind: string;
  source: string;
  edition: string;
  page: string;
  summary: string;
  body: string;
  warnings: string[];
};
export type RuleReference = Pick<
  RuleEntry,
  'id' | 'name' | 'kind' | 'source' | 'edition' | 'page' | 'body'
>;
// Importing 5etools data lives in rules-import.ts so the renderer only carries what it needs to pin a reference.
export function referenceOf(entry: RuleEntry): RuleReference {
  const text = [entry.summary, entry.body, ...entry.warnings.map((w) => 'Note: ' + w)]
    .filter(Boolean)
    .join('\n\n');
  return {
    id: entry.id,
    name: entry.name,
    kind: entry.kind,
    source: entry.source,
    edition: entry.edition,
    page: entry.page,
    body:
      text.length > 8000
        ? text.slice(0, 7900) + '\n\n[Snapshot shortened. Open the library for the full entry.]'
        : text,
  };
}
const field = z.string().max(2000);
// A session pins at most six references, each a snapshot of the entry as it was when pinned.
export const ruleReferencesSchema = z
  .array(
    z.object({
      id: field,
      name: field,
      kind: field,
      source: field,
      edition: field,
      page: field,
      body: z.string().max(8000),
    }),
  )
  .max(6)
  .optional();
export function validRuleReferences(value: unknown) {
  return ruleReferencesSchema.safeParse(value).success;
}
