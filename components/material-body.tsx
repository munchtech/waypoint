import { responseSections, textBlocks } from '../lib/response-sections';
import InlineMarks from './inline-marks';
import RollableTable, { RollRow } from './roll-table';
import { dieInHead, rollTable } from '../lib/roll-tables';
// A card's table; one whose first column is a die gets a Roll button (lib/roll-tables).
function CardTable({ head, rows }: { head: string[]; rows: string[][] }) {
  const sides = dieInHead(head[0] || ''),
    table =
      sides &&
      rollTable(
        sides,
        rows.map((r) => r[0] || ''),
        rows.map((r) => r.slice(1).join(' · ')),
      );
  const element = (
    <div className="book-table card-table">
      <table>
        <thead>
          <tr>
            {head.map((h, k) => (
              <th key={k}>
                <InlineMarks text={h} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, k) => (
            <RollRow as="tr" row={table ? k : -1} key={k}>
              {r.map((c, n) => (
                <td key={n}>
                  <InlineMarks text={c} />
                </td>
              ))}
            </RollRow>
          ))}
        </tbody>
      </table>
    </div>
  );
  return table ? <RollableTable table={table}>{element}</RollableTable> : element;
}
// Plain runs keep their line breaks; Markdown tables (a card's paper trackers) render as tables.
function Blocks({ text, Plain }: { text: string; Plain: 'p' | 'div' }) {
  return (
    <>
      {textBlocks(text).map((b, i) =>
        b.kind === 'table' ? (
          <CardTable head={b.head} rows={b.rows} key={i} />
        ) : Plain === 'p' ? (
          <p key={i}>
            <InlineMarks text={b.text} />
          </p>
        ) : (
          <div className="prose card-prose" key={i}>
            <InlineMarks text={b.text} />
          </div>
        ),
      )}
    </>
  );
}
export default function MaterialBody({ body }: { body: string }) {
  return (
    <div className="material-body">
      {responseSections(body).map((section, i) =>
        section.label ? (
          <section
            className={
              'response-section ' + (section.label === 'IF THEY FAIL' ? 'response-cost' : '')
            }
            key={i}
          >
            <h4>{section.label}</h4>
            <Blocks text={section.text} Plain="p" />
          </section>
        ) : (
          <Blocks text={section.text} Plain="div" key={i} />
        ),
      )}
    </div>
  );
}
