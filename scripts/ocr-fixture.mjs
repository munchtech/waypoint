import {createCanvas} from '@napi-rs/canvas';
// An image-only PDF: no text layer for the extractor to fall back to.
export function scannedFixture(){
 const canvas=createCanvas(1200,500),ctx=canvas.getContext('2d');
 ctx.fillStyle='white';ctx.fillRect(0,0,1200,500);ctx.fillStyle='black';ctx.font='42px Arial';
 ctx.fillText('The silver key opens the moonstone gate.',50,130);
 ctx.fillText('Captain Mira waits beside the old bridge.',50,220);
 const image=canvas.toBuffer('image/jpeg');
 const command='q 600 0 0 250 0 0 cm /Im0 Do Q';
 const objects=[Buffer.from('<< /Type /Catalog /Pages 2 0 R >>'),Buffer.from('<< /Type /Pages /Kids [3 0 R] /Count 1 >>'),Buffer.from('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 250] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>'),Buffer.concat([Buffer.from(`<< /Type /XObject /Subtype /Image /Width 1200 /Height 500 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.length} >>\nstream\n`),image,Buffer.from('\nendstream')]),Buffer.from(`<< /Length ${command.length} >>\nstream\n${command}\nendstream`)];
 const chunks=[Buffer.from('%PDF-1.4\n')],offsets=[0];let size=chunks[0].length;
 objects.forEach((body,i)=>{offsets.push(size);const b=Buffer.concat([Buffer.from(`${i+1} 0 obj\n`),body,Buffer.from('\nendobj\n')]);chunks.push(b);size+=b.length});
 chunks.push(Buffer.from(`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n ').join('\n')}\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${size}\n%%EOF`));return Buffer.concat(chunks);
}
