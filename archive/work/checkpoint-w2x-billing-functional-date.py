from pathlib import Path
import json,subprocess,hashlib,sys
w=Path(__file__).resolve().parent;r=w/'crm-w2x-document-upload-uncertain';p='w2x-billing-functional-date';cp=w/(p+'-checkpoint.json')
def read(x):return json.loads(x.read_text(encoding='utf-8-sig'))
def save(x,d):x.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def log(n):
 b=(w/n).read_bytes();return b.decode('utf-16') if b.startswith((b'\xff\xfe',b'\xfe\xff')) else b.decode('utf-8-sig')
j=read(cp);original=log('w2x-billing-functional-own-original.txt');new=log(p+'-failed5.txt')
assert log('w2x-billing-functional-own-original-exit.txt').strip()=='1' and 'pass 35' in original and 'fail 5' in original and 'tests 40' in original
assert log(p+'-failed5-exit.txt').strip()=='0' and 'pass 5' in new and 'fail 0' in new and 'tests 5' in new
assert not subprocess.check_output(['git','-C',str(r),'diff',j['base'],'--','src','docs/master/PRODUCT_RELEASE_QUEUE.json','docs/master/PRODUCT_RELEASE_REVIEWS.json'])
test='tests/bootstrap/billing-current-madrid-day.test.mjs';text=(r/test).read_text(encoding='utf-8');parent=subprocess.check_output(['git','-C',str(r),'show',j['base']+':'+test]).decode('utf-8').replace('\r\n','\n')
reverse=text.replace("const evaluated=runInNewContext(site.expression", "const day=runInNewContext(site.expression").replace("  // PromptBuilder resolves the current-day callback when generating a proposal.\n  assert.equal(typeof evaluated,'function')\n  const day=evaluated()\n  assert.equal(day,expected)\n",'').replace('}else assert.equal(evaluated,expected)','}else assert.equal(day,expected)');assert reverse==parent,'ONLY_CALLBACK_ADAPTER_WITH_EXTRA_TYPE_DATE_ASSERTIONS'
paths=[test,'docs/master/W2X_BILLING_FUNCTIONAL_DATE_20261018.md']
if sys.argv[1]=='preflight':
 assert subprocess.check_output(['git','-C',str(r),'rev-parse','HEAD'],text=True).strip()==j['base']
 assert {s[3:].replace(chr(92),'/') for s in subprocess.check_output(['git','-C',str(r),'status','--porcelain'],text=True).splitlines()}==set(paths)
 subprocess.run(['git','-C',str(r),'diff','--check'],check=True)
 assert log(p+'-lint-exit.txt').strip()=='0'
 scan=subprocess.run([str(w/'tools/gitleaks-8.24.3/bin/gitleaks.exe'),'stdin','--redact','--no-banner'],input=b'\n'.join((r/x).read_bytes() for x in paths),stdout=subprocess.PIPE,stderr=subprocess.STDOUT);(w/(p+'-scan.txt')).write_bytes(scan.stdout);assert scan.returncode==0
 j['candidate_fingerprints']=[{'path':x,'sha256_utf8_lf':hashlib.sha256((r/x).read_bytes().replace(b'\r\n',b'\n')).hexdigest()} for x in paths]
 j['status']='OWN_FAILED5_PASS_TEST_ADAPTER_ONLY_ORIGINAL40FAIL_PRESERVED'
else:
 pub=read(w/(p+'-publication.json'));assert pub['publication']=='PUBLISHED';j.update(pub);j['status']='PUBLISHED_OWN5_PASS_ORIGINAL35PASS5FAIL_SOURCE58_PRESERVED'
 assert not subprocess.check_output(['git','-C',str(r),'status','--porcelain'],text=True).strip()
 for x in j['candidate_fingerprints']:assert hashlib.sha256((r/x['path']).read_bytes().replace(b'\r\n',b'\n')).hexdigest()==x['sha256_utf8_lf']
j['evidence']=[{'path':str(w/x),'sha256':hashlib.sha256((w/x).read_bytes()).hexdigest()} for x in ['w2x-billing-functional-own-original.txt',p+'-failed5.txt',p+'-lint.txt',p+'-scan.txt']]
save(cp,j)
for n in ['outputs/CRM-recuperacion-inventario.json','work/canonical-next-composition-metadata.json','work/current-authorized-execution-unit.json','work/w2x-current-execution-unit.json']:
 f=w.parent/n;d=read(f);t=d if n.endswith('w2x-current-execution-unit.json') else d.setdefault('w2x_recovery',{});t['active_commercial_unit']=j;save(f,d)
f=w/'w2x-commercial-continuation-orchestration.json';d=read(f);d['source60']={'checkpoint':str(cp),'sha':j.get('sha'),'status':j['status'],'publication':j.get('publication')};d['next']=j['next'];save(f,d)
f=w/'w2x-units-index.json';d=read(f);ref='work/'+cp.name
if ref not in d['unit_checkpoints']:d['unit_checkpoints'].append(ref)
for row in d['current_working_checkouts']:
 if row['path'].endswith('crm-w2x-document-upload-uncertain'):row.update(sha=j.get('sha',j['base']),branch=j['branch'],clean=sys.argv[1]=='published',branch_published=sys.argv[1]=='published',status=j['status'])
if j.get('publication')=='PUBLISHED' and not any(x.get('sha')==j['sha'] for x in d['published_own_sources']):d['published_own_sources'].append({'unit':60,'checkpoint':ref,'sha':j['sha'],'branch':j['branch'],'published':True,'clean_at_publication':True,'release':'NOT_ACCEPTED'})
save(f,d);print(json.dumps({'status':j['status'],'sha':j.get('sha')}))
