from pathlib import Path
import json
w=Path(__file__).resolve().parent;p='w2x-commercial-contract-lifetime-full'
def read(f):return json.loads(f.read_text(encoding='utf-8-sig'))
def save(f,d):f.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
own=read(w/'w2x-contract-create-read-retirement-checkpoint.json');assert own['publication']=='PUBLISHED'
marker=read(w/(p+'-waiter-session.json'))
d={'checkpoint':'work/'+p+'-checkpoint.json','source':own['sha'],'session':marker['session'],'tests':2007,'files':116,'status':'WAIT_PRIOR1968_TERMINAL_PUBLISHED_PASS','dispatch':'NOT_DISPATCHED','release':'NOT_ACCEPTED','next':'Keep1908source80 and1968source84 exactpins. Unique2007waiter only after1968terminal/PUBLISHED/PASS;continueindependentwork15.'}
if (w/(p+'-checkpoint.json')).exists():
 j=read(w/(p+'-checkpoint.json'));d.update(status=j['status'],publication=j.get('publication'),dispatch='TERMINAL',next=j['next'])
elif (w/(p+'-requested.json')).exists():d.update(status='RUNNING_ONCE',dispatch='REQUESTED_ONCE')
if d['dispatch']=='REQUESTED_ONCE':d['next']='Keep14frozenatsource86during2007unique41016;next2043source88waiter93361;continuework15. 1908/1968closedpublished,noinheritance.'
save(w/(p+'-queue-state.json'),d)
f=w/'w2x-units-index.json';j=read(f)
for row in j['current_working_checkouts']:
 if row['path'].endswith('crm-w2x-commercial-composition'):
  if d['dispatch']!='NOT_DISPATCHED' and not (w/'w2x-commercial-number-full-requested.json').exists():
   import subprocess
   assert subprocess.check_output(['git','-C',str(w/'crm-w2x-commercial-composition'),'rev-parse','HEAD'],text=True).strip()==d['source']
   assert not subprocess.check_output(['git','-C',str(w/'crm-w2x-commercial-composition'),'status','--porcelain'],text=True).strip()
   row.update(sha=d['source'],branch='DETACHED',clean=True,branch_published=True,status=d['status'],frozen=d.get('publication')!='PUBLISHED',active_global=d)
  if d['dispatch']=='NOT_DISPATCHED':
   if (w/'w2x-commercial-contract-full-requested.json').exists():
    row['next_global']=d
    if row.get('following_global',{}).get('source')==d['source']:row.pop('following_global',None)
   else:row['following_global']=d
save(f,j)
for n in ['outputs/CRM-recuperacion-inventario.json','work/canonical-next-composition-metadata.json','work/current-authorized-execution-unit.json','work/w2x-current-execution-unit.json']:
 f=w.parent/n;j=read(f);t=j if n.endswith('w2x-current-execution-unit.json') else j.setdefault('w2x_recovery',{});t['commercial_contract_lifetime_full_coverage']=d;save(f,j)
f=w/'w2x-commercial-continuation-orchestration.json';j=read(f);j['commercial_contract_lifetime_full_coverage']=d;save(f,j)
print(json.dumps(d))
