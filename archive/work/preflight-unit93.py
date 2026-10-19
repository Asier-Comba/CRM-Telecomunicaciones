from pathlib import Path
import json,hashlib,subprocess,re
w=Path(__file__).resolve().parent;r=w/'crm-w2x-document-upload-uncertain';p='w2x-calendar-event-title-wrap'
def read(f):return json.loads(f.read_text(encoding='utf-8-sig'))
def save(f,j):f.write_text(json.dumps(j,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def log(name):
 b=(w/(p+'-'+name+'.txt')).read_bytes()
 return b.decode('utf-16' if b.startswith((b'\xff\xfe',b'\xfe\xff')) else 'utf-8-sig')
def git(*args):return subprocess.check_output(['git','-C',str(r),*args]).decode('utf-8').strip()
j=read(w/(p+'-checkpoint.json'));assert git('branch','--show-current')==j['branch'];assert git('rev-parse','HEAD')==j['base']
for name in ['browser','lint','build','collection']:assert log(name+'-exit').strip()=='0',name
assert '72 passed' in log('browser') and 'Total: 72 tests in 6 files' in log('collection')
assert '66/66' in log('build')
paths=['src/features/calendar/Calendar.tsx','tests/e2e-preview/fixtures/calendar-focus-entry.tsx','tests/e2e-preview/calendar-event-title-wrap.spec.ts','docs/master/W2X_CALENDAR_EVENT_TITLE_WRAP_20261019.md']
dirty=[line[3:] for line in subprocess.check_output(['git','-C',str(r),'status','--porcelain']).decode('utf-8').splitlines()]
assert set(dirty)==set(paths),(dirty,paths)
before=(w/(p+'-product-before.tsx')).read_text(encoding='utf-8');after=(r/paths[0]).read_text(encoding='utf-8')
assert after.replace('mb-1 block min-w-0 w-full rounded border-l-2 p-1.5','mb-1 block w-full rounded border-l-2 p-1.5').replace("compact?'block truncate font-semibold':'block min-w-0 [overflow-wrap:anywhere] font-semibold'","compact?'block truncate font-semibold':'block font-semibold'")==before
assert git('show','HEAD:'+paths[0])==before.strip()
base=git('show','HEAD:'+paths[1]);fixture=(r/paths[1]).read_text(encoding='utf-8')
fixture=fixture.replace("const titleProbe=new URLSearchParams(location.hash.slice(1)).get('titleProbe')\n",'').replace("title:titleProbe==='long'?'Cita'+ 'X'.repeat(156):'Synthetic meeting'","title:'Synthetic meeting'").replace('onSelect={titleProbe ? undefined : ()=>{}}','onSelect={()=>{}}')
assert fixture.strip()==base
assert (r/paths[2]).read_bytes()==(w/(p+'-final-bank.ts')).read_bytes()
assert not git('diff','--check')
frames=sorted((w/(p+'-final-results')).glob('**/calendar-title-*.png'));assert len(frames)==12
obs=sorted({f.parent/'observations.json' for f in frames});assert len(obs)==6 and all(f.exists() for f in obs)
records=[]
for f in obs:
 x=read(f);assert x['errors']==[] and x['interaction']=='DETAIL_OPEN_CLOSE_PASS';assert x['geometry']['right']<=x['geometry']['sectionRight']+1
 records.append(x)
scan=subprocess.run([str(w/'tools/gitleaks-8.24.3/bin/gitleaks.exe'),'stdin','--redact','--no-banner'],input=b'\n'.join((r/x).read_bytes() for x in paths),stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
(w/(p+'-scan.txt')).write_bytes(scan.stdout);assert scan.returncode==0
j.update(status='OWN72_BUILD66_VISUAL12_PREFLIGHT_PASS',browser_summary=re.search(r'72 passed[^\r\n]*',log('browser')).group(0),controls_session=51709)
j['checks'].update(browser='72_PASS_OWN_SOURCE',build='66_PASS',lint='EXIT0_WARNINGS_PRESERVED',scan='PASS')
j['visual_review']={'status':'ACTUALLY_VIEWED','scope':'12framesAgenda/detail long/ordinary at3907681440;upcoming390and1440partlybelowviewportDOMgeometry only;notwholecalendar/roles/a11yacceptance','frames':[{'path':str(f),'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for f in frames]}
j['observations']=records
j['candidate_fingerprints']=[{'path':x,'sha256_utf8_lf':hashlib.sha256((r/x).read_text(encoding='utf-8').replace('\r\n','\n').encode()).hexdigest()} for x in paths]
j['evidence']=[{'path':str(f),'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for f in sorted(w.glob(p+'-*.txt'))]
j['known_remaining_defects']={'whole_product':'NOT_RECONCILED','calendar_integrated':'NOT_RUN_PRESENTATION_FIXTURE','security':'W4_PENDING_HIGH5','release':'NOT_ACCEPTED'}
save(w/(p+'-checkpoint.json'),j)
print(json.dumps({'preflight':'PASS','browser':j['browser_summary'],'frames':len(frames),'paths':len(paths)}))
