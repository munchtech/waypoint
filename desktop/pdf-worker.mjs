import {parentPort,workerData} from 'node:worker_threads';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const runtimeDirectory=fileURLToPath(new URL('./ocr-runtime/',import.meta.url)).replace('app.asar'+path.sep,'app.asar.unpacked'+path.sep);
const requireRuntime=createRequire(path.join(runtimeDirectory,'runtime.cjs'));
const {createCanvas,DOMMatrix,ImageData,Path2D}=requireRuntime('@napi-rs/canvas');
globalThis.DOMMatrix??=DOMMatrix;globalThis.ImageData??=ImageData;globalThis.Path2D??=Path2D;
const {getDocument}=await import('./pdfjs/pdf.mjs');
class CanvasFactory{
 create(width,height){const canvas=createCanvas(Math.max(1,Math.ceil(width)),Math.max(1,Math.ceil(height)));return {canvas,context:canvas.getContext('2d')}}
 reset(target,width,height){target.canvas.width=width;target.canvas.height=height}
 destroy(target){target.canvas.width=0;target.canvas.height=0;target.canvas=null;target.context=null}
}
let ocr;
async function recognize(page){
 if(!ocr){const {createWorker}=requireRuntime('tesseract.js');ocr=await createWorker('eng',1,{langPath:path.join(runtimeDirectory,'node_modules/@tesseract.js-data/eng/4.0.0_best_int'),cacheMethod:'none',gzip:true,errorHandler:()=>{}})}
 const base=page.getViewport({scale:1});const scale=Math.min(3,Math.sqrt(6000000/(base.width*base.height)));
 const viewport=page.getViewport({scale});const canvas=createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));
 try{await page.render({canvasContext:canvas.getContext('2d'),viewport,background:'white'}).promise;const {data}=await ocr.recognize(canvas.toBuffer('image/png'));return {text:data.text.trim(),confidence:data.confidence};}
 finally{canvas.width=1;canvas.height=1}
}


// Only extract text. Never render annotations, execute document actions or fetch URLs.
let document;
try {
  const info = await fs.stat(workerData.file);
  if (!info.isFile() || info.size > 512 * 1024 * 1024) throw new Error('Choose a PDF smaller than 512 MB.');
  const bytes = await fs.readFile(workerData.file);
  const hash = createHash('sha256').update(bytes).digest('hex');
  document = await getDocument({data:new Uint8Array(bytes),isEvalSupported:false,disableFontFace:true,useSystemFonts:false,useWorkerFetch:false,CanvasFactory,cMapUrl:fileURLToPath(new URL('./pdfjs/cmaps/',import.meta.url)).replaceAll('\\','/'),cMapPacked:true,standardFontDataUrl:fileURLToPath(new URL('./pdfjs/standard_fonts/',import.meta.url)).replaceAll('\\','/'),verbosity:0}).promise;
  if (document.numPages > 2000) throw new Error('Split PDFs longer than 2,000 pages before importing.');
  const source = path.basename(workerData.file, path.extname(workerData.file)).slice(0,120);
  const entries = []; let skipped = 0, characters = 0, ocrPages = 0;
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
    parentPort.postMessage({progress:{page:pageNumber,pages:document.numPages}});
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    let text = content.items.map(item => typeof item.str === 'string' ? item.str + (item.hasEOL ? '\n' : ' ') : '').join('').replace(/[ \t]+\n/g,'\n').trim();
    let recognized=false,confidence=100;
    const mode=workerData.ocrMode||'auto';
    if(mode==='always'||mode!=='off'&&(text.match(/[\p{L}\p{N}]/gu)||[]).length<80){
      parentPort.postMessage({progress:{page:pageNumber,pages:document.numPages,stage:'OCR'}});
      const result=await recognize(page);ocrPages++;
      if(result.text.length>text.length||mode==='always'){text=result.text;confidence=result.confidence;recognized=true;}
    }
    page.cleanup();
    if (!text) { skipped++; continue; }
    characters += text.length;
    if (characters > 32000000) throw new Error('This PDF contains too much text. Split it into smaller files.');
    // Keep each reference small enough to pin without losing its passage.
    for (let start = 0, part = 1; start < text.length; part++) {
      let end = Math.min(start + 6500, text.length);
      if (end < text.length) { const boundary = text.lastIndexOf(' ',end); if (boundary > start + 3000) end = boundary; }
      const body = text.slice(start,end).trim(); start = end;
      entries.push({id:`pdf:${hash}:${pageNumber}:${part}`,name:`${source} — page ${pageNumber}${part > 1 ? ` (part ${part})` : ''}`,kind:'PDF page',source,edition:'PDF',page:String(pageNumber),summary:body.replace(/\s+/g,' ').slice(0,180),body,warnings:['PDF file page number; printed page numbers may differ. Text order and tables may need checking against the original.',...(recognized?[`OCR text (English), confidence ${Math.round(confidence)}%. Verify names, numbers and tables against the original.`]:[])]});
    }
  }
  if (!entries.length) throw new Error('No readable text found. Try full OCR for scanned pages, or a clearer scan. Original references were not changed.');
  parentPort.postMessage({result:{entries,skipped,ocrPages,pages:document.numPages}});
} catch (error) {
  parentPort.postMessage({error:error?.name === 'PasswordException' ? 'This PDF is password protected. Import an unlocked copy.' : String(error?.message || 'Could not read this PDF.')});
} finally { await ocr?.terminate(); await document?.destroy(); }
