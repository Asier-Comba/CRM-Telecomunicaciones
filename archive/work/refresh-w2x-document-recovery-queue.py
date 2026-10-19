from pathlib import Path
import json
w=Path(__file__).resolve().parent;p='w2x-commercial-document-recovery-full'
def read(f):return json.loads(f.read_text(encoding='utf-8-sig'))
def save(f,d):f.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
own=read(w/'w2x-customer-documents-read-recovery-checkpoint.json');assert own['publication']=='PUBLISHED'
marker=read(w/(p+'-waiter-session.json'))
d={'checkpoint':'work/'+p+'-checkpoint.json','source':own['sha'],'session':marker['session'],'tests':2256,'files':135,'status':'WAIT_PRIOR2214_TERMINAL_PUBLISHED_PASS','dispatch':'NOT_DISPATCHED','release':'NOT_ACCEPTED','next':'Preserve2172source102then2214source106;unique2256source111after2214terminal/PUBLISHED/PASS;queuewatch120minonly,tests60000msunchanged.'}
if (w/(p+'-checkpoint.json')).exists():
 j=read(w/(p+'-checkpoint.json'));d.update(status=j['status'],publication=j.get('publication'),dispatch='TERMINAL',next=j['next'])
elif (w/(p+'-requested.json')).exists():d.update(status='RUNNING_ONCE',dispatch='REQUESTED_ONCE')
save(w/(p+'-queue-state.json'),d)
f=w/'w2x-units-index.json';j=read(f)
for row in j['current_working_checkouts']:
 if row['path'].endswith('crm-w2x-commercial-composition'):
  if d['dispatch']!='NOT_DISPATCHED':
   import subprocess
   assert subprocess.check_output(['git','-C',str(w/'crm-w2x-commercial-composition'),'rev-parse','HEAD'],text=True).strip()==d['source']
   assert not subprocess.check_output(['git','-C',str(w/'crm-w2x-commercial-composition'),'status','--porcelain'],text=True).strip()
   row.update(sha=d['source'],branch='DETACHED',clean=True,branch_published=True,status=d['status'],frozen=d.get('publication')!='PUBLISHED',active_global=d)
   for key in ['next_global','following_global']:
    if row.get(key,{}).get('source')==d['source']:row.pop(key,None)
   if not row.get('next_global') and row.get('following_global'):row['next_global']=row.pop('following_global')
  else:
   if (w/'w2x-commercial-customer-journey-full-requested.json').exists():
    row['next_global']=d
    if row.get('following_global',{}).get('source')==d['source']:row.pop('following_global',None)
   else:row['following_global']=d
save(f,j)
for n in ['outputs/CRM-recuperacion-inventario.json','work/canonical-next-composition-metadata.json','work/current-authorized-execution-unit.json','work/w2x-current-execution-unit.json']:
 f=w.parent/n;j=read(f);t=j if n.endswith('w2x-current-execution-unit.json') else j.setdefault('w2x_recovery',{});t['commercial_document_recovery_full_coverage']=d;save(f,j)
f=w/'w2x-commercial-continuation-orchestration.json';j=read(f);j['commercial_document_recovery_full_coverage']=d;save(f,j)
print(json.dumps(d))
