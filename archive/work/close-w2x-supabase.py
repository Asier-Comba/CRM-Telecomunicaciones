import json,pathlib,datetime,hashlib,zipfile,sys
w=pathlib.Path(__file__).parent
prefix='w2x-case-notes';runid=38479194069;count=107;required='case_private_notes_explicit_cursor_reveal_revocation_closed_history_and_global_cancel'
if sys.argv[1:]==['153']:
 prefix='w2x-contacts';runid=38480433895;count=108;required='customer360_contact_lost_receipt_keeps_intent_and_single_persisted_effect'
else:assert not sys.argv[1:]
quality=json.loads((w/(prefix+'-quality-closed.json')).read_text(encoding='utf-8'))
closed=json.loads((w/(prefix+'-supabase-closed-run.json')).read_text(encoding='utf-8-sig'));assert closed['run']['id']==runid and closed['run']['status']=='completed' and closed['run']['conclusion']=='success'
safe=json.loads((w/(prefix+'-safe.safe-summary.json')).read_text(encoding='utf-8'));assert safe['sha']==quality['executed'] and safe['result']=='PASS' and safe['passed']==count and safe['failed']==0 and safe['auth']=='PASS' and safe['teardown']=='PASS' and safe['migration_count']==85
assert safe['w1_backend_checks']==3815 and safe['w2_backend_takeover_checks']==227
for k in ['assistant_history','assistant_history_application_api','assistant_history_browser','assistant_read_grounding']:assert safe[k].startswith('PASS_')
with zipfile.ZipFile(w/(prefix+'-safe.zip'))as z:
 paths=[i for i in z.infolist()if pathlib.PurePosixPath(i.filename).name=='w4-supabase-safe-evidence.json'];assert len(paths)==1 and paths[0].file_size<2*1024*1024
 data=json.loads(z.read(paths[0]));passed=data['w2_product_ui_passed_checks'];assert required in passed and len(passed)==count and len(set(passed))==count
closed_names=[a['name']for a in closed['artifacts']];assert len(closed_names)==3 and set(closed_names)=={'supabase-local-safe-evidence','w2-product-ui-synthetic-screenshots','w3-history-ui-synthetic-screenshots'}
record={**quality,'supabase_run':runid,'supabase':safe,'required_check':required,'functional_scope':'OWN_PRODUCT_DELTA_CONTROLS_CLOSED_NOT_RELEASE_NOT_W4_NOT_FULL23','integration_ack':'NOT_RECEIVED','artifacts':[{k:a[k]for k in ['id','name','size_in_bytes']}for a in closed['artifacts']],'artifact_sha256':{name:hashlib.sha256((w/(prefix+'-'+name+'.zip')).read_bytes()).hexdigest()for name in ['safe','product','history']},'utc':datetime.datetime.now(datetime.timezone.utc).isoformat()}
(w/(prefix+'-closed-metadata.json')).write_text(json.dumps(record,indent=2)+'\n',encoding='utf-8')
p=w/(prefix+'-checkpoint.json');checkpoint=json.loads(p.read_text(encoding='utf-8'));checkpoint['checks']['auth_db']=str(count)+'/0_PASS_AUTH_TEARDOWN_OWN_EXECUTED_SHA';checkpoint['status']='OWN_PRODUCT_DELTA_FUNCTIONAL_CONTROLS_CLOSED_PENDING_OWNER_ACK_W4_RELEASE';checkpoint['closed_metadata']=str(w/(prefix+'-closed-metadata.json'));p.write_text(json.dumps(checkpoint,indent=2)+'\n',encoding='utf-8')
print(prefix+': OWN'+str(count)+'_AUTH_DB_PASS_REQUIRED_CHECK_MEASURED_HIGH5_FAIL_NO_RELEASE_NO_OWNER_ACK')
