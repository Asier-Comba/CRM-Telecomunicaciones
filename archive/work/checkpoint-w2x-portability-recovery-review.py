from pathlib import Path
import json,hashlib,subprocess,sys
w=Path(__file__).resolve().parent;r=w/'crm-w2x-document-upload-uncertain';p='w2x-portability-recovery-review';cp=w/(p+'-checkpoint.json')
def read(x):return json.loads(x.read_text(encoding='utf-8-sig'))
def save(x,d):x.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
j=read(cp);before=read(w/(p+'-before.json'));reviews=read(r/'docs/master/PRODUCT_RELEASE_REVIEWS.json');queue=read(r/'docs/master/PRODUCT_RELEASE_QUEUE.json');ids={'TEL-040'}
assert {k:v for k,v in reviews.items() if k!='row_reviews'}=={k:v for k,v in before['reviews'].items() if k!='row_reviews'}
assert {k:v for k,v in reviews['row_reviews'].items() if k not in ids}=={k:v for k,v in before['reviews']['row_reviews'].items() if k not in ids}
assert len(reviews['row_reviews'])==31 and len(reviews['row_reviews']['TEL-040']['evidence'])==4
oldrow=before['reviews']['row_reviews']['TEL-040'];newrow=reviews['row_reviews']['TEL-040']
assert {k:v for k,v in oldrow.items() if k!='evidence'}=={k:v for k,v in newrow.items() if k!='evidence'}
assert newrow['evidence'][:2]==oldrow['evidence'] and all(x['source_sha']==j['evidence_source'] for x in newrow['evidence'][2:])
visual=read(w/(p+'-visual.json'));assert visual['source_sha']==j['evidence_source'] and len(visual['frames'])==28 and visual['status']=='ACTUALLY_VIEWED'
for x in visual['frames']:assert hashlib.sha256(Path(x['path']).read_bytes()).hexdigest()==x['sha256']
source=read(w/'w2x-line-number-recovery-close-checkpoint.json');assert source['publication']=='PUBLISHED' and source['sha']==j['evidence_source'] and source['checks']['browser']=='189_PASS_OWN_SOURCE'
assert all(v!='PASS' for v in reviews['row_reviews']['TEL-040']['stages'].values())
assert [x for x in queue['rows'] if x['id'] not in ids]==[x for x in before['queue']['rows'] if x['id'] not in ids]
for k in ['accepted_source','candidate_source','candidate_pr','inherited_baseline','candidate_verification','global_release_blockers','acceptance_policy']:assert queue[k]==before['queue'][k],k
assert queue['review_progress']=={'total':342,'parity':244,'telecom':98,'reviewed_partial':31,'unreconciled':311,'release_ready':0}
assert subprocess.check_output(['git','-C',str(r),'diff',j['base'],'--','src','tests'])==b''
paths=['docs/master/PRODUCT_RELEASE_REVIEWS.json','docs/master/PRODUCT_RELEASE_QUEUE.json','docs/master/W2X_PORTABILITY_RECOVERY_INDIVIDUAL_REVIEW_20261018.md']
assert subprocess.check_output(['git','-C',str(r),'branch','--show-current'],text=True).strip()==j['branch']
if sys.argv[1]=='preflight':
 assert subprocess.check_output(['git','-C',str(r),'rev-parse','HEAD'],text=True).strip()==j['base']
 assert {s[3:].replace(chr(92),'/') for s in subprocess.check_output(['git','-C',str(r),'status','--porcelain'],text=True).splitlines()}==set(paths)
 subprocess.run(['git','-C',str(r),'diff','--check'],check=True)
 scan=subprocess.run([str(w/'tools/gitleaks-8.24.3/bin/gitleaks.exe'),'stdin','--redact','--no-banner'],input=b'\n'.join((r/x).read_bytes() for x in paths),stdout=subprocess.PIPE,stderr=subprocess.STDOUT);(w/(p+'-scan.txt')).write_bytes(scan.stdout);assert scan.returncode==0
 j['candidate_fingerprints']=[{'path':x,'sha256_utf8_lf':hashlib.sha256((r/x).read_bytes().replace(b'\r\n',b'\n')).hexdigest()} for x in paths]
else:
 pub=read(w/(p+'-publication.json'));assert pub['publication']=='PUBLISHED';j.update(pub);assert not subprocess.check_output(['git','-C',str(r),'status','--porcelain'],text=True).strip()
 for x in j['candidate_fingerprints']:assert hashlib.sha256((r/x['path']).read_bytes().replace(b'\r\n',b'\n')).hexdigest()==x['sha256_utf8_lf']
j.update(status='INDIVIDUAL_PORTABILITY_RECOVERY_PARTIAL_REVIEW_PUBLISHED' if sys.argv[1]=='published' else 'INDIVIDUAL_PORTABILITY_RECOVERY_GUARDS_PASS_RUNTIME_NOT_RUN',queue=queue['review_progress'],guards=['30other_reviews_identical','341other_rows_identical','global_acceptance_fields_identical','src_tests_unchanged','diff_scan_queue_pass']);save(cp,j)
for name in ['outputs/CRM-recuperacion-inventario.json','work/canonical-next-composition-metadata.json','work/current-authorized-execution-unit.json','work/w2x-current-execution-unit.json']:
 q=w.parent/name;d=read(q);t=d if name.endswith('w2x-current-execution-unit.json') else d.setdefault('w2x_recovery',{});t['active_commercial_unit']=j;t['latest_partial_review']={'checkpoint':str(cp),'sha':j.get('sha'),'reviewed_partial':31,'unreconciled':311,'ready':0};save(q,d)
q=w/'w2x-commercial-continuation-orchestration.json';d=read(q);d['source89']={'checkpoint':str(cp),'claim':j['claim'],'status':j['status'],'sha':j.get('sha'),'publication':j.get('publication')};d['next']=j['next'];save(q,d)
if 'sha' in j:
 q=w/'w2x-units-index.json';d=read(q)
 for row in d['current_working_checkouts']:
  if row['path'].endswith('crm-w2x-document-upload-uncertain'):row.update(sha=j['sha'],branch=j['branch'],clean=True,branch_published=True,status=j['status'])
 save(q,d)
print(json.dumps({'status':j['status'],'sha':j.get('sha'),'queue':j['queue']}))
