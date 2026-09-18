import json,csv,zipfile,io,re,unicodedata,math,collections,os,concurrent.futures,hashlib,sys
from pathlib import Path
app=Path(__file__).resolve().parents[1]
folder=Path(os.environ.get('CNEFE_DIRECTORY',str(app/'.cache/map-cnefe')))
out=folder/'resolved';out.mkdir(exist_ok=True)
input_file=Path(sys.argv[1]) if len(sys.argv)>1 else app/'data_store.json'
raw=json.loads(input_file.read_text(encoding='utf-8-sig'))
targets=raw.get('auctions',[]) if isinstance(raw,dict) else raw
targets=[dict(id=t['id'],address=t.get('address',''),city=t.get('city',''),state=t.get('state',''),neighborhood=t.get('neighborhood','')) for t in targets]
manifest=json.loads((folder/'manifest.json').read_text(encoding='utf-8-sig'))
def norm(s): return re.sub(r'[^a-z0-9]+',' ',unicodedata.normalize('NFKD',str(s)).encode('ascii','ignore').decode().lower()).strip()
titles={'dr':'doutor','dra':'doutora','prof':'professor','profa':'professora','eng':'engenheiro','cel':'coronel','dep':'deputado','gov':'governador','pres':'presidente','sen':'senador','pe':'padre','sta':'santa','sto':'santo','gal':'general','gen':'general'}
def street(s):
 s=norm(s);s=re.sub(r'^do imovel ','',s);s=re.sub(r'^(rua|r|avenida|av|avn|estrada|estr|est|travessa|trav|trv|praca|pca|p|alameda|al|rodovia|rod|largo)\b *','',s)
 return ' '.join(titles.get(t,t) for t in s.split() if t not in ['de','da','do','das','dos','e'])
def number(s):
 s=norm(s).replace(' ','');return re.sub(r'^0+(?=\d)','',s)
def parse(t):
 a=t['address'];s=re.sub(r'^do Im.vel:\s*','',a,flags=re.I)
 m=re.search(r'(?:,\s*|\s+)N[.º°o]?\s*([\d]+[A-Za-z]?|S\s*/?\s*N)\b',s,re.I)
 if not m: m=re.search(r',\s*(\d+[A-Za-z]?)\b',s)
 if not m: m=re.search(r'\s+(\d+[A-Za-z]?)(?=\s*(?:$|,| - |apto\b|bl\b))',s,re.I)
 return (street(s[:m.start()]),number(m[1])) if m and not re.match(r's',m[1],re.I) else ('','')
def comp(a,label):
 m=re.search(r'\b'+label+r'\s*[.:\-]?\s*([0-9]+[A-Za-z]?|[A-Za-z])\b',a,re.I);return number(m[1]) if m else ''
