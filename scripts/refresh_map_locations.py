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
def house_unit(a):
 m=re.search(r'\b(?:casa|cs)\s*[.:-]?\s*(\d+)\s*([a-z])?\b',a,re.I)
 return (number(m[1]),(m[2] or '').lower()) if m else None
def filter_house_unit(candidates,address):
 unit=house_unit(address)
 if not unit:return candidates,None
 house,suffix=unit
 matched=[]
 for c in candidates:
  complements=c.get('complements',{})
  if number(complements.get('casa',''))!=house:continue
  if suffix and norm(complements.get('outros',''))!=suffix:continue
  matched.append(c)
 return matched,('unit_not_confirmed' if not matched else None)
def resolve_record(t,found,source_url):
 k,n=parse(t);cs=found.get(k+'|'+n,[])
 rec={'id':t['id'],'address':t['address'],'city':t['city'],'state':t['state'],'neighborhood':t['neighborhood'],'status':'pending','reason':'address_not_found' if k and n else 'missing_number','candidates':len(cs)}
 cs=[c for c in cs if c['level'] in ['1','2']]
 cs,unit_reason=filter_house_unit(cs,t['address'])
 if unit_reason:rec['reason']=unit_reason
 block=comp(t['address'],r'(?:bloco|bl)');unit=comp(t['address'],r'(?:apto|apartamento|apt|ap)')
 if block:
  matches=[c for c in cs if any(v==block and key in ['bloco','bl'] for key,v in c['complements'].items())]
  if matches:cs=matches
  elif cs and max(dist(cs[0],c) for c in cs)>20:rec['reason']='block_not_confirmed';cs=[]
 if unit:
  matches=[c for c in cs if any(v==unit and key in ['apartamento','apto','apt','ap'] for key,v in c['complements'].items())]
  if matches:cs=matches
 if len(cs)>1:
  nearby=[c for c in cs if norm(c['locality'])==norm(t['neighborhood'])]
  if nearby:cs=nearby
 if cs:
  extent=max(dist(cs[0],c) for c in cs)
  if extent<=20:
   center=min(cs,key=lambda c:sum(dist(c,b) for b in cs))
   rec.update(status='located',reason=None,lat=center['lat'],lng=center['lng'],precision='address',source='IBGE_CNEFE_2022',sourceUrl=source_url,matchedStreet=center['street'],matchedNumber=center['number'],matchedLocality=center['locality'],complements=center['complements'],cnefeId=center['cnefeId'],geocodeLevel=int(center['level']),spreadMeters=round(extent,2))
  else:rec['reason']='multiple_address_points';rec['spreadMeters']=round(extent,2)
 elif rec['candidates'] and rec['reason']=='address_not_found':rec['reason']='no_original_coordinate'
 return rec
def dist(a,b):return math.hypot((a['lat']-b['lat'])*111320,(a['lng']-b['lng'])*111320*math.cos(math.radians(a['lat'])))
def scan_candidates(m,wanted):
 found=collections.defaultdict(list)
 if not wanted:return found
 numbers={k[1] for k in wanted}
 with zipfile.ZipFile(folder/m['name']) as z:
  with z.open(z.namelist()[0]) as f:
   reader=csv.reader(io.TextIOWrapper(f,encoding='utf-8-sig',newline=''),delimiter=';');header=next(reader);ni=header.index('NUM_ENDERECO')
   for raw in reader:
    if not raw:continue
    n=raw[ni].lstrip('0') or '0'
    if n not in numbers:continue
    r=dict(zip(header,raw))
    name=' '.join(r.get(x,'') or '' for x in ['NOM_TIPO_SEGLOGR','NOM_TITULO_SEGLOGR','NOM_SEGLOGR']);k=street(name)
    if (k,n) not in wanted:continue
    try:lat=float(r['LATITUDE']);lng=float(r['LONGITUDE'])
    except:continue
    if not (-34<lat<6 and -74<lng<-32):continue
    cs={norm(r.get('NOM_COMP_ELEM'+str(i),'')):number(r.get('VAL_COMP_ELEM'+str(i),'')) for i in range(1,6) if r.get('NOM_COMP_ELEM'+str(i),'')}
    found[(k,n)].append({'lat':lat,'lng':lng,'level':r['NV_GEO_COORD'],'street':name,'number':n,'modifier':norm(r.get('DSC_MODIFICADOR','')),'locality':r['DSC_LOCALIDADE'],'complements':cs,'cnefeId':r['COD_UNICO_ENDERECO']})
 return found
