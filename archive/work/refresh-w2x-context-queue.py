from pathlib import Path
import json,subprocess
w=Path(__file__).resolve().parent;p='w2x-commercial-context-full'
def read(x):return json.loads(x.read_text(encoding='utf-8-sig'))
def save(x,d):x.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
own=read(w/'w2x-assistant-customer-name-wrap-checkpoint.json');assert own['publication']=='PUBLISHED'
d={'checkpoint':'work/'+p+'-checkpoint.json','source':own['sha'],'session':56843,'tests':1908,'files':111,'status':'WAIT_PRIOR1887_TERMINAL_PUBLISHED_PASS','dispatch':'NOT_DISPATCHED','release':'NOT_ACCEPTED','next':'Unique waiter56843 owns1908source80 only after1887terminal/PUBLISHED/PASS. Keep14 frozen at78 untilprior closes;continue independent work15. No duplicate/cancel/inheritedPASS.'}
if (w/(p+'-checkpoint.json')).exists():
 j=read(w/(p+'-checkpoint.json'));d.update(status=j['status'],publication=j.get('publication'),dispatch='TERMINAL',frozen=j.get('publication')!='PUBLISHED',next=j.get('next','Closed;preserve own SHA andcontinue independentwork.'))
elif (w/(p+'-requested.json')).exists():d.update(status='RUNNING_ONCE',dispatch='REQUESTED_ONCE',frozen=True,next='Keep14 frozen atsource80 while1908 unique56843 runs;continue independent work15. No duplicate/cancel/inheritedPASS.')
f=w/'w2x-units-index.json';j=read(f)
if d['dispatch']!='NOT_DISPATCHED' and not (w/'w2x-commercial-contract-full-requested.json').exists():
 assert subprocess.check_output(['git','-C',str(w/'crm-w2x-commercial-composition'),'rev-parse','HEAD'],text=True).strip()==d['source']
 assert not subprocess.check_output(['git','-C',str(w/'crm-w2x-commercial-composition'),'status','--porcelain'],text=True).strip()
 for row in j['current_working_checkouts']:
  if row['path'].endswith('crm-w2x-commercial-composition'):row.update(sha=d['source'],branch='DETACHED',clean=True,branch_published=True,status=d['status'],frozen=d['frozen'],active_global=d)
elif d['dispatch']=='NOT_DISPATCHED':
 for row in j['current_working_checkouts']:
  if row['path'].endswith('crm-w2x-commercial-composition'):row['next_global']=d
save(f,j);save(w/(p+'-queue-state.json'),d)
for n in ['outputs/CRM-recuperacion-inventario.json','work/canonical-next-composition-metadata.json','work/current-authorized-execution-unit.json','work/w2x-current-execution-unit.json']:
 f=w.parent/n;j=read(f);t=j if n.endswith('w2x-current-execution-unit.json') else j.setdefault('w2x_recovery',{});t['commercial_context_full_coverage']=d;save(f,j)
print(json.dumps(d))
