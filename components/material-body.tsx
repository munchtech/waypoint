import { responseSections, textBlocks } from '../lib/response-sections';
import InlineMarks from './inline-marks';
// Plain runs keep their line breaks; Markdown tables (a card's paper trackers) render as tables.
function Blocks({ text, Plain }: { text: string; Plain: 'p' | 'div' }) {
  return (
    <>
      {textBlocks(text).map((b, i) =>
        b.kind === 'table' ? (
          <div className="book-table card-table" key={i}>
            <table>
              <thead>
                <tr>
                  {b.head.map((h, k) => (
                    <th key={k}>
                      <InlineMarks text={h} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {b.rows.map((r, k) => (
                  <tr key={k}>
                    {r.map((c, n) => (
                      <td key={n}>
                        <InlineMarks text={c} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
