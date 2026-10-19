from pathlib import Path
import json,subprocess
w=Path(__file__).resolve().parent;p='w2x-commercial-proposal-full'
def read(x):return json.loads(x.read_text(encoding='utf-8-sig'))
def save(x,d):x.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
own=read(w/'w2x-billing-proposal-warnings-checkpoint.json')
d={'checkpoint':'work/'+p+'-checkpoint.json','source':own['sha'],'session':76632,'tests':1773,'files':102,'status':'WAIT_PRIOR1755_TERMINAL_PUBLISHED_PASS','dispatch':'NOT_DISPATCHED','own65':'PUBLISHED_OWN99_FUNCTIONAL49_BUILD66_VISUAL_PARTIAL','release':'NOT_ACCEPTED','next':'Unique waiter76632 owns1773source65 after1755terminal/PUBLISHED/PASS;keep14 on64until then. No duplicate,cancel or inheritedPASS.'}
if (w/(p+'-checkpoint.json')).exists():
 j=read(w/(p+'-checkpoint.json'));d.update(status=j['status'],publication=j.get('publication'),dispatch='TERMINAL',frozen=j.get('publication')!='PUBLISHED')
elif (w/(p+'-requested.json')).exists():d.update(status='RUNNING_ONCE',dispatch='REQUESTED_ONCE',frozen=True,next='Keep checkout14 frozen at65 while unique1773controller76632 runs. No duplicate,cancel or inheritedPASS.')
if d['dispatch']!='NOT_DISPATCHED' and not (w/'w2x-commercial-customer-full-requested.json').exists():
 assert subprocess.check_output(['git','-C',str(w/'crm-w2x-commercial-composition'),'rev-parse','HEAD'],text=True).strip()==d['source']
 assert not subprocess.check_output(['git','-C',str(w/'crm-w2x-commercial-composition'),'status','--porcelain'],text=True).strip()
 f=w/'w2x-units-index.json';j=read(f)
 for row in j['current_working_checkouts']:
  if row['path'].endswith('crm-w2x-commercial-composition'):row.update(sha=d['source'],branch='DETACHED',clean=True,branch_published=True,status=d['status'],frozen=d['frozen'],active_global=d)
 save(f,j)
save(w/(p+'-queue-state.json'),d)
for n in ['outputs/CRM-recuperacion-inventario.json','work/canonical-next-composition-metadata.json','work/current-authorized-execution-unit.json','work/w2x-current-execution-unit.json']:
 f=w.parent/n;j=read(f);t=j if n.endswith('w2x-current-execution-unit.json') else j.setdefault('w2x_recovery',{});t['commercial_proposal_full_coverage']=d;save(f,j)
print(json.dumps(d))
