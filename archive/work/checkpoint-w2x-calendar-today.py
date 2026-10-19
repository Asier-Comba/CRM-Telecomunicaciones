from pathlib import Path
import json,subprocess,hashlib,re,sys
w=Path(__file__).resolve().parent;r=w/'crm-w2x-document-upload-uncertain';p='w2x-calendar-today';cp=w/(p+'-checkpoint.json')
def read(x):return json.loads(x.read_text(encoding='utf-8-sig'))
def save(x,d):x.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def log(s):
 b=(w/(p+'-'+s+'.txt')).read_bytes();return b.decode('utf-16') if b.startswith((b'\xff\xfe',b'\xfe\xff')) else b.decode('utf-8-sig')
j=read(cp) if cp.exists() else {'unit':53,'claim':6251289927,'base':'08407e1279b0088ca3817e0b7ce1ffe3494ca681','branch':'codex/w2x-calendar-today-20261018','status':'CAUSAL_CONTROLS_RUNNING','causal_session':18332,'product_changed':True,'release':'NOT_ACCEPTED','checks':{'auth_db':'NOT_RUN','model':'NOT_RUN','paid_api':0,'global':'NOT_RUN_CURRENT_SHA'},'next':'Finish original reproduction;only then use existing blocked to disable close control,own57/build/lint/visual/scan/publish;no inherited1416.'}
if sys.argv[1]!='running':
 assert log('causal-exit').strip()=='1' and re.search(r'(?m)^\s*1 failed',log('causal')) and re.search(r'(?m)^\s*2 passed',log('causal'))
 for s in ['browser','lint','build']:assert log(s+'-exit').strip()=='0',s+'FAILURE_PRESERVED'
 assert re.search(r'(?m)^\s*57 passed ',log('browser')) and '66/66' in log('build')
 def original(path):return subprocess.check_output(['git','-C',str(r),'show',j['base']+':'+path]).decode('utf-8').replace('\r\n','\n')
 path='src/features/calendar/Calendar.tsx';source=(r/path).read_text(encoding='utf-8');assert source.replace('  onToday,\n','').replace('  onToday?: () => string\n','').replace('setAnchor(onToday?.() ?? today)','setAnchor(today)')==original(path),'CALENDAR_TODAY_CALLBACK_ONLY_PREVIEW_DEFAULT_PRESERVED'
 path='src/features/calendar/IntegratedCalendar.tsx';assert (r/path).read_text(encoding='utf-8').replace('const [asOf,setAsOf]=useState','const [asOf]=useState').replace(' onToday={()=>{const now=new Date().toISOString();setAsOf(now);return calendarDate(now)}}','')==original(path),'INTEGRATED_SNAPSHOT_ON_EXPLICIT_TODAY_ONLY_NO_COMMAND_CHANGE'
 if sys.argv[1]=='preflight':
  assert subprocess.check_output(['git','-C',str(r),'rev-parse','HEAD'],text=True).strip()==j['base']
  paths=['src/features/calendar/Calendar.tsx','src/features/calendar/IntegratedCalendar.tsx','tests/e2e-preview/calendar-today.spec.ts','docs/master/W2X_CALENDAR_TODAY_20261018.md']
  assert {s[3:].replace(chr(92),'/') for s in subprocess.check_output(['git','-C',str(r),'status','--porcelain'],text=True).splitlines()}==set(paths)
  j['candidate_fingerprints']=[{'path':x,'sha256_utf8_lf':hashlib.sha256((r/x).read_bytes().replace(b'\r\n',b'\n')).hexdigest()} for x in paths]
  subprocess.run(['git','-C',str(r),'diff','--check'],check=True)
  scan=subprocess.run([str(w/'tools/gitleaks-8.24.3/bin/gitleaks.exe'),'stdin','--redact','--no-banner'],input=b'\n'.join((r/x).read_bytes() for x in paths),stdout=subprocess.PIPE,stderr=subprocess.STDOUT);(w/(p+'-scan.txt')).write_bytes(scan.stdout);assert scan.returncode==0
  assert j['visual_review']['status']=='ACTUALLY_VIEWED'
  for x in j['visual_review']['frames']:assert hashlib.sha256(Path(x['path']).read_bytes()).hexdigest()==x['sha256']
  j['status']='OWN57_BUILD66_LINT_SCAN_PASS_VISUAL_PARTIAL';j['checks'].update(browser='57_PASS_OWN_SOURCE',build='66_PASS',lint='EXIT0_WARNINGS_PRESERVED',scan='PASS')
 else:
  pub=read(w/(p+'-publication.json'));assert pub['publication']=='PUBLISHED';j.update(pub);j['status']='PUBLISHED_OWN57_BUILD66_VISUAL_PARTIAL';assert not subprocess.check_output(['git','-C',str(r),'status','--porcelain'],text=True).strip()
 j['evidence']=[{'path':str(w/(p+'-'+s+'.txt')),'sha256':hashlib.sha256((w/(p+'-'+s+'.txt')).read_bytes()).hexdigest()} for s in ['causal','browser','lint','build','scan']]
save(cp,j)
for name in ['outputs/CRM-recuperacion-inventario.json','work/canonical-next-composition-metadata.json','work/current-authorized-execution-unit.json','work/w2x-current-execution-unit.json']:
 q=w.parent/name;d=read(q);t=d if name.endswith('w2x-current-execution-unit.json') else d.setdefault('w2x_recovery',{});t['active_commercial_unit']=j;save(q,d)
q=w/'w2x-commercial-continuation-orchestration.json';d=read(q);d.setdefault('source53',{}).update(checkpoint=str(cp),status=j['status'],sha=j.get('sha'),publication=j.get('publication'));d['next']=j['next'];save(q,d)
q=w/'w2x-units-index.json';d=read(q);ref='work/'+cp.name
if ref not in d['unit_checkpoints']:d['unit_checkpoints'].append(ref)
for row in d['current_working_checkouts']:
 if row['path'].endswith('crm-w2x-document-upload-uncertain'):row.update(sha=j.get('sha',j['base']),base=j['base'],branch=j['branch'],clean=sys.argv[1]=='published',branch_published=sys.argv[1]=='published',status=j['status'])
if j.get('publication')=='PUBLISHED' and not any(x.get('sha')==j['sha'] for x in d['published_own_sources']):d['published_own_sources'].append({'unit':53,'checkpoint':ref,'branch':j['branch'],'sha':j['sha'],'published':True,'clean_at_publication':True,'release':'NOT_ACCEPTED'})
save(q,d)
print(json.dumps({'status':j['status'],'sha':j.get('sha')}))
