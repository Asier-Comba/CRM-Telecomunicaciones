from pathlib import Path
import json,hashlib,subprocess,re,sys
w=Path(__file__).resolve().parent;r=w/'crm-w2x-document-upload-uncertain';p=w/'w2x-portability-operator-captions-checkpoint.json';j=json.loads(p.read_text(encoding='utf-8-sig'));pub=sys.argv[1]=='published'
def read(p):
 b=p.read_bytes();return b.decode('utf-16') if b.startswith((bytes.fromhex('fffe'),bytes.fromhex('feff'))) else b.decode('utf-8-sig')
def save(p,d):p.write_bytes((json.dumps(d,ensure_ascii=False,indent=2)+'\n').encode('utf-8'))
for kind in ['lint','build','browser']:assert read(w/('w2x-portability-operator-captions-final3-'+kind+'-exit.txt')).strip()=='0',kind
assert read(w/'w2x-portability-operator-captions-lint-exit.txt').strip()=='0'
assert '66/66' in read(w/'w2x-portability-operator-captions-final3-build.txt')
assert re.search(r'(?m)^\s*3 passed ',read(w/'w2x-portability-operator-captions-final3-browser.txt'))
first=read(w/'w2x-portability-operator-captions-browser.txt');assert '33 passed' in first and '3 failed' in first and first.count('Received length: 0')==3
for x in j['candidate_fingerprints']+j['unchanged_ui_fingerprints']:assert hashlib.sha256((r/x['path']).read_bytes().replace(b'\r\n',b'\n')).hexdigest()==x['sha256_utf8_lf'],x['path']
assert subprocess.check_output(['git','-C',str(r),'branch','--show-current'],text=True).strip()==j['branch']
if not pub:
 assert subprocess.check_output(['git','-C',str(r),'rev-parse','HEAD'],text=True).strip()==j['base']
 assert {s[3:].replace(chr(92),'/') for s in subprocess.check_output(['git','-C',str(r),'status','--porcelain'],text=True).splitlines()}=={x['path'] for x in j['candidate_fingerprints']}
 subprocess.run(['git','-C',str(r),'diff','--check'],check=True)
 scan=subprocess.run([str(w/'tools/gitleaks-8.24.3/bin/gitleaks.exe'),'stdin','--redact','--no-banner'],input=b'\n'.join((r/x['path']).read_bytes() for x in j['candidate_fingerprints']),stdout=subprocess.PIPE,stderr=subprocess.STDOUT);(w/'w2x-portability-operator-captions-scan.txt').write_bytes(scan.stdout);assert scan.returncode==0
else:
 assert not subprocess.check_output(['git','-C',str(r),'status','--porcelain'],text=True).strip();j.update(json.loads(read(w/'w2x-portability-operator-captions-publication.json')))
j.update(status='OWN3_FINAL_PLUS33_COMPLEMENTARY_BUILD66_SCAN_PASS_VISUAL_NOT_REVIEWED_AUTH_NOT_RUN',published=pub,checks={'browser_final':3,'prior_complementary':33,'first36':'33PASS_3FAIL_FIXTURE_PRESERVED','ui_fingerprints':'IDENTICAL_BETWEEN_ATTEMPTS','build_final':66,'lint':'PRIOR_FULL0ERRORS3WARN_FINAL_CHANGED_TEST0ERRORS0WARN','scan':'PASS','visual':'NOT_REVIEWED','auth_db':'NOT_RUN','model':'NOT_RUN'},next='ACTUAL_FINAL3_SCROLLED_FIELDS_VISUAL;NO36_SINGLE_PASS_CLAIM;GLOBAL981_SOURCE6B469_NOT_INHERITED')
j['evidence']=[{'path':str(w/f),'sha256':hashlib.sha256((w/f).read_bytes()).hexdigest()} for f in ['w2x-portability-operator-captions-causal.txt','w2x-portability-operator-captions-browser.txt','w2x-portability-operator-captions-final3-browser.txt','w2x-portability-operator-captions-lint.txt','w2x-portability-operator-captions-final3-lint.txt','w2x-portability-operator-captions-final3-build.txt','w2x-portability-operator-captions-scan.txt']]
save(p,j)
for n in ['outputs/CRM-recuperacion-inventario.json','work/canonical-next-composition-metadata.json','work/current-authorized-execution-unit.json','work/w2x-current-execution-unit.json']:
 p=w.parent/n;d=json.loads(read(p));t=d if n.endswith('w2x-current-execution-unit.json') else d.setdefault('w2x_recovery',{})
 if pub:t['closed_portability_operator_captions']={'checkpoint':str(w/'w2x-portability-operator-captions-checkpoint.json'),'sha':j['sha'],'status':j['status']}
 if t.get('active_commercial_unit',{}).get('claim')==j['claim']:t['active_commercial_unit']={'claim':j['claim'],'branch':j['branch'],'checkpoint':str(w/'w2x-portability-operator-captions-checkpoint.json'),'status':j['status'],'published':pub,'next':j['next'],**({'sha':j['sha']} if pub else {'base':j['base']})}
 save(p,d)
print(json.dumps({'published':pub,'sha':j.get('sha'),'status':j['status']}))
