from pathlib import Path
import json
w=Path(__file__).resolve().parent;p='w2x-commercial-line-context-full'
def read(x):return json.loads(x.read_text(encoding='utf-8-sig'))
def save(x,d):x.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
d={'checkpoint':'work/'+p+'-checkpoint.json','source':'2a8597537737cec349650496e874d86ca6e5633a','session':93249,'tests':1575,'files':96,'status':'WAIT_PRIOR1479_TERMINAL_PUBLISHED_PASS','dispatch':'NOT_DISPATCHED','own57':'PUBLISHED_OWN114_BUILD66_VISUAL_PARTIAL','next':'Existing waiter93249 owns execution;do not duplicate,cancel or change frozen checkout14 before1479 publication. PASS cannot be inherited by58.'}
if (w/(p+'-checkpoint.json')).exists():
 j=read(w/(p+'-checkpoint.json'));d.update(status=j['status'],publication=j.get('publication'),dispatch='TERMINAL',next='Own1575 source57 closed;follow newer financial/proposal queue for current checkout14 ownership. No PASS inheritance to descendants.')
elif (w/(p+'-requested.json')).exists():d.update(status='RUNNING_ONCE',dispatch='REQUESTED_ONCE',next='Keep checkout14 frozen at source57 while unique controller93249 runs1575;do not duplicate,cancel or inherit PASS to later58/61/62 sources. Own newer commercial corrections and global verification stay separate.')
save(w/(p+'-queue-state.json'),d)
if (w/(p+'-requested.json')).exists() and not (w/'w2x-commercial-financial-full-requested.json').exists():
 f=w/'w2x-units-index.json';j=read(f)
 for row in j['current_working_checkouts']:
  if row['path'].endswith('crm-w2x-commercial-composition'):row.update(sha=d['source'],branch='DETACHED',clean=True,branch_published=True,status=d['status'],active_global=d,frozen=d.get('publication')!='PUBLISHED')
 save(f,j)
for n in ['outputs/CRM-recuperacion-inventario.json','work/canonical-next-composition-metadata.json','work/current-authorized-execution-unit.json','work/w2x-current-execution-unit.json']:
 f=w.parent/n;j=read(f);t=j if n.endswith('w2x-current-execution-unit.json') else j.setdefault('w2x_recovery',{});t['commercial_line_context_full_coverage']=d;save(f,j)
print(json.dumps(d))
