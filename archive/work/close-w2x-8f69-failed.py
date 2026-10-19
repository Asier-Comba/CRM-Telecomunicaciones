from pathlib import Path
from zipfile import ZipFile
import json,datetime,hashlib,subprocess
w=Path(__file__).parent.resolve()
def read(n):return json.loads((w/n).read_text(encoding='utf-8-sig'))
def save(n,v):(w/n).write_text(json.dumps(v,indent=2)+'\n',encoding='utf-8')
source='8f69ed88bd980bf2e1aedf0b14f71b483c9edfd0'
executed='ceaf23ee0764996d29c86d3602a62b8b773ab309'
tree='543f3525a7f4e7f89a33cee0d685958372266453'
r=read('w2x-billing-archived-composition-supabase-refresh.json')
assert r['status']=='completed' and r['conclusion']=='failure' and r['head']==source
assert all(j['status']=='completed' for j in r['jobs'])
for sha in (source,executed):assert subprocess.check_output(['git','-C',str(w/'crm-w2x-commercial-composition'),'rev-parse',sha+'^{tree}']).decode('utf-8').strip()==tree
with ZipFile(w/'w2x-billing-archived-composition-safe.zip') as z:
 names=[n for n in z.namelist() if n.endswith('w4-supabase-safe-evidence.json')]
 assert len(names)==1
 report=json.loads(z.read(names[0]))
assert report['sha']==executed and report['result']=='FAIL'
assert report['auth']==report['teardown']=='PASS'
assert report['w1_backend_checks']==3815 and report['w2_backend_takeover_checks']==227
assert len(report['w2_product_ui_passed_checks'])==len(set(report['w2_product_ui_passed_checks']))==116
assert report['w2_product_ui_failed_checks']==['billing_customer_preparation_cancelled_read_never_opens_or_writes']
assert 'billing_archived_customer_draft_preparation_refused_history_and_inactive_preserved' in report['w2_product_ui_passed_checks']
assert report['w2_ui_failure_details']==[{'check':'billing_customer_preparation_cancelled_read_never_opens_or_writes','action':'billing_preparation:cancelled_context_no_editor_or_error:390','kind':'TIMEOUT'}]
quality=read('w2x-billing-archived-composition-quality-closed.json')
assert quality['source']==source and quality['executed']==executed and quality['tree']==tree
assert quality['functional']['total']==1430 and quality['functional']['preview']==768
quality.update(utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),supabase=read('w2x-billing-archived-composition-safe.safe-summary.json'),supabase_run=38518434146,supabase_job=115702394503,qualified=False,release='NOT_ACCEPTED',cause='UNKNOWN_COMPLETE_CAUSE; OWN8F69_SUBSTEP_CANCELLED_CONTEXT_NO_EDITOR_OR_ERROR_390; BOTH_HELD_READS_CANCEL_AND_BODY2_PRIOR_ASSERTS_REACHED; DOES_NOT_LOCATE_WHICH_OF_THREE_ASSERTS_FAILED; NO_RETROSPECTIVE_CAUSE_TRANSFER_TO9DB',required_new_check_passed='billing_archived_customer_draft_preparation_refused_history_and_inactive_preserved',artifact_sha256={s:hashlib.sha256((w/f'w2x-billing-archived-composition-{s}.zip').read_bytes()).hexdigest() for s in ('safe','product','history')},artifacts=r['artifacts'],original_png_sha256=hashlib.sha256((w/'w2x-8f69-original-preparation-failure.png').read_bytes()).hexdigest())
save('w2x-8f69-auth-failed-closed.json',quality)
m=read('w2x-current-execution-unit.json');assert m['sha']==source
m.update(utc=quality['utc'],status='OWN8F69_1430_768_NATIVE85_BUILD66_PASS_AUTH116_1_FAIL_HIGH5_NOT_QUALIFIED',closed_metadata=str(w/'w2x-8f69-auth-failed-closed.json'),next='CONTINUE_QUEUED7F377_OWN_CONTROLS; PRESERVE8F69_ORIGINAL_FAIL; REPRODUCE_EXACT_CANCELLED_CONTEXT_ASSERT_BEFORE_CAUSAL_FIX; NO_BLIND_RETRY_OR_PASS_INHERITANCE')
m['checks']['auth_db_storage']='FAIL116_PASS1_TIMEOUT_AUTH_TEARDOWN_BACKEND4042_PASS'
m['checks']['own_quality']=quality
m['historical_failure_refs']=list(dict.fromkeys(m['historical_failure_refs']+[str(w/'w2x-8f69-auth-failed-closed.json')]))
save('w2x-current-execution-unit.json',m);save('w2x-billing-archived-composition-checkpoint.json',m)
for f in ['../outputs/CRM-recuperacion-inventario.json','canonical-next-composition-metadata.json','current-authorized-execution-unit.json']:
 obj=read(f);obj['w2x_recovery']={'utc':quality['utc'],'current':str(w/'w2x-current-execution-unit.json'),'source':source,'status':m['status'],'failure':str(w/'w2x-8f69-auth-failed-closed.json'),'queued':m['queued_composition'],'principal_ack':'NOT_RECEIVED','principal_sources_unchanged':True,'release':'NOT_ACCEPTED'};save(f,obj)
print('OWN8F69_116_1_AUTH_TEARDOWN_PASS_ORIGINAL_FAIL_PRESERVED_NO_CAUSE_INHERITANCE')
