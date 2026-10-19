from pathlib import Path
import json,subprocess,hashlib
w=Path(__file__).resolve().parent;r=w/'crm-w2x-document-upload-uncertain';p='w2x-customer-pagination-review'
def read(f):return json.loads(f.read_text(encoding='utf-8-sig'))
def save(f,j):f.write_text(json.dumps(j,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def git(*args):return subprocess.check_output(['git','-C',str(r),*args]).decode('utf-8').strip()
j=read(w/(p+'-checkpoint.json'));assert git('branch','--show-current')==j['branch'] and git('rev-parse','HEAD')==j['base']
old=read(w/(p+'-reviews-before.json'));new=read(r/'docs/master/PRODUCT_RELEASE_REVIEWS.json')
assert set(new['row_reviews'])-set(old['row_reviews'])=={'PAR-030'}
for key in old:
 if key!='row_reviews':assert new[key]==old[key],key
for key,value in old['row_reviews'].items():assert new['row_reviews'][key]==value,key
assert all(v in ['PARTIAL','NOT_RECONCILED'] for v in new['row_reviews']['PAR-030']['stages'].values())
before=read(w/(p+'-queue-before.json'));after=read(r/'docs/master/PRODUCT_RELEASE_QUEUE.json')
assert len(after['rows'])==342 and len(new['row_reviews'])==33
for a,b in zip(before['rows'],after['rows']):
 assert a['id']==b['id']
 if a['id']!='PAR-030':assert a==b,a['id']
for key in before:
 if key not in ['rows','review_progress','input_snapshots']:assert before[key]==after[key],key
assert before['input_snapshots'][:2]==after['input_snapshots'][:2]
assert after['review_progress']=={'total':342,'parity':244,'telecom':98,'reviewed_partial':33,'unreconciled':309,'release_ready':0}
assert not git('diff','--','src','tests')
paths=['docs/master/PRODUCT_RELEASE_REVIEWS.json','docs/master/PRODUCT_RELEASE_QUEUE.json','docs/master/W2X_CUSTOMER_PAGINATION_INDIVIDUAL_REVIEW_20261019.md']
dirty=[line[3:] for line in subprocess.check_output(['git','-C',str(r),'status','--porcelain']).decode('utf-8').splitlines()];assert set(dirty)==set(paths),(dirty,paths)
assert not git('diff','--check')
source=read(w/'w2x-customer-list-page-focus-checkpoint.json');assert source['publication']=='PUBLISHED' and source['sha']==j['base'] and source['checks']['browser']=='78_PASS_OWN_SOURCE'
for f in source['visual_review']['frames']:assert hashlib.sha256(Path(f['path']).read_bytes()).hexdigest()==f['sha256']
scan=subprocess.run([str(w/'tools/gitleaks-8.24.3/bin/gitleaks.exe'),'stdin','--redact','--no-banner'],input=b'\n'.join((r/x).read_bytes() for x in paths),stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
(w/(p+'-scan.txt')).write_bytes(scan.stdout);assert scan.returncode==0
j['checks'].update(metadata='PASS_ONLY_PAR030_341ROWS_32REVIEWS_GLOBAL_SRC_TESTS_UNCHANGED',queue='PASS342_33PARTIAL_309UNRECONCILED_0READY',scan='PASS')
j['status']='METADATA_PAR030_QUALIFIED_PARTIAL33';j['candidate_fingerprints']=[{'path':x,'sha256_utf8_lf':hashlib.sha256((r/x).read_text(encoding='utf-8').replace('\r\n','\n').encode()).hexdigest()} for x in paths]
save(w/(p+'-checkpoint.json'),j);save(w/(p+'-guards.json'),{'result':'PASS','only_row':'PAR-030','unchanged_rows':341,'unchanged_reviews':32,'global_source_tests':'UNCHANGED','runtime_on_metadata':'NOT_RUN','source99':source['sha'],'visual_hashes':12})
print('PAR030_ONLY_341ROWS_32REVIEWS_GLOBAL_SRC_TESTS_UNCHANGED_PASS')
