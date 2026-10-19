from pathlib import Path
w=Path('work');s=(w/'preflight-unit93.py').read_text(encoding='utf-8');s=s.replace("p='w2x-calendar-event-title-wrap'","p='w2x-customer-domain-title-wrap'").replace('72 passed','75 passed').replace('72 tests','75 tests')
a=s.index("paths=['src/features/calendar/");b=s.index("assert not git('diff','--check')")
s=s[:a]+'''paths=['src/features/customers/CustomerDomainPages.tsx','tests/e2e-preview/customer-domain-title-wrap.spec.ts','docs/master/W2X_CUSTOMER_DOMAIN_TITLE_WRAP_20261019.md']
dirty=[line[3:] for line in subprocess.check_output(['git','-C',str(r),'status','--porcelain']).decode('utf-8').splitlines()]
assert set(dirty)==set(paths),(dirty,paths)
before=(w/(p+'-product-before.tsx')).read_text(encoding='utf-8');after=(r/paths[0]).read_text(encoding='utf-8')
assert after.replace('<h3 className="mb-3 min-w-0 max-w-full [overflow-wrap:anywhere] font-semibold">','<h3 className="mb-3 font-semibold">')==before
assert git('show','HEAD:'+paths[0])==before.strip()
assert (r/paths[1]).read_bytes()==(w/(p+'-causal-bank.ts')).read_bytes()
'''+s[b:]
s=s.replace("glob('**/calendar-title-*.png'));assert len(frames)==12","glob('**/customer-service-title-*.png'));assert len(frames)==9").replace('len(obs)==6','len(obs)==9')
s=s.replace("x=read(f);assert x['errors']==[] and x['interaction']=='DETAIL_OPEN_CLOSE_PASS';assert x['geometry']['right']<=x['geometry']['sectionRight']+1", "x=read(f);assert x['errors']==[] and x['commands']==[] and x['unexpected']==[]\n if x.get('geometry'):assert x['geometry']['titleScroll']<=x['geometry']['titleClient']+1 and x['geometry']['scroll']<=x['geometry']['client']+1\n if x['mode']=='denied':assert [r['operation'] for r in x['reads']]==['service.list']")
s=s.replace('OWN72_BUILD66_VISUAL12_PREFLIGHT_PASS','OWN75_BUILD66_VISUAL9_PREFLIGHT_PASS').replace('controls_session=51709','controls_session=38603').replace("browser='72_PASS_OWN_SOURCE'","browser='75_PASS_OWN_SOURCE'")
s=s.replace("'scope':'12framesAgenda/detail long/ordinary at3907681440;upcoming390and1440partlybelowviewportDOMgeometry only;notwholecalendar/roles/a11yacceptance'","'scope':'9primary frames long/ordinary/denied at3907681440;cards390768,table1440withintentionalhorizontal scroll;no allcolumns/wholeproduct/roles/a11yacceptance'").replace("'calendar_integrated':'NOT_RUN_PRESENTATION_FIXTURE'","'other_domain_labels':'NOT_INDIVIDUALLY_QUALIFIED_BY_SERVICE_LABEL_TESTS'")
(w/'preflight-unit94.py').write_text(s,encoding='utf-8')
