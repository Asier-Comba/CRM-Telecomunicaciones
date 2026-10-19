from pathlib import Path
import json,subprocess,hashlib
w=Path(__file__).resolve().parent;r=w/'crm-w2x-document-upload-uncertain';p='w2x-customer-pagination-review'
def read(f):return json.loads(f.read_text(encoding='utf-8-sig'))
def save(f,j):f.write_text(json.dumps(j,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def git(*args):return subprocess.check_output(['git','-C',str(r),*args],text=True,encoding='utf-8').strip()
f=w/(p+'-checkpoint.json')
j=read(f) if f.exists() else {'unit':100,'claim':6256323517,'branch':'codex/w2x-customer-pagination-review-20261019','base':'f40091a9f0e03d52ae9792ba002721c1709a0e66','status':'CAUSAL_PRODUCT_UNCHANGED','publication':'IN_PROGRESS','product_changed':False,'release':'NOT_ACCEPTED','checks':{'browser':'NOT_RUN_FINAL','auth_db':'NOT_RUN','model':'NOT_RUN','paid_api':0,'global':'NOT_RUN_CURRENT_SHA','functional':'NOT_RUN_UI_PRESENTATION_ONLY'},'matrix':{'total':342,'reviewed_partial':31,'unreconciled':311,'release_ready':0},'failures':[],'next':'Finish measured customer service title unit;publish before next unit. Preserve2043source88/2109source92FIFO;no test inheritance.'}
assert git('branch','--show-current')==j['branch']
j['working_head']=git('rev-parse','HEAD');j['clean']=not bool(git('status','--porcelain'))
pub=w/(p+'-publication.json')
if pub.exists():
 j.update(read(pub))
 if j['publication']=='PUBLISHED':j.update(status='PUBLISHED_METADATA_PAR030_PARTIAL33',next='Continue independent commercial unit after fresh CLAIM. Preserve2043source88/2109source92FIFO;source93globalNOT_RUN,noinheritedPASS.')
save(f,j)
for n in ['outputs/CRM-recuperacion-inventario.json','work/canonical-next-composition-metadata.json','work/current-authorized-execution-unit.json','work/w2x-current-execution-unit.json']:
 f=w.parent/n;v=read(f);t=v if n.endswith('w2x-current-execution-unit.json') else v.setdefault('w2x_recovery',{});t['active_commercial_unit']=j;save(f,v)
f=w/'w2x-units-index.json';d=read(f)
for row in d['current_working_checkouts']:
 if row['path'].endswith('crm-w2x-document-upload-uncertain'):row.update(branch=j['branch'],base=j['base'],sha=j.get('sha',j['working_head']),clean=j['clean'],branch_published=j.get('publication')=='PUBLISHED',status=j['status'])
save(f,d)
print(json.dumps({'unit':100,'status':j['status'],'publication':j['publication'],'sha':j.get('sha')}))
