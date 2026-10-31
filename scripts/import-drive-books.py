import sys, concurrent.futures, html, http.cookiejar, json, re, subprocess, time, urllib.parse, urllib.request
from pathlib import Path
from html.parser import HTMLParser

ROOT=Path(__file__).resolve().parents[1]
DEST=ROOT.parents[1]/'outputs'/'Waypoint-Books'
DEST.mkdir(parents=True,exist_ok=True)
MANIFEST=DEST/'import-status.json'
FOLDERS=[('official','17H8Az2dtmqH-wDmF9fPbbbjSmeKfrUSL'),('third-party','1g5dW9nepJv9Nrxk83TWS4WBBIYr-go2F')]
class Form(HTMLParser):
 def __init__(self): super().__init__();self.action=None;self.fields={}
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag=='form':self.action=a.get('action')
  if tag=='input' and a.get('name'):self.fields[a['name']]=a.get('value','')
def download(item):
 folder=DEST/item['folder'];folder.mkdir(exist_ok=True)
 name=re.sub(r'[<>:"/\\|?*\x00-\x1f]','_',item['name']).strip(' .')
 file=folder/name
 if file.exists() and file.stat().st_size>5:
  with file.open('rb') as f:
   if f.read(5)==b'%PDF-':return file
 opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
 url='https://drive.google.com/uc?'+urllib.parse.urlencode({'export':'download','id':item['id']})
 response=opener.open(url,timeout=60)
 if 'text/html' in response.headers.get('Content-Type',''):
  page=response.read(2000000).decode('utf8','replace');form=Form();form.feed(page)
  if not form.action or urllib.parse.urlparse(form.action).hostname!='drive.usercontent.google.com':raise RuntimeError('Drive did not provide an accessible download (permission or quota).')
  response=opener.open(form.action+'?'+urllib.parse.urlencode(form.fields),timeout=60)
 prefix=response.read(5)
 if prefix!=b'%PDF-':raise RuntimeError('Drive returned a non-PDF response; not imported.')
 partial=file.with_suffix('.pdf.part')
 with partial.open('wb') as out:
  out.write(prefix)
  while True:
   chunk=response.read(1024*1024)
   if not chunk:break
   out.write(chunk)
 response.close();partial.replace(file);return file

items=[]
for label,folder in FOLDERS:
 s=urllib.request.urlopen('https://drive.google.com/embeddedfolderview?id='+folder,timeout=45).read().decode('utf8')
 found=re.findall(r'class="flip-entry" id="entry-([^"]+)".*?class="flip-entry-title">(.*?)</div>',s,re.S)
 for ident,name in found:
  name=html.unescape(re.sub('<[^>]+>','',name))
  if name.lower().endswith('.pdf'):items.append({'id':ident,'name':name,'folder':label,'status':'pending'})
 print(label,len(found),'folder entries',flush=True)
if '--repair-existing' in sys.argv:
 result=subprocess.run(['node','scripts/import-pdf-file.mjs','--sources'],cwd=ROOT,capture_output=True,text=True,check=True)
 sources=set(json.loads(result.stdout));items=[x for x in items if Path(x['name']).stem[:120] in sources]
 print('Repairing',len(items),'existing books with OCR',flush=True)
 MANIFEST=DEST/'ocr-repair-status.json'
if not items:raise RuntimeError('No accessible PDFs matched')
prior={x['id']:x for x in json.loads(MANIFEST.read_text())} if MANIFEST.exists() else {}
for i,item in enumerate(items):
 if prior.get(item['id'],{}).get('status')=='imported':items[i]=prior[item['id']]
subprocess.run(['node','scripts/import-pdf-file.mjs','--backup'],cwd=ROOT,check=True)
def save():
 temp=MANIFEST.with_suffix('.tmp');temp.write_text(json.dumps(items,indent=2),encoding='utf8');temp.replace(MANIFEST)
save()
# One download and import at a time keeps large books from exhausting RAM.
for index,item in enumerate(items,1):
 if item['status']=='imported':continue
 print(f'[{index}/{len(items)}] {item["name"]}',flush=True)
 try:
  file=download(item);item['path']=str(file);item['status']='downloaded';save()
  result=subprocess.run(['node','scripts/import-pdf-file.mjs',str(file)],cwd=ROOT,capture_output=True,text=True,encoding='utf8',errors='replace',timeout=7250)
  if result.returncode:raise RuntimeError(result.stderr[-1500:] or result.stdout[-1500:] or 'Import failed')
  info=json.loads(result.stdout.strip().splitlines()[-1]);item.update(info);item['status']='imported';item.pop('error',None)
  print('Imported:',info,flush=True)
 except Exception as e:
  item['status']='failed';item['error']=str(e);print('Failed:',str(e)[:300],flush=True)
 save()
print(json.dumps({'total':len(items),'imported':sum(i['status']=='imported' for i in items),'failed':sum(i['status']=='failed' for i in items)}),flush=True)
