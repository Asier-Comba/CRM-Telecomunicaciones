from pathlib import Path
import json,hashlib,subprocess,sys,re
w=Path(__file__).resolve().parent;r=w/'crm-w2x-document-upload-uncertain';p='w2x-billing-zero-total-draft';cp=w/(p+'-checkpoint.json')
def read(x):return json.loads(x.read_text(encoding='utf-8-sig'))
def save(x,d):x.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def log(name):
 b=(w/(p+'-'+name+'.txt')).read_bytes();return b.decode('utf-16') if b.startswith((b'\xff\xfe',b'\xfe\xff')) else b.decode('utf-8-sig')
j=read(cp);assert j['unit']==64
test='tests/e2e-preview/billing-zero-total-draft.spec.ts';paths=[test,'docs/master/W2X_BILLING_ZERO_TOTAL_DRAFT_20261018.md']
if sys.argv[1]!='running':
 for x in ['browser','functional','lint','build']:assert log(x+'-exit').strip()=='0',x+'FAILURE_PRESERVED'
 assert re.search(r'(?m)^\s*18 passed ',log('browser')) and 'tests 49' in log('functional') and 'pass 49' in log('functional') and 'fail 0' in log('functional') and '66/66' in log('build')
 assert not subprocess.check_output(['git','-C',str(r),'diff',j['base'],'--','src','tests',':(exclude)'+test]),'SRC_AND_ALL_PRIOR_TESTS_UNCHANGED_NEW_QA_ONLY'
 assert subprocess.check_output(['git','-C',str(r),'branch','--show-current'],text=True).strip()==j['branch']
 if sys.argv[1]=='preflight':
  assert subprocess.check_output(['git','-C',str(r),'rev-parse','HEAD'],text=True).strip()==j['base']
  assert {s[3:].replace(chr(92),'/') for s in subprocess.check_output(['git','-C',str(r),'status','--porcelain'],text=True).splitlines()}==set(paths)
  subprocess.run(['git','-C',str(r),'diff','--check'],check=True)
  scan=subprocess.run([str(w/'tools/gitleaks-8.24.3/bin/gitleaks.exe'),'stdin','--redact','--no-banner'],input=b'\n'.join((r/x).read_bytes() for x in paths),stdout=subprocess.PIPE,stderr=subprocess.STDOUT);(w/(p+'-scan.txt')).write_bytes(scan.stdout);assert scan.returncode==0
  j['candidate_fingerprints']=[{'path':x,'sha256_utf8_lf':hashlib.sha256((r/x).read_bytes().replace(b'\r\n',b'\n')).hexdigest()} for x in paths]
  assert j['visual_review']['status']=='ACTUALLY_VIEWED'
  for x in j['visual_review']['frames']:assert hashlib.sha256(Path(x['path']).read_bytes()).hexdigest()==x['sha256']
  j['status']='OWN18_FUNCTIONAL49_BUILD66_VISUAL_PARTIAL';j['checks'].update(browser='18_PASS_OWN_SOURCE',functional='49_PASS_OWN_SOURCE',build='66_PASS',lint='EXIT0_WARNINGS_PRESERVED',scan='PASS')
 else:
  pub=read(w/(p+'-publication.json'));assert pub['publication']=='PUBLISHED';j.update(pub);j['status']='PUBLISHED_OWN18_FUNCTIONAL49_BUILD66_VISUAL_PARTIAL'
  assert not subprocess.check_output(['git','-C',str(r),'status','--porcelain'],text=True).strip()
  for x in j['candidate_fingerprints']:assert hashlib.sha256((r/x['path']).read_bytes().replace(b'\r\n',b'\n')).hexdigest()==x['sha256_utf8_lf']
 j['evidence']=[{'path':str(w/(p+'-'+x+'.txt')),'sha256':hashlib.sha256((w/(p+'-'+x+'.txt')).read_bytes()).hexdigest()} for x in ['browser','functional','lint','build','scan']]
save(cp,j)
for n in ['outputs/CRM-recuperacion-inventario.json','work/canonical-next-composition-metadata.json','work/current-authorized-execution-unit.json','work/w2x-current-execution-unit.json']:
 f=w.parent/n;d=read(f);t=d if n.endswith('w2x-current-execution-unit.json') else d.setdefault('w2x_recovery',{});t['active_commercial_unit']=j;save(f,d)
f=w/'w2x-commercial-continuation-orchestration.json';d=read(f);d['source64']={'checkpoint':str(cp),'status':j['status'],'sha':j.get('sha'),'publication':j.get('publication')};d['next']=j['next'];save(f,d)
f=w/'w2x-units-index.json';d=read(f);ref='work/'+cp.name
if ref not in d['unit_checkpoints']:d['unit_checkpoints'].append(ref)
for row in d['current_working_checkouts']:
 if row['path'].endswith('crm-w2x-document-upload-uncertain'):row.update(sha=j.get('sha',j['base']),branch=j['branch'],clean=sys.argv[1]=='published',branch_published=sys.argv[1]=='published',status=j['status'])
if j.get('publication')=='PUBLISHED' and not any(x.get('sha')==j['sha'] for x in d['published_own_sources']):d['published_own_sources'].append({'unit':64,'checkpoint':ref,'sha':j['sha'],'branch':j['branch'],'published':True,'clean_at_publication':True,'release':'NOT_ACCEPTED'})
save(f,d);print(json.dumps({'status':j['status'],'sha':j.get('sha')}))
