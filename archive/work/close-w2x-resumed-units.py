import json, hashlib, subprocess
from pathlib import Path
from datetime import datetime, timezone
w=Path(__file__).resolve().parent
def read(p): return json.loads(p.read_text(encoding='utf-8-sig'))
def save(p,d): p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def git(p,*args): return subprocess.check_output(['git',*args],cwd=p).decode('utf-8').strip()
utc=datetime.now(timezone.utc).isoformat()
c=w/'crm-w2x-commercial-composition';m=w/'crm-w2x-par042-review'
assert git(c,'rev-parse','HEAD')=='84938aad3e1d7edcb3af9201cc412f4b35dedc4e'
for kind in ['browser','build','lint','scan']:
 assert (w/f'w2x-reopen-commercial-composition-{kind}-exit.txt').read_text(encoding='utf-8-sig').strip()=='0'
assert '461 passed' in (w/'w2x-reopen-commercial-composition-browser.txt').read_text(encoding='utf-8-sig')
manifest=w/'w2x-849-remote-preview-manifest.json';d=read(manifest);cases=[]
def walk(s):
 for x in s.get('specs',[]):
  for t in x['tests']: cases.append((t['projectName'],x['file'],x['title'],t['timeout']))
 for x in s.get('suites',[]): walk(x)
for s in d['suites']: walk(s)
assert len(cases)==1122 and len(set(cases))==1122 and not d['errors']
sets={p:{(f,t) for pp,f,t,_ in cases if pp==p} for p in ['desktop','mobile']}
assert sets['desktop']==sets['mobile'] and len(sets['desktop'])==561
assert all(t==180000 for _,_,_,t in cases)
assert d['config']['workers']==1 and all(p['retries']==0 for p in d['config']['projects'])
inventory=dict(source=git(c,'rev-parse','HEAD'),kind='COLLECTION_ONLY_NOT_EXECUTION',total_collected=1122,project_counts={'desktop':561,'mobile':561},same_case_set=True,workers=1,retries=0,timeout=180000,manifest_sha256=digest(manifest),execution='NOT_RUN',auth_expected=122,auth_execution='NOT_RUN')
save(w/'w2x-849-remote-preview-inventory.json',inventory)
f=w/'w2x-reopen-commercial-composition-checkpoint.json';q=read(f)
q.update(utc=utc,published=True,clean=True,status='OWN461_BUILD66_LINT_QUEUE_SCAN_PASS_PUBLISHED_REMOTE_NOT_RUN',checks=dict(controlled_browser=461,build='PASS66',lint='PASS',queue='342_11PARTIAL_331UNRECONCILED_0READY',scan='PASS',auth_db='NOT_RUN',remote_preview='NOT_RUN'),bundle_sha256=digest(w/'w2x-reopen-commercial-composition-published.bundle'),remote_inventory=str(w/'w2x-849-remote-preview-inventory.json'),next='COMPOSE_PAR083_METADATA_ONLY_KEEP_PAR096;CONTINUE_INDEPENDENT_PRODUCT;OWNER_REQUESTS_PENDING')
q.pop('active_local_test_session',None);q.pop('active_lint_build_session',None)
q['evidence']=[dict(path=str(p),sha256=digest(p)) for p in [w/f'w2x-reopen-commercial-composition-{k}.txt' for k in ['browser','build','lint','queue','scan']]]
save(f,q)
pf=w/'w2x-par083-checkpoint.json';p=dict(utc=utc,work='W2-X',claim=6164441906,path=str(m),branch=git(m,'branch','--show-current'),sha=git(m,'rev-parse','HEAD'),tree=git(m,'rev-parse','HEAD^{tree}'),published=True,clean=True,status='METADATA_ONLY_VERIFIED_NO_RUNTIME_PASS_INHERITANCE',checks=dict(unchanged_rows=341,unchanged_prior_reviews=10,queue='342_11PARTIAL_331UNRECONCILED_0READY',headers_blockers='UNCHANGED',scan='PASS'),preflight_preserved=str(w/'w2x-par083-preflight-preserved.json'),bundle_sha256=digest(w/'w2x-par083-published.bundle'),release='NOT_ACCEPTED',model='NOT_RUN')
save(pf,p)
f=w/'w2x-current-execution-unit.json';cur=read(f);cur.update(utc=utc,queued_composition=q,independent_par083=str(pf),next=q['next']);save(f,cur)
for f in [w.parent/'outputs/CRM-recuperacion-inventario.json',w/'canonical-next-composition-metadata.json',w/'current-authorized-execution-unit.json']:
 d=read(f);d['w2x_recovery'].update(utc=utc,queued_composition=q,independent_par083=str(pf));save(f,d)
f=w/'w2x-units-index.json';d=read(f);d['utc']=utc
for p in [pf,w/'w2x-reopen-commercial-composition-checkpoint.json']:
 if str(p) not in d['unit_checkpoints']:d['unit_checkpoints'].append(str(p))
for row in d['published_own_sources']:
 if Path(row['path']) in [c,m]:
  cp=Path(row['path']);row.update(branch=git(cp,'branch','--show-current'),sha=git(cp,'rev-parse','HEAD'),published=True,clean=not git(cp,'status','--porcelain'),status=q['status'] if cp==c else p['status'] if isinstance(p,dict) else 'METADATA_ONLY_VERIFIED')
save(f,d)
print('Closed own461 and PAR083, inventories and four recovery files updated')
