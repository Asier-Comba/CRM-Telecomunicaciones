from pathlib import Path
import json,subprocess,hashlib,sys,re
w=Path(__file__).resolve().parent;r=w/'crm-w2x-document-upload-uncertain';prefix='w2x-proposal-review-commercial';p=w/(prefix+'-checkpoint.json')
def save(p,d):p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def log(s):
 b=(w/(prefix+'-'+s+'.txt')).read_bytes();return b.decode('utf-16') if b.startswith((b'\xff\xfe',b'\xfe\xff')) else b.decode('utf-8-sig')
j=json.loads(p.read_text(encoding='utf-8-sig')) if p.exists() else {'unit':45,'claim':6214203401,'base':'672b59c8a238f4e2857371523206b6f73b23ffda','branch':'codex/w2x-proposal-review-commercial-20261016','status':'OWN9_CONTROLS_RUNNING','controls_session':60461,'product_changed':False,'release':'NOT_ACCEPTED','checks':{'auth_db':'NOT_RUN','model':'NOT_RUN','paid_api':0,'global':'NOT_RUN_CURRENT_SHA'},'next':'Finish own new commercial review controls;preserve fixture failure separately;publish then individually reconcile supported requirement.'}
if sys.argv[1]=='preflight':
 old=(w/(prefix+'-attempt1-test.ts')).read_text(encoding='utf-8-sig').replace('\r\n','\n');new=(r/'tests/e2e-preview/billing-proposal-review-commercial.spec.ts').read_text(encoding='utf-8').replace('\r\n','\n')
 assert old.replace("await reply({contract_version:'billing.v1',command_id:q.input.command_id,operation:q.operation,id:createdId,version:1,status:'draft',number:null});return","await route.fulfill({json:{ok:true,receipt:{contract_version:'billing.v1',command_id:q.input.command_id,operation:q.operation,id:createdId,version:1,status:'draft',number:null}}});return")==new,'FIXTURE_ENVELOPE_ONLY_6_PASS_BEHAVIORS_UNCHANGED'
 assert log('browser-exit').strip()=='1' and re.search(r'(?m)^\s*3 failed',log('browser')) and re.search(r'(?m)^\s*6 passed',log('browser'))
 assert log('failed3-exit').strip()=='0' and re.search(r'(?m)^\s*3 passed',log('failed3'))
 for s in ['lint','build']:assert log(s+'-exit').strip()=='0'
 assert '66/66' in log('build')
 assert subprocess.check_output(['git','-C',str(r),'rev-parse','HEAD'],text=True).strip()==j['base']
 assert not subprocess.check_output(['git','-C',str(r),'diff','--name-only',j['base'],'--','src'],text=True).strip(),'PRODUCT_UNCHANGED'
 paths=['tests/e2e-preview/billing-proposal-review-commercial.spec.ts','docs/master/W2X_PROPOSAL_REVIEW_COMMERCIAL_20261016.md']
 assert {s[3:].replace(chr(92),'/') for s in subprocess.check_output(['git','-C',str(r),'status','--porcelain'],text=True).splitlines()}==set(paths)
 j['candidate_fingerprints']=[{'path':x,'sha256_utf8_lf':hashlib.sha256((r/x).read_bytes().replace(b'\r\n',b'\n')).hexdigest()} for x in paths]
 subprocess.run(['git','-C',str(r),'diff','--check'],check=True)
 scan=subprocess.run([str(w/'tools/gitleaks-8.24.3/bin/gitleaks.exe'),'stdin','--redact','--no-banner'],input=b'\n'.join((r/x).read_bytes() for x in paths),stdout=subprocess.PIPE,stderr=subprocess.STDOUT);(w/(prefix+'-scan.txt')).write_bytes(scan.stdout);assert scan.returncode==0
 j.update(status='OWN6_PLUS3_COMPLEMENTARY_PASS_ORIGINAL9_FAILURE_PRESERVED',original={'failed':3,'passed':6,'cause':'Test fixture command response used data instead of required receipt;no product defect established','log':str(w/(prefix+'-browser.txt'))},checks={'browser':'6_ORIGINAL_PASS_PLUS3_FAILED_ONLY_COMPLEMENTARY_PASS_NOT9_SINGLE_PASS','build':'66_PASS','lint':'EXIT0_WARNINGS_PRESERVED','scan':'PASS','global':'NOT_RUN_CURRENT_SHA','auth_db':'NOT_RUN','model':'NOT_RUN','paid_api':0})
 frames=list((w/(prefix+'-failed3-results')).rglob('review-actions-editable-save-*.png'))+[x for x in (w/(prefix+'-results')).rglob('review-actions-review-reset-*.png') if x.name.endswith(('-390.png','-1440.png'))]
 assert len(frames)==5
 j['visual_review']={'status':'ACTUALLY_VIEWED','scope':'Lower drawer concepts/numeric fields/totals/review/actions;edited3widths,review reset390/1440;customer/date header outside viewport;partial only','frames':[{'path':str(x),'sha256':hashlib.sha256(x.read_bytes()).hexdigest()} for x in frames]}
 j['evidence']=[{'path':str(w/(prefix+'-'+s+'.txt')),'sha256':hashlib.sha256((w/(prefix+'-'+s+'.txt')).read_bytes()).hexdigest()} for s in ['browser','failed3','lint','build','scan']]
elif sys.argv[1]=='published':
 pub=json.loads((w/(prefix+'-publication.json')).read_text(encoding='utf-8-sig'));assert pub['publication']=='PUBLISHED';j.update(pub);j['status']='PUBLISHED_6_PLUS3_COMPLEMENTARY_NOT9_SINGLE_PASS';assert not subprocess.check_output(['git','-C',str(r),'status','--porcelain'],text=True).strip()
save(p,j)
for name in ['outputs/CRM-recuperacion-inventario.json','work/canonical-next-composition-metadata.json','work/current-authorized-execution-unit.json','work/w2x-current-execution-unit.json']:
 q=w.parent/name;d=json.loads(q.read_text(encoding='utf-8-sig'));t=d if name.endswith('w2x-current-execution-unit.json') else d.setdefault('w2x_recovery',{});t['active_commercial_unit']=j;save(q,d)
q=w/'w2x-commercial-continuation-orchestration.json';d=json.loads(q.read_text(encoding='utf-8-sig'));d.setdefault('source45',{}).update(status=j['status'],sha=j.get('sha'),publication=j.get('publication'));d['next']=j['next'];save(q,d)
q=w/'w2x-units-index.json';d=json.loads(q.read_text(encoding='utf-8-sig'))
if str(p) not in d['unit_checkpoints'] and 'work/'+p.name not in d['unit_checkpoints']:d['unit_checkpoints'].append('work/'+p.name)
for row in d['current_working_checkouts']:
 if row['path'].endswith('crm-w2x-document-upload-uncertain'):row.update(sha=j.get('sha',j['base']),base=j['base'],branch=j['branch'],clean=sys.argv[1]=='published',branch_published=sys.argv[1]=='published',status=j['status'])
save(q,d)
print(json.dumps({'status':j['status'],'sha':j.get('sha')}))