def run(m):
 dest=out/(m['name']+'.json')
 ts=[t for t in targets if norm(t['city'])==norm(m['city']) and t['state']==m['state']]
 digest=hashlib.sha256(json.dumps(ts,sort_keys=True,ensure_ascii=False).encode()).hexdigest()
 requested={f'{k}|{n}' for t in ts for k,n in [parse(t)] if k and n}
 candidate_map={}
 processed=set()
 if dest.exists():
  previous=json.loads(dest.read_text(encoding='utf-8'))
  candidate_map=previous.get('candidates',{})
  processed=set(previous.get('processedKeys',[]))
  if not processed:
   processed={f'{k}|{n}' for old in previous.get('records',[]) for k,n in [parse(old)] if k and n}
  if previous.get('digest')==digest and previous.get('algorithmVersion')==3:return previous['summary']
  missing=requested-processed
  if missing:
   missing_wanted=collections.defaultdict(list)
   for t in ts:
    k,n=parse(t);key=f'{k}|{n}'
    if key in missing:missing_wanted[(k,n)].append(t)
   new_found=scan_candidates(m,missing_wanted)
   for key,candidates in new_found.items():candidate_map['|'.join(key)]=candidates
  records=[resolve_record(t,candidate_map,m['url']) for t in ts]
  summary={'city':m['city'],'state':m['state'],'total':len(ts),'located':sum(r['status']=='located' for r in records)}
  dest.write_text(json.dumps({'digest':digest,'algorithmVersion':3,'processedKeys':sorted(requested|processed),'summary':summary,'records':records,'candidates':candidate_map},ensure_ascii=False),encoding='utf-8')
  return summary
 wanted=collections.defaultdict(list)
 for t in ts:
  k,n=parse(t)
  if k and n: wanted[(k,n)].append(t)
 found=scan_candidates(m,wanted);candidate_map={'|'.join(k):v for k,v in found.items()}
 records=[resolve_record(t,candidate_map,m['url']) for t in ts]
 summary={'city':m['city'],'state':m['state'],'total':len(ts),'located':sum(r['status']=='located' for r in records)}
 dest.write_text(json.dumps({'digest':digest,'algorithmVersion':3,'processedKeys':sorted(requested),'summary':summary,'records':records,'candidates':candidate_map},ensure_ascii=False),encoding='utf-8')
 return summary
if __name__=='__main__':
 with concurrent.futures.ProcessPoolExecutor(max_workers=2) as ex:
  for i,s in enumerate(ex.map(run,manifest)):
   print(json.dumps(s,ensure_ascii=False),flush=True)
 records=[r for m in manifest for r in json.loads((out/(m['name']+'.json')).read_text(encoding='utf-8'))['records']]
 ids={r['id'] for r in records}
 records += [dict(t,status='pending',reason='municipality_not_found') for t in targets if t['id'] not in ids]
 output=app/'official_property_locations.json'
 if output.exists():
  try:existing={r['id']:r for r in json.loads(output.read_text(encoding='utf-8'))}
  except Exception:existing={}
  for row in records:
   old=existing.get(row.get('id'))
   same_identity=old and all(norm(old.get(k,''))==norm(row.get(k,'')) for k in ('address','city','state','neighborhood'))
   if not same_identity:continue
   if old.get('status')=='located' and old.get('source')=='GEOCODE_NUMBER':
    row.update(old)
   elif old.get('geocodeAttemptedAt'):
    row['geocodeAttemptedAt']=old['geocodeAttemptedAt']
 temp=output.with_suffix('.json.tmp')
 temp.write_text(json.dumps(records,ensure_ascii=False),encoding='utf-8')
 os.replace(temp,output)
 print('TOTAL',len(records),'LOCATED',sum(r['status']=='located' for r in records),flush=True)
