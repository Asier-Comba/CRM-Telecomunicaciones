from pathlib import Path
import json,hashlib,re,subprocess,sys
w=Path(__file__).resolve().parent;r=w/'crm-w2x-document-upload-uncertain';cp=w/'w2x-commercial-direction-full-checkpoint.json'
def read(p):
 b=p.read_bytes();return b.decode('utf-16') if b.startswith((bytes.fromhex('fffe'),bytes.fromhex('feff'))) else b.decode('utf-8-sig')
def save(p,d):p.write_bytes((json.dumps(d,ensure_ascii=False,indent=2)+'\n').encode('utf-8'))
own=json.loads(read(w/'w2x-portability-draft-direction-checkpoint.json'));request=json.loads(read(w/'w2x-commercial-direction-full-requested.json'))
sha=subprocess.check_output(['git','-C',str(r),'rev-parse','HEAD'],text=True).strip()
assert own['published'] and own['sha']==request['sha']==sha
assert not subprocess.check_output(['git','-C',str(r),'status','--porcelain'],text=True).strip()
code=int(read(w/'w2x-commercial-direction-full-browser-exit.txt').strip());log=read(w/'w2x-commercial-direction-full-browser.txt');ok=code==0 and bool(re.search(r'(?m)^\s*999 passed ',log))
summary=[line.strip() for line in log.splitlines() if re.match(r'^\s*\d+ (passed|failed|skipped|did not run)',line)]
j={'claim':6202367152,'sha':sha,'tree':subprocess.check_output(['git','-C',str(r),'rev-parse','HEAD^{tree}'],text=True).strip(),'branch':own['branch'],'status':'OWN999_FULL_PASS' if ok else 'OWN999_FULL_FAILURE_PRESERVED','browser_status':'PASS999' if ok else 'FAIL_OR_INCOMPLETE_PRESERVED','browser_exit':code,'browser_summary':summary or ['UNKNOWN_NO_TOTALS'],'source_clean':True,'own_source_checks':own['checks'],'release':'NOT_ACCEPTED','next':'INDEPENDENT_AUTHORIZED_COMMERCIAL_UNIT;NO_RERUN_GREEN_NO_RELEASE_PROMOTION' if ok else 'INSPECT_EXACT_FAILURE_BEFORE_ANY_RETRY;PRESERVE_ATTEMPT'}
j['evidence']=[{'path':str(w/f),'sha256':hashlib.sha256((w/f).read_bytes()).hexdigest()} for f in ['w2x-commercial-direction-full-collection.txt','w2x-commercial-direction-full-browser.txt','w2x-portability-draft-direction-browser.txt','w2x-portability-draft-direction-lint.txt','w2x-portability-draft-direction-build.txt','w2x-portability-draft-direction-scan.txt']]
if len(sys.argv)>1:j.update(json.loads(read(w/'w2x-commercial-direction-full-publication.json')))
save(cp,j)
for n in ['outputs/CRM-recuperacion-inventario.json','work/canonical-next-composition-metadata.json','work/current-authorized-execution-unit.json','work/w2x-current-execution-unit.json']:
 p=w.parent/n;d=json.loads(read(p));t=d if n.endswith('w2x-current-execution-unit.json') else d.setdefault('w2x_recovery',{});t['commercial_direction_full_coverage']={'checkpoint':str(cp),'sha':sha,'status':j['status']};save(p,d)
print(json.dumps({'sha':sha,'status':j['status'],'summary':j['browser_summary']}))