def dist(a,b):return math.hypot((a['lat']-b['lat'])*111320,(a['lng']-b['lng'])*111320*math.cos(math.radians(a['lat'])))
def run(m):
 dest=out/(m['name']+'.json')
 ts=[t for t in targets if norm(t['city'])==norm(m['city']) and t['state']==m['state']]
 digest=hashlib.sha256(json.dumps(ts,sort_keys=True,ensure_ascii=False).encode()).hexdigest()
 if dest.exists():
  previous=json.loads(dest.read_text(encoding='utf-8'))
  if previous.get('digest')==digest:return previous['summary']
 wanted=collections.defaultdict(list)
 for t in ts:
  k,n=parse(t)
  if k and n: wanted[(k,n)].append(t)
 numbers={k[1] for k in wanted}; found=collections.defaultdict(list)
 with zipfile.ZipFile(folder/m['name']) as z:
  with z.open(z.namelist()[0]) as f:
   reader=csv.reader(io.TextIOWrapper(f,encoding='utf-8-sig',newline=''),delimiter=';'); header=next(reader); ni=header.index('NUM_ENDERECO')
   for raw in reader:
    if not raw:continue
    n=raw[ni].lstrip('0') or '0'
    if n not in numbers:continue
    r=dict(zip(header,raw))
    name=' '.join(r.get(x,'') or '' for x in ['NOM_TIPO_SEGLOGR','NOM_TITULO_SEGLOGR','NOM_SEGLOGR']);k=street(name)
    if (k,n) not in wanted:continue
    try: lat=float(r['LATITUDE']);lng=float(r['LONGITUDE'])
    except:continue
    if not (-34<lat<6 and -74<lng<-32):continue
    cs={norm(r.get('NOM_COMP_ELEM'+str(i),'')):number(r.get('VAL_COMP_ELEM'+str(i),'')) for i in range(1,6) if r.get('NOM_COMP_ELEM'+str(i),'')}
    found[(k,n)].append({'lat':lat,'lng':lng,'level':r['NV_GEO_COORD'],'street':name,'number':n,'modifier':norm(r.get('DSC_MODIFICADOR','')),'locality':r['DSC_LOCALIDADE'],'complements':cs,'cnefeId':r['COD_UNICO_ENDERECO']})
 records=[]
 for t in ts:
  k,n=parse(t); cs=found.get((k,n),[]);rec={'id':t['id'],'address':t['address'],'city':t['city'],'state':t['state'],'neighborhood':t['neighborhood'],'status':'pending','reason':'address_not_found' if k and n else 'missing_number','candidates':len(cs)}
  cs=[c for c in cs if c['level'] in ['1','2']]
  block=comp(t['address'],r'(?:bloco|bl)');unit=comp(t['address'],r'(?:apto|apartamento|apt|ap)')
  if block:
   matches=[c for c in cs if any(v==block and key in ['bloco','bl'] for key,v in c['complements'].items())]
   if matches:cs=matches
   elif cs:rec['reason']='block_not_confirmed';cs=[]
  if unit:
   matches=[c for c in cs if any(v==unit and key in ['apartamento','apto','apt','ap'] for key,v in c['complements'].items())]
   if matches:cs=matches
  if len(cs)>1:
   nearby=[c for c in cs if norm(c['locality'])==norm(t['neighborhood'])]
   if nearby:cs=nearby
  if cs:
   # Never invent a midpoint or accept a street/sector centroid. Use a measured record only.
   extent=max(dist(cs[0],c) for c in cs)
   if extent<=20:
    center=min(cs,key=lambda c:sum(dist(c,b) for b in cs))
    rec.update(status='located',reason=None,lat=center['lat'],lng=center['lng'],precision='address',source='IBGE_CNEFE_2022',sourceUrl=m['url'],matchedStreet=center['street'],matchedNumber=center['number'],matchedLocality=center['locality'],complements=center['complements'],cnefeId=center['cnefeId'],geocodeLevel=int(center['level']),spreadMeters=round(extent,2))
   else:rec['reason']='multiple_address_points';rec['spreadMeters']=round(extent,2)
  elif rec['candidates'] and rec['reason']=='address_not_found':rec['reason']='no_original_coordinate'
  records.append(rec)
 summary={'city':m['city'],'state':m['state'],'total':len(ts),'located':sum(r['status']=='located' for r in records)}
 dest.write_text(json.dumps({'digest':digest,'summary':summary,'records':records,'candidates':{'|'.join(k):v for k,v in found.items()}},ensure_ascii=False),encoding='utf-8')
 return summary
if __name__=='__main__':
 with concurrent.futures.ProcessPoolExecutor(max_workers=2) as ex:
  for i,s in enumerate(ex.map(run,manifest)):
   print(json.dumps(s,ensure_ascii=False),flush=True)
 records=[r for m in manifest for r in json.loads((out/(m['name']+'.json')).read_text(encoding='utf-8'))['records']]
 ids={r['id'] for r in records}
 records += [dict(t,status='pending',reason='municipality_not_found') for t in targets if t['id'] not in ids]
 output=app/'official_property_locations.json'
 temp=output.with_suffix('.json.tmp')
 temp.write_text(json.dumps(records,ensure_ascii=False),encoding='utf-8')
 os.replace(temp,output)
 print('TOTAL',len(records),'LOCATED',sum(r['status']=='located' for r in records),flush=True)
