'use client';
import { createContext, createElement, useContext, useState, type ReactNode } from 'react';
import { Dices } from 'lucide-react';
import { rollOn, rollText, type RollPart, type RollTable } from '../lib/roll-tables';

// A rollable table or list: a Roll button above it, the result beside the button, and the rolled row marked.
const Rolled = createContext<number | null>(null);
export function RollRow({
  as,
  row,
  children,
}: {
  as: 'tr' | 'li';
  row: number;
  children?: ReactNode;
}) {
  const rolled = useContext(Rolled) === row;
  return createElement(
    as,
    { className: rolled ? 'rolled' : undefined, 'aria-current': rolled ? 'true' : undefined },
    children,
  );
}
export function RollParts({ parts }: { parts: RollPart[] }) {
  return (
    <>
      {parts.map((p, i) =>
        typeof p === 'string' ? (
          p
        ) : (
          <b key={i} className="dice-total" title={p.expr + ': ' + p.rolls.join(' + ')}>
            {p.total}
          </b>
        ),
      )}
    </>
  );
}
type Result = { roll: number; index: number; parts: RollPart[] };
export function useRoll(table: RollTable) {
  const [result, setResult] = useState<Result | null>(null);
  const roll = () => {
    const r = rollOn(table);
    setResult({ ...r, parts: r.index >= 0 ? rollText(table.entries[r.index]) : [] });
  };
  return { result, roll };
}
export function RollButton({
  table,
  result,
  roll,
}: {
  table: RollTable;
  result: Result | null;
  roll: () => void;
}) {
  return (
    <div className="roll-bar">
      <button type="button" className="button roll-button" onClick={roll}>
        <Dices size={15} /> Roll d{table.sides}
      </button>
      <p className="roll-out" aria-live="polite">
        {result && (
          <>
            <strong>{result.roll}</strong>{' '}
            {result.index < 0 ? 'No row for this roll.' : <RollParts parts={result.parts} />}
          </>
        )}
      </p>
    </div>
  );
}
export default function RollableTable({
  table,
  children,
}: {
  table: RollTable;
  children: ReactNode;
}) {
  const { result, roll } = useRoll(table);
  return (
    <div className="roll-table">
      <RollButton table={table} result={result} roll={roll} />
      <Rolled.Provider value={result ? result.index : null}>{children}</Rolled.Provider>
    </div>
  );
}
