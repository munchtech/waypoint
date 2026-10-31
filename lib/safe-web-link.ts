/** Only ordinary web URLs may leave the desktop app. Never allow file or app schemes. */
export function safeWebLink(value:string):string|null {
 if(!/^https?:\/\//i.test(value)||/[\u0000-\u0020\u007f]/.test(value))return null;
 try{const url=new URL(value);return (url.protocol==='https:'||url.protocol==='http:')&&!url.username&&!url.password?url.href:null}catch{return null}
}
