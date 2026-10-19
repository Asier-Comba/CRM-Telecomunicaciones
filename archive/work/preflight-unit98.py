from pathlib import Path
import json,subprocess,hashlib
w=Path(__file__).resolve().parent;r=w/'crm-w2x-document-upload-uncertain';p='w2x-agenda-presentation-review'
def read(f):return json.loads(f.read_text(encoding='utf-8-sig'))
def save(f,j):f.write_text(json.dumps(j,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def git(*args):return subprocess.check_output(['git','-C',str(r),*args]).decode('utf-8').strip()
j=read(w/(p+'-checkpoint.json'));assert git('branch','--show-current')==j['branch'] and git('rev-parse','HEAD')==j['base']
old=read(w/(p+'-reviews-before.json'));new=read(r/'docs/master/PRODUCT_RELEASE_REVIEWS.json')
assert set(new['row_reviews'])==set(old['row_reviews'])
for key in old:
 if key!='row_reviews':assert new[key]==old[key],key
for key,value in old['row_reviews'].items():
 if key!='PAR-086':assert new['row_reviews'][key]==value,key
oldrow=old['row_reviews']['PAR-086'];newrow=new['row_reviews']['PAR-086']
for key in oldrow:
 if key!='evidence':assert newrow[key]==oldrow[key],key
assert len(oldrow['evidence'])==2 and newrow['evidence'][:2]==oldrow['evidence'] and len(newrow['evidence'])==4
assert all(x['source_sha']=='93bf52435b1b8e10070880bd2c2109a8d282f170' for x in newrow['evidence'][2:])
before=read(w/(p+'-queue-before.json'));after=read(r/'docs/master/PRODUCT_RELEASE_QUEUE.json')
assert len(after['rows'])==342 and len(new['row_reviews'])==32
for a,b in zip(before['rows'],after['rows']):
 assert a['id']==b['id']
 if a['id']!='PAR-086':assert a==b,a['id']
 else:
  for key in a:
   if key!='evidence':assert a[key]==b[key],key
  assert b['evidence'][:2]==a['evidence'] and len(b['evidence'])==4
for key in before:
 if key not in ['rows','review_progress','input_snapshots']:assert before[key]==after[key],key
assert before['input_snapshots'][:2]==after['input_snapshots'][:2]
assert after['review_progress']=={'total':342,'parity':244,'telecom':98,'reviewed_partial':32,'unreconciled':310,'release_ready':0}
assert not git('diff','--','src','tests')
paths=['docs/master/PRODUCT_RELEASE_REVIEWS.json','docs/master/PRODUCT_RELEASE_QUEUE.json','docs/master/W2X_AGENDA_PRESENTATION_INDIVIDUAL_REVIEW_20261019.md']
dirty=[line[3:] for line in subprocess.check_output(['git','-C',str(r),'status','--porcelain']).decode('utf-8').splitlines()];assert set(dirty)==set(paths),(dirty,paths)
assert not git('diff','--check')
source=read(w/'w2x-calendar-event-title-wrap-checkpoint.json');assert source['publication']=='PUBLISHED' and source['sha']==j['source_evidence']['sha'] and source['checks']['browser']=='72_PASS_OWN_SOURCE'
frames=[x for x in source['visual_review']['frames'] if '-detail-' not in Path(x['path']).name];assert len(frames)==6
for f in frames:assert hashlib.sha256(Path(f['path']).read_bytes()).hexdigest()==f['sha256']
scan=subprocess.run([str(w/'tools/gitleaks-8.24.3/bin/gitleaks.exe'),'stdin','--redact','--no-banner'],input=b'\n'.join((r/x).read_bytes() for x in paths),stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
(w/(p+'-scan.txt')).write_bytes(scan.stdout);assert scan.returncode==0
j['checks'].update(metadata='PASS_PAR086_APPEND2_PRIMARY_STAGES_341ROWS_31REVIEWS_GLOBAL_SRC_TESTS_UNCHANGED',queue='PASS342_32PARTIAL_310UNRECONCILED_0READY',scan='PASS')
j['status']='METADATA_PAR086_APPEND_QUALIFIED_PARTIAL32';j['candidate_fingerprints']=[{'path':x,'sha256_utf8_lf':hashlib.sha256((r/x).read_text(encoding='utf-8').replace('\r\n','\n').encode()).hexdigest()} for x in paths]
save(w/(p+'-checkpoint.json'),j);save(w/(p+'-guards.json'),{'result':'PASS','only_row':'PAR-086','unchanged_rows':341,'unchanged_reviews':31,'global_source_tests':'UNCHANGED','runtime_on_metadata':'NOT_RUN','source93':source['sha'],'visual_hashes':6})
print('PAR086_APPEND2_PRIMARY_STAGES_341ROWS_31REVIEWS_GLOBAL_SRC_TESTS_UNCHANGED_PASS')
