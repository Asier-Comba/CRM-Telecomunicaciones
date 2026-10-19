from pathlib import Path
import json,hashlib,subprocess,re,sys
w=Path(__file__).resolve().parent;r=w/'crm-w2x-document-upload-uncertain';prefix='w2x-attention-customer-identity';cp=w/(prefix+'-checkpoint.json');j=json.loads(cp.read_text(encoding='utf-8-sig'))
def save(p,d):p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def log(s):
 b=(w/(prefix+'-'+s+'.txt')).read_bytes();return b.decode('utf-16') if b.startswith((b'\xff\xfe',b'\xfe\xff')) else b.decode('utf-8-sig')
for name in ['browser','lint','build']:
 assert log(name+'-exit').strip()=='0',name+' FAILED_PRESERVED'
assert re.search(r'(?m)^\s*78 passed ',log('browser')),'BROWSER_TOTAL'
assert '66/66' in log('build'),'BUILD_TOTAL'
assert log('causal-exit').strip()=='1'
assert re.search(r'(?m)^\s*1 failed',log('causal'))
for x in j['candidate_fingerprints']:assert hashlib.sha256((r/x['path']).read_bytes().replace(b'\r\n',b'\n')).hexdigest()==x['sha256_utf8_lf'],x['path']
assert subprocess.check_output(['git','-C',str(r),'branch','--show-current'],text=True).strip()==j['branch']
if sys.argv[1]=='preflight':
 assert subprocess.check_output(['git','-C',str(r),'rev-parse','HEAD'],text=True).strip()==j['base']
 assert {s[3:].replace(chr(92),'/') for s in subprocess.check_output(['git','-C',str(r),'status','--porcelain'],text=True).splitlines()}=={x['path'] for x in j['candidate_fingerprints']}
 subprocess.run(['git','-C',str(r),'diff','--check'],check=True)
 scan=subprocess.run([str(w/'tools/gitleaks-8.24.3/bin/gitleaks.exe'),'stdin','--redact','--no-banner'],input=b'\n'.join((r/x['path']).read_bytes() for x in j['candidate_fingerprints']),stdout=subprocess.PIPE,stderr=subprocess.STDOUT);(w/(prefix+'-scan.txt')).write_bytes(scan.stdout);assert scan.returncode==0
 j['status']='OWN78_BUILD66_LINT_SCAN_PASS_VISUAL_PARTIAL9_AUTH_NOT_RUN'
else:
 assert not subprocess.check_output(['git','-C',str(r),'status','--porcelain'],text=True).strip()
 pub=json.loads((w/(prefix+'-publication.json')).read_text(encoding='utf-8-sig'));assert pub['publication']=='PUBLISHED';j.update(pub);j['status']='PUBLISHED_OWN78_BUILD66_VISUAL_PARTIAL9_AUTH_NOT_RUN'
assert j['visual_review']['status']=='ACTUALLY_VIEWED'
for f in j['visual_review']['frames']:assert hashlib.sha256(Path(f['path']).read_bytes()).hexdigest()==f['sha256']
j['checks'].update(browser='78_PASS_OWN_SOURCE',build='66_PASS',lint='EXIT0_WARNINGS_RETAINED_IN_LOG',scan='PASS',**{'global':'NOT_RUN_CURRENT_SHA'})
j['evidence']=[{'path':str(w/(prefix+'-'+s+'.txt')),'sha256':hashlib.sha256((w/(prefix+'-'+s+'.txt')).read_bytes()).hexdigest()} for s in ['causal','browser','lint','build','scan']]
j['next']='TEL069 individual bounded review with fresh CLAIM after publication; no inheritance of global1266 or whole capability acceptance'
save(cp,j)
for name in ['outputs/CRM-recuperacion-inventario.json','work/canonical-next-composition-metadata.json','work/current-authorized-execution-unit.json','work/w2x-current-execution-unit.json']:
 p=w.parent/name;d=json.loads(p.read_text(encoding='utf-8-sig'));t=d if name.endswith('w2x-current-execution-unit.json') else d.setdefault('w2x_recovery',{});t['active_commercial_unit']=j;save(p,d)
p=w/'w2x-commercial-continuation-orchestration.json';d=json.loads(p.read_text(encoding='utf-8-sig'));d['source35'].update(status=j['status'],sha=j.get('sha'),publication=j.get('publication'));d['next']=j['next'];save(p,d)
if 'sha' in j:
 p=w/'w2x-units-index.json';d=json.loads(p.read_text(encoding='utf-8-sig'))
 for row in d['current_working_checkouts']:
  if row['path'].endswith('crm-w2x-document-upload-uncertain'):row.update(sha=j['sha'],branch=j['branch'],clean=True,branch_published=True,status=j['status'])
 save(p,d)
print(json.dumps({'status':j['status'],'sha':j.get('sha')}))

