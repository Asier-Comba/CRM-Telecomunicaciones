from pathlib import Path
from zipfile import ZipFile
import datetime, hashlib, json, subprocess
w=Path(__file__).parent.resolve()
def read(n):return json.loads((w/n).read_text(encoding='utf-8-sig'))
def save(n,v):(w/n).write_text(json.dumps(v,indent=2)+'\n',encoding='utf-8')
utc=datetime.datetime.now(datetime.timezone.utc).isoformat()
source='9db3264a5d2d2de170285db0a31872f1c7507b23'
executed='4a87ffe2a2d1fa39fbf28284f201bf9954f32227'
tree='f1a81c6d65ceaa34a4964239da01361ef480d682'
r=read('w2x-billing-preparation-composition-supabase-refresh.json')
assert r['status']=='completed' and r['conclusion']=='failure' and r['head']==source
with ZipFile(w/'w2x-billing-preparation-composition-safe.zip') as z:
 names=[n for n in z.namelist() if n.endswith('w4-supabase-safe-evidence.json')]
 assert len(names)==1
 report=json.loads(z.read(names[0]))
assert report['sha']==executed and report['result']=='FAIL'
assert report['auth']==report['teardown']=='PASS'
assert len(report['w2_product_ui_passed_checks'])==115
assert report['w2_product_ui_failed_checks']==['billing_customer_preparation_cancelled_read_never_opens_or_writes']
for sha in (source,executed):
 assert subprocess.check_output(['git','-C',str(w/'crm-w2x-commercial-composition'),'rev-parse',sha+'^{tree}']).decode().strip()==tree
failure=read('w2x-billing-preparation-composition-quality-closed.json')
failure.update(utc=utc,supabase=read('w2x-billing-preparation-composition-safe.safe-summary.json'),supabase_run=r['run'],supabase_job=115689381174,qualified=False,cause='UNKNOWN_COMPLETE_CAUSE; ORIGINAL_PNG_NO_CREATION_DIALOG_AT_390; AUTHORITATIVE_ROLE_INITIALIZATION_HYPOTHESIS_REQUIRES_REPRODUCTION',artifacts=r['artifacts'],artifact_sha256={s:hashlib.sha256((w/f'w2x-billing-preparation-composition-{s}.zip').read_bytes()).hexdigest() for s in ('safe','product','history')})
save('w2x-9db-auth-failed-closed.json',failure)
m=read('w2x-current-execution-unit.json');assert m['sha']==source
m.update(utc=utc,status='OWN9DB_1430_730_NATIVE85_BUILD66_PASS_AUTH115_1_FAIL_HIGH5_NOT_QUALIFIED',closed_metadata=str(w/'w2x-9db-auth-failed-closed.json'),next='REPRODUCE_INITIAL_CREATE_BEFORE_AUTHORIZED_ROLE; PRESERVE_ORIGINAL_TIMEOUT; NO_BLIND_RERUN; NEW_ARCHIVED_UNIT3B266_PUBLISHED_NOT_AUTH_TESTED')
m['checks']['auth_db_storage']='FAIL115_PASS1_TIMEOUT_AUTH_TEARDOWN_PASS'
m['checks']['own_quality']=failure
m['independent_billing_archived']=str(w/'w2x-billing-archived-checkpoint.json')
m['historical_failure_refs']=list(dict.fromkeys(m['historical_failure_refs']+[str(w/'w2x-9db-auth-failed-closed.json')]))
save('w2x-current-execution-unit.json',m);save('w2x-billing-preparation-composition-checkpoint.json',m)
sha='3b26653c69627254dc0f16d391d2f10748f94ca6';t='52bf6fe8e635da09f9f67e4778faff8ef78111f1'
p=w/'crm-w2x-document-upload-uncertain'
assert subprocess.check_output(['git','-C',str(p),'rev-parse','HEAD']).decode().strip()==sha
assert not subprocess.check_output(['git','-C',str(p),'status','--porcelain']).strip()
archived={'utc':utc,'work':'W2-X','claim':6161364120,'path':str(p),'branch':'codex/w2x-billing-archived-customer-20261014','sha':sha,'tree':t,'published':True,'clean':True,'status':'OWN18_NEW30_REGRESSIONS_BUILD66_LINT_SCAN_PASS_AUTH_NOT_RUN','checks':{'new_browser':18,'previous_regressions':30,'total_unique':48,'build':'PASS66','lint':'PASS','gitleaks':'PASS','consumer_syntax':'PASS','auth':'NOT_RUN','model':'NOT_RUN'},'visual':read('w2x-billing-archived-visual-manifest.json'),'preserved_failures':['w2x-billing-archived-original-repro.txt','w2x-billing-archived-visual-browser.txt:first390_notice_outside_frame'],'expected_unmeasured':{'local':283,'preview':766,'auth':117},'bundle_sha256':hashlib.sha256((w/'w2x-billing-archived-published.bundle').read_bytes()).hexdigest(),'next':'COMPOSE_AFTER_9DB_FAILURE_CAUSE_REPRODUCTION_WITH_OWN_CONTROLS; NO_PASS_INHERITANCE','five_high':'UNRESOLVED','release':'NOT_ACCEPTED','ai_writes':'OFF','api_calls':0}
save('w2x-billing-archived-checkpoint.json',archived)
idx=read('w2x-units-index.json')
for unit in idx['published_own_sources']:
 if Path(unit['path'])==p:unit.update(branch=archived['branch'],sha=sha,clean=True,published=True)
idx['utc']=utc;save('w2x-units-index.json',idx)
for filename in ['../outputs/CRM-recuperacion-inventario.json','canonical-next-composition-metadata.json']:
 obj=read(filename);obj['w2x_recovery']={'utc':utc,'current':str(w/'w2x-current-execution-unit.json'),'status':m['status'],'source':source,'failure':str(w/'w2x-9db-auth-failed-closed.json'),'independent_archived':str(w/'w2x-billing-archived-checkpoint.json'),'principal_ack':'NOT_RECEIVED','principal_branches_unchanged':True,'release':'NOT_ACCEPTED'};save(filename,obj)
print('9DB_ORIGINAL_FAIL_PRESERVED_ARCHIVED_UNIT_PUBLISHED_CHECKPOINTED')
