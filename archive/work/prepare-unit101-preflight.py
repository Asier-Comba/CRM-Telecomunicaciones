from pathlib import Path
import json
w=Path('work');s=(w/'preflight-unit99.py').read_text(encoding='utf-8').replace("p='w2x-customer-list-page-focus'","p='w2x-customer-list-refresh-focus'").replace('78 passed','93 passed').replace('78 tests in 8 files','93 tests in 9 files')
a=s.index("paths=['src/features/customers/");b=s.index("assert not git('diff','--check')")
s=s[:a]+'''paths=['src/features/customers/IntegratedCustomers.tsx','tests/e2e-preview/customer-list-refresh-focus.spec.ts','docs/master/W2X_CUSTOMER_LIST_REFRESH_FOCUS_20261019.md']
dirty=[line[3:] for line in subprocess.check_output(['git','-C',str(r),'status','--porcelain']).decode('utf-8').splitlines()]
assert set(dirty)==set(paths),(dirty,paths)
change=read(w/(p+'-source-reversal.json'));text=(r/paths[0]).read_text(encoding='utf-8');assert text.count(change['after'])==1
before=(w/(p+'-product-before.tsx')).read_text(encoding='utf-8');assert text.replace(change['after'],change['before'])==before and git('show','HEAD:'+paths[0])==before.strip()
assert (r/paths[1]).read_bytes()==(w/(p+'-final-bank.ts')).read_bytes()==(w/(p+'-causal-bank.ts')).read_bytes()
'''+s[b:]
s=s.replace("glob('**/customer-page-focus-*.png'));assert len(frames)==12","glob('**/customer-refresh-focus-*.png'));assert len(frames)==15").replace('len(obs)==12','len(obs)==15').replace("x['interaction']=='PAGINATION_FOCUS_AND_SUPERSESSION_PASS'","x['interaction']=='REFRESH_RETRY_FOCUS_AND_SUPERSESSION_PASS'").replace("x['mode'] in ['success','denied']","x['mode'] in ['success','denied','retry_success']")
s=s.replace('OWN78_BUILD66_VISUAL12','OWN93_BUILD66_VISUAL15').replace('controls_session=9111','controls_session=1405').replace("browser='78_PASS_OWN_SOURCE'","browser='93_PASS_OWN_SOURCE'").replace('12currentframes success/denied/chosen/filter_supersedes3907681440;errorbeforepreviousrecoveryDOMonly;filter390recordbelowviewportwithopenfiltersDOMonly;notallcolumns/Nextnavigation/roles/a11yacceptance','15currentframes success/denied/chosen/retry/filter_supersedes3907681440;deniedbeforeretryrecoveryDOMonly;chosen390recordbelowviewportDOMonly;notallfields/Nextnavigation/roles/a11yacceptance')
(w/'preflight-unit101.py').write_text(s,encoding='utf-8')
p=w/'w2x-customer-list-refresh-focus-checkpoint.json';j=json.loads(p.read_text(encoding='utf-8-sig'));j['failures']=['work/w2x-customer-list-refresh-focus-montage-failure.json'];p.write_text(json.dumps(j,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
p=w/'crm-w2x-document-upload-uncertain/docs/master/W2X_CUSTOMER_LIST_REFRESH_FOCUS_20261019.md';s=p.read_text(encoding='utf-8');s=s.replace('IntegratedCustomers, Customers, repository y parsers reales','El auxiliar de montaje de capturas tuvo un error de comillas antes de crear sus salidas; las15 imágenes originales se conservaron y se corrigió el script mediante archivo UTF8, sin repetir pruebas. No es un fallo del producto ni cambia el93PASS.\n\nIntegratedCustomers, Customers, repository y parsers reales');p.write_text(s,encoding='utf-8')
