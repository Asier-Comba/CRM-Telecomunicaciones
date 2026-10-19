from pathlib import Path
import json,hashlib,re,subprocess,sys,datetime
w=Path(__file__).resolve().parent;base=w.parent;repo=w/'crm-w2x-commercial-composition'
cp=w/'w2x-portfolio-editor-invalid-receipt-checkpoint.json'
j=json.loads(cp.read_text(encoding='utf-8'))
published=sys.argv[1]=='published'
def save(p,data):
 t=p.with_suffix(p.suffix+'.tmp');t.write_bytes((json.dumps(data,ensure_ascii=False,indent=2)+'\n').encode('utf-8'));t.replace(p)
assert subprocess.check_output(['git','-C',str(repo),'branch','--show-current'],text=True).strip()=='codex/w2x-portfolio-editor-invalid-receipt-20261015'
for suffix in ['browser','lint','build']:
 actual=(w/('w2x-editor-pending-aware-'+suffix+'-exit.txt')).read_text(encoding='utf-8-sig').strip()
 if actual!='0':
  j.update(status='PENDING_AWARE_CONTROL_FAILURE_PRESERVED',failed_control=suffix,failed_exit=actual,published=False,next='INSPECT_RAW_PENDING_AWARE_FAILURE;NO_AUTO_RETRY_NO_COMMIT')
  save(cp,j)
  raise AssertionError('CONTROL_FAILED_'+suffix+'_'+actual)
log=(w/'w2x-editor-pending-aware-browser.txt').read_text(encoding='utf-8-sig')
assert re.search(r'(?m)^\s*214 passed ',log) and not re.search(r'(?m)^\s*\d+ failed',log)
assert '66/66' in (w/'w2x-editor-pending-aware-build.txt').read_text(encoding='utf-8-sig')
for f in j['candidate_files_fingerprints']:
 assert hashlib.sha256((repo/f['path']).read_bytes().replace(b'\r\n',b'\n')).hexdigest()==f['sha256_utf8_lf']
if not published:
 assert subprocess.check_output(['git','-C',str(repo),'rev-parse','HEAD'],text=True).strip()=='9956bd10cde0e6d2ff09a3a9f6e6f15a67ce2b56'
 status=subprocess.check_output(['git','-C',str(repo),'status','--porcelain'],text=True)
 assert {line[3:].replace(chr(92),'/') for line in status.splitlines()}=={f['path'].replace(chr(92),'/') for f in j['candidate_files_fingerprints']}
 subprocess.run(['git','-C',str(repo),'diff','--check'],check=True)
 payload=b'\n'.join((repo/f['path']).read_bytes() for f in j['candidate_files_fingerprints'])
 scan=subprocess.run([str(w/'tools/gitleaks-8.24.3/bin/gitleaks.exe'),'stdin','--redact','--no-banner'],input=payload,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
 (w/'w2x-editor-pending-aware-scan.txt').write_bytes(scan.stdout);assert scan.returncode==0
else:
 assert not subprocess.check_output(['git','-C',str(repo),'status','--porcelain'],text=True).strip()
 j['sha']=subprocess.check_output(['git','-C',str(repo),'rev-parse','HEAD'],text=True).strip()
 j['tree']=subprocess.check_output(['git','-C',str(repo),'rev-parse','HEAD^{tree}'],text=True).strip()
 result=json.loads((w/'w2x-editor-pending-aware-close-result.json').read_text(encoding='utf-8-sig'))
 j['publication']=result['publication'];j['handoffs']=result.get('handoffs',[])
j.update(utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),status='OWN214_BUILD66_LINT_SCAN_PASS_VISUAL_NOT_REVIEWED_AUTH_NOT_RUN',published=published,clean=published,checks={'browser':214,'lint':'PASS','build':'PASS66','scan':'PASS','visual':'NOT_REVIEWED','auth_db':'NOT_RUN','storage':'NOT_RUN','model':'NOT_RUN'},next='ACTUAL_VISUAL_REVIEW_REQUIRED_BEFORE_UNIT_CLOSE;876_SOURCE15_PINNED;NO_GREEN_RERUN')
files=['w2x-portfolio-editor-invalid-causal-repro.txt','w2x-portfolio-editor-invalid-browser.txt','w2x-editor-pending-aware-browser.txt','w2x-editor-pending-aware-lint.txt','w2x-editor-pending-aware-build.txt','w2x-editor-pending-aware-scan.txt']
if published:files.append('w2x-editor-pending-aware-published.bundle')
j['evidence']=[{'path':str(w/f),'sha256':hashlib.sha256((w/f).read_bytes()).hexdigest()} for f in files]
save(cp,j)
for name in ['outputs/CRM-recuperacion-inventario.json','work/canonical-next-composition-metadata.json','work/current-authorized-execution-unit.json','work/w2x-current-execution-unit.json']:
 p=base/name;data=json.loads(p.read_text(encoding='utf-8-sig'));target=data if name.endswith('w2x-current-execution-unit.json') else data.setdefault('w2x_recovery',{})
 if target.get('active_commercial_unit',{}).get('claim')==6188888730:
  target['active_commercial_unit']={'checkpoint':str(cp),'claim':6188888730,'branch':j['branch'],'status':j['status'],'published':published,'next':j['next'],**({'sha':j['sha']} if published else {'base':j['base']})}
 save(p,data)
p=w/'w2x-units-index.json';data=json.loads(p.read_text(encoding='utf-8-sig'))
for row in data['current_working_checkouts']:
 if row['path'].replace('\\','/').endswith('/crm-w2x-commercial-composition'):
  row.update(branch=j['branch'],status=j['status'],clean=published,branch_published=published,sha=j.get('sha',j['base']))
save(p,data)
print(json.dumps({'status':j['status'],'published':published,'sha':j.get('sha'),'publication':j.get('publication')}))
