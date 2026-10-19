from pathlib import Path
import json,hashlib,re,subprocess,sys
w=Path(__file__).resolve().parent;r=w/'crm-w2x-commercial-composition';cp=w/'w2x-commercial-line-context-full-checkpoint.json'
def read(p):
 b=p.read_bytes();return b.decode('utf-16') if b.startswith((bytes.fromhex('fffe'),bytes.fromhex('feff'))) else b.decode('utf-8-sig')
def save(p,d):p.write_bytes((json.dumps(d,ensure_ascii=False,indent=2)+'\n').encode('utf-8'))
own=json.loads(read(w/'w2x-portability-create-parents-checkpoint.json'));request=json.loads(read(w/'w2x-commercial-line-context-full-requested.json'))
sha=subprocess.check_output(['git','-C',str(r),'rev-parse','HEAD'],text=True).strip()
assert own['publication']=='PUBLISHED' and own['sha']==request['sha']==sha
assert not subprocess.check_output(['git','-C',str(r),'status','--porcelain'],text=True).strip()
code=int(read(w/'w2x-commercial-line-context-full-browser-exit.txt').strip());log=read(w/'w2x-commercial-line-context-full-browser.txt');ok=code==0 and bool(re.search(r'(?m)^\s*1575 passed ',log))
summary=[line.strip() for line in log.splitlines() if re.match(r'^\s*\d+ (passed|failed|skipped|did not run)',line)]
j={'claim':6251598765,'sha':sha,'tree':subprocess.check_output(['git','-C',str(r),'rev-parse','HEAD^{tree}'],text=True).strip(),'branch':own['branch'],'status':'OWN1575_FULL_PASS' if ok else 'OWN1575_FULL_FAILURE_PRESERVED','browser_status':'PASS1575' if ok else 'FAIL_OR_INCOMPLETE_PRESERVED','browser_exit':code,'browser_summary':summary or ['UNKNOWN_NO_TOTALS'],'source_clean':True,'own_source_checks':own['checks'],'release':'NOT_ACCEPTED','next':'INDEPENDENT_AUTHORIZED_COMMERCIAL_UNIT;NO_RERUN_GREEN_NO_RELEASE_PROMOTION' if ok else 'INSPECT_EXACT_FAILURE_BEFORE_ANY_RETRY;PRESERVE_ATTEMPT'}
j['known_remaining_defects']=own.get('known_remaining_defects','NOT_RECONCILED_FOR_WHOLE_PRODUCT')
j['evidence']=[{'path':str(w/f),'sha256':hashlib.sha256((w/f).read_bytes()).hexdigest()} for f in ['w2x-commercial-line-context-full-collection.txt','w2x-commercial-line-context-full-browser.txt','w2x-portability-create-parents-browser.txt','w2x-portability-create-parents-lint.txt','w2x-portability-create-parents-build.txt','w2x-portability-create-parents-scan.txt']]
if len(sys.argv)>1:j.update(json.loads(read(w/'w2x-commercial-line-context-full-publication.json')))
save(cp,j)
for n in ['outputs/CRM-recuperacion-inventario.json','work/canonical-next-composition-metadata.json','work/current-authorized-execution-unit.json','work/w2x-current-execution-unit.json']:
 p=w.parent/n;d=json.loads(read(p));t=d if n.endswith('w2x-current-execution-unit.json') else d.setdefault('w2x_recovery',{});t['commercial_line_context_full_coverage']={'checkpoint':str(cp),'sha':sha,'status':j['status']};save(p,d)
print(json.dumps({'sha':sha,'status':j['status'],'summary':j['browser_summary']}))
failure=w/'w2x-commercial-line-context-full-launcher-failure.json'
if failure.exists():
 j['launcher_failure_preserved']=json.loads(read(failure));save(cp,j)
state={'checkpoint':str(cp),'sha':sha,'status':j['status'],'publication':j.get('publication','TERMINAL_HANDOFF_PENDING'),'release':'NOT_ACCEPTED','frozen':j.get('publication')!='PUBLISHED'}
save(w/'w2x-commercial-line-context-full-running.json',state)
p=w/'w2x-commercial-continuation-orchestration.json';d=json.loads(read(p));d['commercial_line_context_full_coverage']=state;d['next']=j['next'];save(p,d)
p=w/'w2x-units-index.json';d=json.loads(read(p))
for row in d['current_working_checkouts']:
 if row['path'].endswith('crm-w2x-commercial-composition'):row.update(sha=sha,branch='DETACHED',clean=True,branch_published=True,status=j['status'],active_global=state)
save(p,d)
