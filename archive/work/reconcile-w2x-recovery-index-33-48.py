from pathlib import Path
import json
w=Path(__file__).resolve().parent
names=['line-context-retirement','customer-attention-context','attention-customer-identity','attention-individual-review','billing-customer-filter','billing-proposal-context','customer-summary-review','attention-current-day','invoice-relation-compact','invoice-relation-verification','contract-list-review','billing-read-error','proposal-review-commercial','proposal-editable-review','human-review-individual','billing-proposal-day']
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def save(p,d):p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
p=w/'w2x-units-index.json';d=read(p);manifest=[]
for n,name in enumerate(names,33):
 q=w/('w2x-'+name+'-checkpoint.json');j=read(q);ref='work/'+q.name
 if ref not in [x.replace(chr(92),'/') for x in d['unit_checkpoints']]:d['unit_checkpoints'].append(ref)
 item={'unit':n,'checkpoint':ref,'branch':j['branch'],'sha':j.get('sha'),'base':j['base'],'status':j['status'],'publication':j.get('publication','IN_PROGRESS'),'release':'NOT_ACCEPTED'}
 if j.get('publication')=='PUBLISHED':
  assert len(j['sha'])==40 and j.get('handoffs'),ref
  if not any(x.get('sha')==j['sha'] for x in d['published_own_sources']):d['published_own_sources'].append({**item,'clean_at_publication':True,'published':True})
 manifest.append(item)
save(p,d);save(w/'w2x-units33-48-recovery-manifest.json',{'units':manifest,'active_unit':48,'global1362':{'checkpoint':'work/w2x-commercial-grouped-full-checkpoint.json','source':'fa3e16853b4467e554d96af49ac9aeb315978761','status':'PASS1362_PUBLISHED_OWN_SOURCE_ONLY'},'scope':'Recovery references only;no test/release promotions;historical clean_at_publication is not current checkout cleanliness'})
print(json.dumps({'registered':len(manifest),'published':sum(x['publication']=='PUBLISHED' for x in manifest),'active':manifest[-1]['status']}))
