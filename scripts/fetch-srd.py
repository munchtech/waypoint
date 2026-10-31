"""Build a reproducible SRD-only 5etools starter pack; never retain full downloads."""
import json, urllib.request, pathlib, datetime
repo='5etools-mirror-3/5etools-src'
headers={'User-Agent':'Waypoint-SRD-builder'}
def fetch(url):
    with urllib.request.urlopen(urllib.request.Request(url,headers=headers),timeout=60) as response:
        return json.load(response)
commit=fetch('https://api.github.com/repos/'+repo+'/commits/main')['sha']
base='https://raw.githubusercontent.com/'+repo+'/'+commit+'/data/'
files=['spells/spells-phb.json','spells/spells-xphb.json','bestiary/bestiary-mm.json','bestiary/bestiary-xmm.json','items.json','items-base.json','conditionsdiseases.json','actions.json','feats.json','backgrounds.json','races.json','optionalfeatures.json','rewards.json','trapshazards.json','variantrules.json','senses.json','skills.json','languages.json','objects.json','tables.json','vehicles.json']
files += ['class/class-'+name+'.json' for name in ['barbarian','bard','cleric','druid','fighter','monk','paladin','ranger','rogue','sorcerer','warlock','wizard']]
keys={'spell','monster','item','baseitem','condition','disease','status','action','feat','background','race','subrace','optionalfeature','reward','trap','hazard','variantrule','sense','skill','language','object','table','vehicle','itemMastery','class','subclass','classFeature','subclassFeature'}
fields={'name','source','page','level','school','time','range','components','duration','meta','entries','entriesHigherLevel','size','type','alignment','ac','hp','speed','str','dex','con','int','wis','cha','save','skill','senses','passive','languages','cr','trait','action','bonus','reaction','legendary','mythic','spellcasting','legendaryGroup','vulnerable','resist','immune','conditionImmune','rarity','weight','value','dmg1','dmg2','dmgType','property','reqAttune','prerequisite','_copy','ability','languageProficiencies','skillProficiencies','toolProficiencies','weaponProficiencies','armorProficiencies','startingEquipment','hd','proficiency','startingProficiencies','classFeatures','subclassFeatures','className','classSource','subclassShortName','subclassSource','raceName','raceSource','typicalSpeakers','script','rows','colLabels','capCrew','capPassenger','capCargo','terrain'}
out={};counts={}
for file in files:
    data=fetch(base+file)
    count=0
    for key in keys:
        for row in data.get(key,[]):
            revised=row.get('srd52')
            classic=row.get('srd')
            if not (classic or revised) or row.get('_copy') or not row.get('name'): continue
            # Keep only the core source entry. AdditionalEntries/fluff may describe
            # non-SRD expansions even when the base equipment is SRD flagged.
            if row.get('source') not in {'PHB','DMG','MM','XPHB','XDMG','XMM'}: continue
            clean={k:v for k,v in row.items() if k in fields}
            name=revised or classic
            if isinstance(name,str): clean['name']=name
            clean['_waypointEdition']='2024' if row['source'].startswith('X') else '2014'
            out.setdefault(key,[]).append(clean);count+=1
    counts[file]=count
out['_meta']={'repository':'https://github.com/'+repo,'commit':commit,'retrieved':datetime.date.today().isoformat(),'filter':'SRD-marked core entries only; renamed SRD aliases; omitted additionalEntries, fluff, images and unresolved inherited records.','counts':counts}
dest=pathlib.Path('desktop/data');dest.mkdir(parents=True,exist_ok=True)
(dest/'srd-5etools.json').write_text(json.dumps(out,ensure_ascii=False),encoding='utf-8')
print(json.dumps(out['_meta'],indent=2));print('Total:',sum(counts.values()))
