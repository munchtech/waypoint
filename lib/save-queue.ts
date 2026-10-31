// Preserve write order even when a transport is slower than the next edit.
export class SaveQueue {
 private tail:Promise<void>=Promise.resolve();
 enqueue(write:()=>Promise<void>){
  const result=this.tail.then(write);
  this.tail=result.catch(()=>{});
  return result;
 }
}
