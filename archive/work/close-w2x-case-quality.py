import json,re,pathlib,datetime,subprocess,hashlib,sys
w=pathlib.Path(__file__).parent
source='a650a9b348cade254a115fcda89bd2b49ecbbb83';executed='6ac06af6e911b4c2a224fdfddf91f51405e4c710'
tree='2edb195b4f8efcdf8433f810da3f011329368be4'
prefix='w2x-case-notes';checkout='crm-w2x-case-notes';ids=[115577326880,115577326649,115577326845];ci=38479194108;sup=38479194069;preview_count=368
if sys.argv[1:]==['153']:
 source='9c361c9ce7e32ba202f0c6e24aacd371c5026e04';executed='781e200c9d2891478f580b07ce8cadd768eae4fd';tree='e54da184ac7eb8319b60d0ea9ac96ab385ff9130';prefix='w2x-contacts';checkout='crm-w2x-contacts';ids=[115581395912,115581396191,115581396280];ci=38480433850;sup=38480433895;preview_count=380
elif sys.argv[1:]==['union']:
 source='d76426fa195bc7c29bd77811e1bb987cddfade3d';executed='83d62370a9d30b4bb03cdf9f6dc4761cbe746a25';tree='5ad1cf5188809d571db1052b479a011317e55218';prefix='w2x-composition';checkout='crm-w2x-customer-composition';ids=[115591491933,115591482599,115591473311];ci=38483489804;sup=38483489916;preview_count=440
else:assert not sys.argv[1:]
jobs=json.loads((w/(prefix+'-ci-jobs.json')).read_text(encoding='utf-8-sig'))['jobs'];assert all(j['status']=='completed'for j in jobs)
logs=[(w/f'job-{i}.txt').read_text(encoding='utf-8-sig')for i in ids]
for log in logs:assert f'Merge {source} into 60acdc5d6a2ae41ff3d751724582ade0c0762788'in log and executed in log
for ref in [source,executed]:assert subprocess.check_output(['git','-C',str(w/checkout),'rev-parse',ref+'^{tree}'],text=True).strip()==tree
quality,native,preview=logs
assert re.findall(r'ℹ tests (\d+)',quality)==['611','819'];assert re.findall(r'ℹ pass (\d+)',quality)==['611','819'];assert re.findall(r'ℹ fail (\d+)',quality)==['0','0']
assert '66/66'in quality and '5 high severity vulnerabilities'in quality
assert re.findall(r'([0-9]+) passed \(',preview)==[str(preview_count)]
restore=json.loads(re.search(r'(\{"kind":"native_postgresql_restore_test_only"[^\r\n]+\})',native)[1]);assert restore['migration_count']==85 and restore['production_backup']is False
for key in ['schema','rows','assistant_rows','rls','scope','restored_privilege_matrix','fresh_role_calls','restored_role_calls','acl_loss_negative_control']:assert restore[key]=='pass'
for i in ids[1:]:assert next(j for j in jobs if j['id']==i)['conclusion']=='success'
record={'source':source,'executed':executed,'tree':tree,'ci':ci,'functional':{'bootstrap':611,'assistant':819,'total':1430,'build':'PASS_66','preview':preview_count,'native_restore':restore},'audit':'FAIL_FIVE_HIGH','supabase':'PENDING_RUN'+str(sup),'integration_ack':'NOT_RECEIVED','release':'NOT_ACCEPTED','model':'NOT_RUN','logs':[{'job':i,'sha256':hashlib.sha256((w/f'job-{i}.txt').read_bytes()).hexdigest()}for i in ids],'utc':datetime.datetime.now(datetime.timezone.utc).isoformat()}
(w/(prefix+'-quality-closed.json')).write_text(json.dumps(record,indent=2)+'\n',encoding='utf-8')
p=w/(prefix+'-checkpoint.json');m=json.loads(p.read_text(encoding='utf-8'));m['checks']['own_ci_quality']=record;m['checks']['auth_db']='PENDING_OWN_SHA';p.write_text(json.dumps(m,indent=2)+'\n',encoding='utf-8')
print(prefix+': OWN1430_BUILD66_PREVIEW'+str(preview_count)+'_NATIVE85_RESTORE_PASS_HIGH5_FAIL_SUPABASE_PENDING')
