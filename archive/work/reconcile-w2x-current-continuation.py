from pathlib import Path
import json
w=Path(__file__).resolve().parent
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def save(p,d):p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
units=['billing-draft-receipt','billing-draft-close','billing-draft-registered','draft-save-review','calendar-today','portability-line-retirement','portability-detail-line','sim-detail-line','portability-create-parents','billing-exact-save','exact-save-review','billing-functional-date','billing-proposal-discount','billing-proposal-rates','billing-proposal-zero-tax','billing-zero-total-draft','billing-proposal-warnings','deterministic-parser-review','billing-initial-customer-merge','billing-search-review','billing-search-selection','billing-selection-review','billing-loaded-pages','billing-list-filter-response','billing-selected-customer-label','c360-customer-name-wrap','c360-company-facts-wrap','company-billing-review','c360-contact-text-wrap','billing-overdue-date-response','document-target-text-wrap','assistant-customer-name-wrap','assistant-panel-review','case-recovery-close','sim-recovery-close','contract-recovery-close','contract-created-read-binding','contract-create-read-retirement','portability-recovery-close','line-number-recovery-close','portability-recovery-review','sim-identifier-recovery-close','portfolio-result-label-wrap','portfolio-selected-title-wrap','calendar-event-title-wrap','customer-domain-title-wrap','customer-services-review','customer-list-name-wrap','customer-list-filter-priority','agenda-presentation-review','customer-list-page-focus','customer-pagination-review','customer-list-refresh-focus','customer-domain-table-title-wrap','domain-customer-label-wrap','domain-operator-label-wrap','domain-retry-focus','communications-page-focus','customer-communications-review','collection-page-error-back','communications-customer-scope','customer-communications-scope-review','customer-documents-read-recovery','customer-documents-recovery-review','document-destination-read-retirement']
p=w/'w2x-units-index.json';d=read(p);manifest=[]
for number,name in enumerate(units,49):
 cp=w/('w2x-'+name+'-checkpoint.json');j=read(cp);ref='work/'+cp.name
 if ref not in [x.replace(chr(92),'/') for x in d['unit_checkpoints']]:d['unit_checkpoints'].append(ref)
 item={'unit':number,'checkpoint':ref,'branch':j['branch'],'sha':j.get('sha'),'base':j['base'],'status':j['status'],'publication':j.get('publication','IN_PROGRESS'),'release':'NOT_ACCEPTED'};manifest.append(item)
 if j.get('publication')=='PUBLISHED' and not any(x.get('sha')==j['sha'] for x in d['published_own_sources']):
  assert j.get('handoffs');d['published_own_sources'].append({**item,'published':True,'clean_at_publication':True})
own53=read(w/'w2x-calendar-today-checkpoint.json');assert own53['publication']=='PUBLISHED'
calendar={'checkpoint':'work/w2x-commercial-calendar-full-checkpoint.json','source':own53['sha'],'session':15039,'status':'QUEUED_WAIT_PRIOR1434_TERMINAL_PUBLISHED_PASS','tests':1479,'files':92,'dispatch':'NOT_DISPATCHED_YET','next':'Keep checkout14 onBC3 while1434 runs;waiter15039 owns next1479 source53;do not duplicate/cancel/publish over active checks.'}
request=w/'w2x-commercial-calendar-full-requested.json';terminal=w/'w2x-commercial-calendar-full-checkpoint.json'
if terminal.exists():
 t=read(terminal);calendar.update(status=t['status'],publication=t.get('publication'),dispatch='TERMINAL')
elif request.exists():calendar.update(status='RUNNING_ONCE',dispatch='REQUESTED_ONCE')
for row in d['current_working_checkouts']:
 if row['path'].endswith('crm-w2x-commercial-composition') and request.exists() and not (w/'w2x-commercial-line-context-full-requested.json').exists():row.update(sha=own53['sha'],branch='DETACHED',clean=True,branch_published=True,status=calendar['status'],active_global=calendar)
save(p,d)
save(w/'w2x-commercial-calendar-full-queue-state.json',calendar)
for n in ['outputs/CRM-recuperacion-inventario.json','work/canonical-next-composition-metadata.json','work/current-authorized-execution-unit.json','work/w2x-current-execution-unit.json']:
 p=w.parent/n;v=read(p);t=v if n.endswith('w2x-current-execution-unit.json') else v.setdefault('w2x_recovery',{});t['commercial_calendar_full_coverage']=calendar;t['latest_continuation_manifest']={'manifest':'work/w2x-units49-113-recovery-manifest.json','active_unit':113,'client_date':'2026-10-19'};save(p,v)
save(w/'w2x-units49-113-recovery-manifest.json',{'client_date':'2026-10-19','units':manifest,'global1479':calendar,'scope':'Recovery references only;no inherited PASS,global release NOT_ACCEPTED,AuthDB/model NOT_RUN.'})
print(json.dumps({'registered':len(manifest),'published':sum(x['publication']=='PUBLISHED' for x in manifest),'global1479':calendar['status']}))














