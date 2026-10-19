from pathlib import Path
import json,hashlib,re,subprocess,sys
w=Path(__file__).resolve().parent;r=w/'crm-w2x-commercial-composition';p='w2x-commercial-proposal-full';cp=w/(p+'-checkpoint.json')
def text(x):
 b=x.read_bytes();return b.decode('utf-16') if b.startswith((b'\xff\xfe',b'\xfe\xff')) else b.decode('utf-8-sig')
def read(x):return json.loads(text(x))
def save(x,d):x.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
own=read(w/'w2x-billing-proposal-warnings-checkpoint.json');request=read(w/(p+'-requested.json'));sha=subprocess.check_output(['git','-C',str(r),'rev-parse','HEAD'],text=True).strip()
assert own['publication']=='PUBLISHED' and own['sha']==request['sha']==sha
assert not subprocess.check_output(['git','-C',str(r),'status','--porcelain'],text=True).strip()
code=int(text(w/(p+'-browser-exit.txt')).strip());log=text(w/(p+'-browser.txt'));ok=code==0 and bool(re.search(r'(?m)^\s*1773 passed ',log));summary=[s.strip() for s in log.splitlines() if re.match(r'^\s*\d+ (passed|failed|skipped|did not run)',s)]
j={'claim':6252266133,'sha':sha,'tree':subprocess.check_output(['git','-C',str(r),'rev-parse','HEAD^{tree}'],text=True).strip(),'branch':own['branch'],'status':'OWN1773_FULL_PASS' if ok else 'OWN1773_FULL_FAILURE_PRESERVED','browser_status':'PASS1773' if ok else 'FAIL_OR_INCOMPLETE_PRESERVED','browser_exit':code,'browser_summary':summary or ['UNKNOWN_NO_TOTALS'],'source_clean':True,'own_source_checks':own['checks'],'known_remaining_defects':own['known_remaining_defects'],'auth_db':'NOT_RUN','model':'NOT_RUN','paid_api':0,'release':'NOT_ACCEPTED','next':'Continue useful independent W2 commercial unit;no repeat green without changed source or relevant failure.' if ok else 'Preserve attempt and inspect exact failure before any retry;no blind rerun.'}
j['evidence']=[{'path':str(w/x),'sha256':hashlib.sha256((w/x).read_bytes()).hexdigest()} for x in [p+'-collection.txt',p+'-browser.txt','w2x-billing-proposal-warnings-browser.txt','w2x-billing-proposal-warnings-functional.txt','w2x-billing-proposal-warnings-build.txt','w2x-billing-proposal-warnings-lint.txt','w2x-billing-proposal-warnings-scan.txt']]
if len(sys.argv)>1:j.update(read(w/(p+'-publication.json')))
save(cp,j)
state={'checkpoint':str(cp),'sha':sha,'status':j['status'],'publication':j.get('publication','TERMINAL_HANDOFF_PENDING'),'frozen':j.get('publication')!='PUBLISHED','release':'NOT_ACCEPTED'}
save(w/(p+'-running.json'),state)
for n in ['outputs/CRM-recuperacion-inventario.json','work/canonical-next-composition-metadata.json','work/current-authorized-execution-unit.json','work/w2x-current-execution-unit.json']:
 f=w.parent/n;d=read(f);t=d if n.endswith('w2x-current-execution-unit.json') else d.setdefault('w2x_recovery',{});t['commercial_financial_full_coverage']=state;save(f,d)
f=w/'w2x-commercial-continuation-orchestration.json';d=read(f);d['commercial_financial_full_coverage']=state;d['next']=j['next'];save(f,d)
f=w/'w2x-units-index.json';d=read(f)
for row in d['current_working_checkouts']:
 if row['path'].endswith('crm-w2x-commercial-composition'):row.update(sha=sha,branch='DETACHED',clean=True,branch_published=True,status=j['status'],frozen=state['frozen'],active_global=state)
save(f,d);print(json.dumps({'status':j['status'],'sha':sha,'summary':summary}))
