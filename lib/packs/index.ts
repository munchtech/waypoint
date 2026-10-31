// Update packs that ship with Waypoint. Each is offered only to the campaign it was written for, and loads on demand.
export const bundledPacks:{id:string;names:string[];ids:string[];load:()=>Promise<unknown>}[]=[
 {id:'seventh-bell-v6',names:['the seventh bell'],ids:['the-seventh-bell-corvane-v5'],load:()=>import('./seventh-bell-v6.json').then(m=>m.default)},
];
