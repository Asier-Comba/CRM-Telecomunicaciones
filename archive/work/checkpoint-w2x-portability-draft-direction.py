from pathlib import Path
import json,hashlib,subprocess,re,sys
w=Path(__file__).resolve().parent;r=w/'crm-w2x-document-upload-uncertain';cp=w/'w2x-portability-draft-direction-checkpoint.json';j=json.loads(cp.read_text(encoding='utf-8-sig'))
def save(p,d):p.write_bytes((json.dumps(d,ensure_ascii=False,indent=2)+'\n').encode('utf-8'))
pub=sys.argv[1]=='published'
def read_log(p):
 b=p.read_bytes()
 return b.decode('utf-16') if b.startswith((bytes.fromhex('fffe'),bytes.fromhex('feff'))) else b.decode('utf-8-sig')
for suffix in ['lint','build','browser']:
 assert (w/('w2x-portability-draft-direction-'+suffix+'-exit.txt')).read_text(encoding='utf-8-sig').strip()=='0',suffix
assert re.search(r'(?m)^\s*39 passed ',read_log(w/'w2x-portability-draft-direction-browser.txt'))
assert '66/66' in read_log(w/'w2x-portability-draft-direction-build.txt')
for x in j['candidate_fingerprints']:assert hashlib.sha256((r/x['path']).read_bytes().replace(b'\r\n',b'\n')).hexdigest()==x['sha256_utf8_lf'],x['path']
assert subprocess.check_output(['git','-C',str(r),'branch','--show-current'],text=True).strip()==j['branch']
if not pub:
 assert subprocess.check_output(['git','-C',str(r),'rev-parse','HEAD'],text=True).strip()==j['base']
 assert {s[3:].replace(chr(92),'/') for s in subprocess.check_output(['git','-C',str(r),'status','--porcelain'],text=True).splitlines()}=={x['path'] for x in j['candidate_fingerprints']}
 subprocess.run(['git','-C',str(r),'diff','--check'],check=True)
 scan=subprocess.run([str(w/'tools/gitleaks-8.24.3/bin/gitleaks.exe'),'stdin','--redact','--no-banner'],input=b'\n'.join((r/x['path']).read_bytes() for x in j['candidate_fingerprints']),stdout=subprocess.PIPE,stderr=subprocess.STDOUT);(w/'w2x-portability-draft-direction-scan.txt').write_bytes(scan.stdout);assert scan.returncode==0
else:
 assert not subprocess.check_output(['git','-C',str(r),'status','--porcelain'],text=True).strip()
 result=json.loads((w/'w2x-portability-draft-direction-publication.json').read_text(encoding='utf-8-sig'));j.update(result)
j.update(status='OWN39_BUILD66_LINT0ERRORS3WARN_SCAN_PASS_VISUAL_NOT_REVIEWED_AUTH_NOT_RUN',checks={'browser':39,'build':66,'lint':'0_ERRORS_3_WARNINGS_VISIBLE','scan':'PASS','visual':'NOT_REVIEWED','auth_db':'NOT_RUN','model':'NOT_RUN'},published=pub,next='ACTUAL_VISUAL_REVIEW;GLOBAL6B469_ORIGINAL_FAIL_RECHECK2_SEPARATE;PAR073_METADATA_NEXT')
j['evidence']=[{'path':str(w/f),'sha256':hashlib.sha256((w/f).read_bytes()).hexdigest()} for f in ['w2x-portability-draft-direction-causal.txt','w2x-portability-draft-direction-browser.txt','w2x-portability-draft-direction-lint.txt','w2x-portability-draft-direction-build.txt','w2x-portability-draft-direction-scan.txt']]
save(cp,j)
for n in ['outputs/CRM-recuperacion-inventario.json','work/canonical-next-composition-metadata.json','work/current-authorized-execution-unit.json','work/w2x-current-execution-unit.json']:
 p=w.parent/n;d=json.loads(p.read_text(encoding='utf-8-sig'));t=d if n.endswith('w2x-current-execution-unit.json') else d.setdefault('w2x_recovery',{})
 if pub:t['closed_portability_draft_direction']={'checkpoint':str(cp),'sha':j['sha'],'status':j['status'],'published':True}
 if t.get('active_commercial_unit',{}).get('claim')==j['claim']:t['active_commercial_unit']={'checkpoint':str(cp),'claim':j['claim'],'branch':j['branch'],'status':j['status'],'published':pub,'next':j['next'],**({'sha':j['sha']} if pub else {'base':j['base']})}
 save(p,d)
print(json.dumps({'published':pub,'sha':j.get('sha'),'status':j['status']}))
