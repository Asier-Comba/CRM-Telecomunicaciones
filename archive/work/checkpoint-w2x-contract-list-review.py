from pathlib import Path
import json,hashlib,subprocess,sys
w=Path(__file__).resolve().parent;r=w/'crm-w2x-document-upload-uncertain';prefix='w2x-contract-list-review';cp=w/(prefix+'-checkpoint.json')
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def save(p,d):p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
j=read(cp);before=read(w/(prefix+'-before.json'));reviews=read(r/'docs/master/PRODUCT_RELEASE_REVIEWS.json');queue=read(r/'docs/master/PRODUCT_RELEASE_QUEUE.json')
assert {k:v for k,v in reviews.items() if k!='row_reviews'}=={k:v for k,v in before['reviews'].items() if k!='row_reviews'}
assert {k:v for k,v in reviews['row_reviews'].items() if k!='TEL-018'}==before['reviews']['row_reviews']
assert len(reviews['row_reviews'])==24
assert [x for x in queue['rows'] if x['id']!='TEL-018']==[x for x in before['queue']['rows'] if x['id']!='TEL-018']
for k in ['accepted_source','candidate_source','candidate_pr','inherited_baseline','candidate_verification','global_release_blockers','acceptance_policy']:assert queue[k]==before['queue'][k],k
assert queue['review_progress']=={'total':342,'parity':244,'telecom':98,'reviewed_partial':24,'unreconciled':318,'release_ready':0}
assert subprocess.check_output(['git','-C',str(r),'diff',j['base'],'HEAD','--','src','tests'])==b''
paths=['docs/master/PRODUCT_RELEASE_REVIEWS.json','docs/master/PRODUCT_RELEASE_QUEUE.json','docs/master/W2X_CONTRACT_LIST_INDIVIDUAL_REVIEW_20261016.md']
assert subprocess.check_output(['git','-C',str(r),'branch','--show-current'],text=True).strip()==j['branch']
if sys.argv[1]=='preflight':
 assert subprocess.check_output(['git','-C',str(r),'rev-parse','HEAD'],text=True).strip()==j['base']
 assert {s[3:].replace(chr(92),'/') for s in subprocess.check_output(['git','-C',str(r),'status','--porcelain'],text=True).splitlines()}==set(paths)
 subprocess.run(['git','-C',str(r),'diff','--check'],check=True)
 scan=subprocess.run([str(w/'tools/gitleaks-8.24.3/bin/gitleaks.exe'),'stdin','--redact','--no-banner'],input=b'\n'.join((r/p).read_bytes() for p in paths),stdout=subprocess.PIPE,stderr=subprocess.STDOUT);(w/(prefix+'-scan.txt')).write_bytes(scan.stdout);assert scan.returncode==0
 j['candidate_fingerprints']=[{'path':p,'sha256_utf8_lf':hashlib.sha256((r/p).read_bytes().replace(b'\r\n',b'\n')).hexdigest()} for p in paths]
else:
 pub=read(w/(prefix+'-publication.json'));assert pub['publication']=='PUBLISHED';j.update(pub);assert not subprocess.check_output(['git','-C',str(r),'status','--porcelain'],text=True).strip()
 for p in j['candidate_fingerprints']:assert hashlib.sha256((r/p['path']).read_bytes().replace(b'\r\n',b'\n')).hexdigest()==p['sha256_utf8_lf']
j.update(status='TEL018_INDIVIDUAL_PARTIAL_REVIEW_PUBLISHED' if sys.argv[1]=='published' else 'TEL018_GUARDS_PASSED_METADATA_RUNTIME_NOT_RUN',queue=queue['review_progress'],guards=['23prior_reviews_identical','341other_rows_identical','global_acceptance_fields_identical','src_tests_unchanged_from_parent','diff_scan_queue_pass'],next='Investigate Billing successful refresh retaining an old read error;fresh CLAIM and original reproduction first;preserve unrelated customer/command errors and uncertain intents;global1362fa3 frozen')
save(cp,j)
for name in ['outputs/CRM-recuperacion-inventario.json','work/canonical-next-composition-metadata.json','work/current-authorized-execution-unit.json','work/w2x-current-execution-unit.json']:
 p=w.parent/name;d=read(p);t=d if name.endswith('w2x-current-execution-unit.json') else d.setdefault('w2x_recovery',{});t['active_commercial_unit']=j;t['latest_partial_review']={'checkpoint':str(cp),'sha':j.get('sha'),'reviewed_partial':24,'unreconciled':318,'ready':0};save(p,d)
p=w/'w2x-commercial-continuation-orchestration.json';d=read(p);d['source43']={'checkpoint':str(cp),'claim':j['claim'],'status':j['status'],'sha':j.get('sha'),'publication':j.get('publication')};d['next']=j['next'];save(p,d)
if 'sha' in j:
 p=w/'w2x-units-index.json';d=read(p)
 for row in d['current_working_checkouts']:
  if row['path'].endswith('crm-w2x-document-upload-uncertain'):row.update(sha=j['sha'],branch=j['branch'],clean=True,branch_published=True,status=j['status'])
 save(p,d)
print(json.dumps({'status':j['status'],'sha':j.get('sha'),'queue':j['queue']}))
