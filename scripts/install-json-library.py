import json,sqlite3,os,datetime
from pathlib import Path
folder=Path(os.environ['APPDATA'])/'Waypoint'
db=sqlite3.connect(folder/'rules.sqlite',timeout=30)
backup=folder/('rules-before-json-'+datetime.datetime.now().strftime('%Y%m%d-%H%M%S')+'.sqlite')
with sqlite3.connect(backup) as target:db.backup(target)
entries=json.loads(Path('.sites-runtime/json-library-entries.json').read_text(encoding='utf-8'))
with db:
 removed=db.execute("DELETE FROM entries WHERE kind='PDF page' AND id LIKE 'pdf:%'").rowcount
 for e in entries:
  search=' '.join([e['name'],e['source'],e['summary'],e['body']]).lower()
  db.execute('INSERT OR REPLACE INTO entries VALUES (?,?,?,?,?,?,?)',(e['id'],e['name'],e['kind'],e['source'],e['edition'],search,json.dumps(e,ensure_ascii=False)))
print(json.dumps({'imported':len(entries),'pdfPassagesRemoved':removed,'total':db.execute('SELECT count(*) FROM entries').fetchone()[0],'backup':str(backup)}))
db.close()
