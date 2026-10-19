from pathlib import Path
w=Path('work');f=w/'refresh-w2x-contract-queue.py';s=f.read_text(encoding='utf-8-sig');s=s.replace("if d['dispatch']!='NOT_DISPATCHED':","if d['dispatch']!='NOT_DISPATCHED' and not (w/'w2x-commercial-contract-lifetime-full-requested.json').exists():");f.write_text(s,encoding='utf-8')
p='w2x-commercial-contract-lifetime-full'
s='''from pathlib import Path
import json
w=Path(__file__).resolve().parent;p='w2x-commercial-contract-lifetime-full'
def read(f):return json.loads(f.read_text(encoding='utf-8-sig'))
def save(f,d):f.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\\n',encoding='utf-8')
own=read(w/'w2x-contract-create-read-retirement-checkpoint.json');assert own['publication']=='PUBLISHED'
marker=read(w/(p+'-waiter-session.json'))
d={'checkpoint':'work/'+p+'-checkpoint.json','source':own['sha'],'session':marker['session'],'tests':2007,'files':116,'status':'WAIT_PRIOR1968_TERMINAL_PUBLISHED_PASS','dispatch':'NOT_DISPATCHED','release':'NOT_ACCEPTED','next':'Keep1908source80 and1968source84 exactpins. Unique2007waiter only after1968terminal/PUBLISHED/PASS;continueindependentwork15.'}
if (w/(p+'-checkpoint.json')).exists():
 j=read(w/(p+'-checkpoint.json'));d.update(status=j['status'],publication=j.get('publication'),dispatch='TERMINAL',next=j['next'])
elif (w/(p+'-requested.json')).exists():d.update(status='RUNNING_ONCE',dispatch='REQUESTED_ONCE')
save(w/(p+'-queue-state.json'),d)
f=w/'w2x-units-index.json';j=read(f)
for row in j['current_working_checkouts']:
 if row['path'].endswith('crm-w2x-commercial-composition'):
  if d['dispatch']=='NOT_DISPATCHED':row['following_global']=d
save(f,j)
for n in ['outputs/CRM-recuperacion-inventario.json','work/canonical-next-composition-metadata.json','work/current-authorized-execution-unit.json','work/w2x-current-execution-unit.json']:
 f=w.parent/n;j=read(f);t=j if n.endswith('w2x-current-execution-unit.json') else j.setdefault('w2x_recovery',{});t['commercial_contract_lifetime_full_coverage']=d;save(f,j)
f=w/'w2x-commercial-continuation-orchestration.json';j=read(f);j['commercial_contract_lifetime_full_coverage']=d;save(f,j)
print(json.dumps(d))
'''
(w/'refresh-w2x-contract-lifetime-queue.py').write_text(s,encoding='utf-8')
