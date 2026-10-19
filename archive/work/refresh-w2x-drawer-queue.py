from pathlib import Path
import json
w=Path(__file__).resolve().parent;p='w2x-commercial-drawer-full'
def read(f):return json.loads(f.read_text(encoding='utf-8-sig'))
def save(f,d):f.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
own=read(w/'w2x-portfolio-selected-title-wrap-checkpoint.json');assert own['publication']=='PUBLISHED'
marker=read(w/(p+'-waiter-session.json'))
d={'checkpoint':'work/'+p+'-checkpoint.json','source':own['sha'],'session':marker['session'],'tests':2109,'files':121,'status':'WAIT_PRIOR2043_TERMINAL_PUBLISHED_PASS','dispatch':'NOT_DISPATCHED','release':'NOT_ACCEPTED','next':'Freeze14source88during2043unique53189;2109source92waiter93887onlyafter2043terminal/PUBLISHED/PASS;continuework15.'}
if (w/(p+'-checkpoint.json')).exists():
 j=read(w/(p+'-checkpoint.json'));d.update(status=j['status'],publication=j.get('publication'),dispatch='TERMINAL',next=j['next'])
elif (w/(p+'-requested.json')).exists():d.update(status='RUNNING_ONCE',dispatch='REQUESTED_ONCE',next='Freeze14atsource92during2109unique93887;then2139source97waiter26311onlyafter2109terminal/PUBLISHED/PASS;continuework15.')
save(w/(p+'-queue-state.json'),d)
f=w/'w2x-units-index.json';j=read(f)
for row in j['current_working_checkouts']:
 if row['path'].endswith('crm-w2x-commercial-composition'):
  if d['dispatch']!='NOT_DISPATCHED' and not (w/'w2x-commercial-mobile-product-full-requested.json').exists():
   import subprocess
   assert subprocess.check_output(['git','-C',str(w/'crm-w2x-commercial-composition'),'rev-parse','HEAD'],text=True).strip()==d['source']
   assert not subprocess.check_output(['git','-C',str(w/'crm-w2x-commercial-composition'),'status','--porcelain'],text=True).strip()
   row.update(sha=d['source'],branch='DETACHED',clean=True,branch_published=True,status=d['status'],frozen=d.get('publication')!='PUBLISHED',active_global=d)
   for key in ['next_global','following_global']:
    if row.get(key,{}).get('source')==d['source']:row.pop(key,None)
   if not row.get('next_global') and row.get('following_global'):row['next_global']=row.pop('following_global')
  elif d['dispatch']=='NOT_DISPATCHED':
   if (w/'w2x-commercial-number-full-requested.json').exists():
    row['next_global']=d
    if row.get('following_global',{}).get('source')==d['source']:row.pop('following_global',None)
   else:row['following_global']=d
save(f,j)
for n in ['outputs/CRM-recuperacion-inventario.json','work/canonical-next-composition-metadata.json','work/current-authorized-execution-unit.json','work/w2x-current-execution-unit.json']:
 f=w.parent/n;j=read(f);t=j if n.endswith('w2x-current-execution-unit.json') else j.setdefault('w2x_recovery',{});t['commercial_drawer_full_coverage']=d;save(f,j)
f=w/'w2x-commercial-continuation-orchestration.json';j=read(f);j['commercial_drawer_full_coverage']=d;save(f,j)
print(json.dumps(d))
