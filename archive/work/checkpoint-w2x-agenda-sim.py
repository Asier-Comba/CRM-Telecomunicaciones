import json,subprocess,hashlib
from pathlib import Path
from datetime import datetime,timezone
w=Path(__file__).resolve().parent;now=datetime.now(timezone.utc).isoformat()
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def save(p,d):p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def git(p,*a):return subprocess.check_output(['git',*a],cwd=p).decode('utf-8').strip()
f=w/'w2x-sim-replacement-checkpoint.json';s=read(f);p=Path(s['path'])
assert git(p,'rev-parse','HEAD')=='dbcdb15b221518117078f6b73d446d8b33643c0c'
s.update(utc=now,sha=git(p,'rev-parse','HEAD'),tree=git(p,'rev-parse','HEAD^{tree}'),published=True,clean=True,status='OWN24_BUILD66_LINT_SCAN_PASS_AUTH_NOT_RUN',handoff=6165290029,checks={'controlled_http':24,'build':'PASS66_PHYSICAL_CHECKOUT_IDENTICAL_PRODUCT_TEST_BLOBS','lint':'PASS_SOURCE_AND_CORRECTED_FIXTURE','scan':'PASS','visual':'THREE_PARTIAL_FRAMES_ACTUALLY_VIEWED','auth_db':'NOT_RUN','model':'NOT_RUN'},next='COMPOSITION1FCB_OWN497_RUNNING',bundle_sha256=hashlib.sha256((w/'w2x-sim-replacement-published.bundle').read_bytes()).hexdigest())
s.pop('sessions',None)
s['evidence']=[{'path':str(p),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in [*[w/f'w2x-sim-replacement-{k}.txt' for k in ['original-repro','causal-repro','browser','build','repaired-browser','physical-build','lint','repaired-fixture-lint','final-scan']],*sorted((w/'w2x-sim-replacement-repaired-results').glob('**/sim-replacement-first-server-*.png'))]]
save(f,s)
p=w/'crm-w2x-commercial-composition';q=dict(utc=now,work='W2-X',claim=6165290029,path=str(p),branch=git(p,'branch','--show-current'),source=git(p,'rev-parse','HEAD'),tree=git(p,'rev-parse','HEAD^{tree}'),published=False,clean=True,status='OWN497_LINT_BUILD_RUNNING',active_local_test_session=14172,active_lint_build_session=33673,parents=git(p,'show','-s','--format=%P','HEAD').split(),expected_unmeasured={'controlled_http':497,'remote_preview':1194,'auth_db':122},checks={'queue':'342_13PARTIAL_329UNRECONCILED_0READY','scan':'PASS'},release='NOT_ACCEPTED',model='NOT_RUN',next='CLOSE_EXISTING497_LINT_BUILD_NO_DUPLICATION;PUBLISH_CHECKPOINT;NEXT_INDEPENDENT_UNIT')
save(w/'w2x-agenda-sim-commercial-composition-checkpoint.json',q)
f=w/'w2x-current-execution-unit.json';cur=read(f);cur.update(utc=now,previous_queued_composition=cur['queued_composition'],queued_composition=q,next=q['next']);save(f,cur)
for f in [w.parent/'outputs/CRM-recuperacion-inventario.json',w/'canonical-next-composition-metadata.json',w/'current-authorized-execution-unit.json']:
 d=read(f);d['w2x_recovery'].update(utc=now,queued_composition=q,independent_sim_replacement=s);save(f,d)
f=w/'w2x-units-index.json';d=read(f);d['utc']=now
if str(w/'w2x-agenda-sim-commercial-composition-checkpoint.json') not in d['unit_checkpoints']:d['unit_checkpoints'].append(str(w/'w2x-agenda-sim-commercial-composition-checkpoint.json'))
for r in d['published_own_sources']:
 p=Path(r['path'])
 if p in [w/'crm-w2x-commercial-composition',w/'crm-w2x-par042-review',w/'crm-w2x-document-upload-uncertain']:
  r.update(branch=git(p,'branch','--show-current') or 'DETACHED_VERIFICATION_OF_PUBLISHED_DBCDB15',sha=git(p,'rev-parse','HEAD'),clean=not git(p,'status','--porcelain'),published=p!=w/'crm-w2x-commercial-composition',status=q['status'] if p==w/'crm-w2x-commercial-composition' else s['status'])
save(f,d);print('SIM published and sealed; own497 active checkpoint complete')
