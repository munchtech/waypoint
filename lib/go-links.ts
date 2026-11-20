// A `go:<place>` link in campaign text opens a part of Waypoint, so session notes can say where to record something.
export const goPlaces = {
  bargains: 'Bargain log',
  'memory-ledger': 'Memory ledger',
  'world-state': 'World state',
} as const;
export type GoPlace = keyof typeof goPlaces;
export const isGoPlace = (value: string): value is GoPlace =>
  Object.prototype.hasOwnProperty.call(goPlaces, value);
