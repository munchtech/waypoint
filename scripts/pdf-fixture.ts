// Small synthetic PDF for extraction checks, without third-party book content.
export function pdfFixture(text='Moonstone bridge hides a silver key.',blank=false){
 const lines=text.match(/.{1,80}/g)||[''];
 const stream=blank?'':`BT /F1 5 Tf 72 720 Td ${lines.map((line,i)=>(i?'0 -2 Td ':'')+`(${line.replace(/[()\\]/g,'\\$&')}) Tj`).join(' ')} ET`;
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`];
 let out='%PDF-1.4\n';const offsets=[0];
 objects.forEach((body,index)=>{offsets.push(Buffer.byteLength(out));out+=`${index+1} 0 obj\n${body}\nendobj\n`});
 const xref=Buffer.byteLength(out);out+=`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n ').join('\n')}\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
 return Buffer.from(out);
}
