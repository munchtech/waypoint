// Counts in interface text agree with their noun: "1 entry", "2 entries".
export const count=(n:number,one:string,many=one+'s')=>`${n.toLocaleString()} ${n===1?one:many}`;
