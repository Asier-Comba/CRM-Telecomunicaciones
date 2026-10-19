from pathlib import Path
w=Path('work');s=(w/'preflight-unit95.py').read_text(encoding='utf-8').replace("p='w2x-customer-services-review'","p='w2x-agenda-presentation-review'")
a=s.index("assert set(new['row_reviews'])");b=s.index('before=read(',a)
s=s[:a]+'''assert set(new['row_reviews'])==set(old['row_reviews'])
for key in old:
 if key!='row_reviews':assert new[key]==old[key],key
for key,value in old['row_reviews'].items():
 if key!='PAR-086':assert new['row_reviews'][key]==value,key
oldrow=old['row_reviews']['PAR-086'];newrow=new['row_reviews']['PAR-086']
for key in oldrow:
 if key!='evidence':assert newrow[key]==oldrow[key],key
assert len(oldrow['evidence'])==2 and newrow['evidence'][:2]==oldrow['evidence'] and len(newrow['evidence'])==4
assert all(x['source_sha']=='93bf52435b1b8e10070880bd2c2109a8d282f170' for x in newrow['evidence'][2:])
'''+s[b:]
s=s.replace("if a['id']!='PAR-046':assert a==b,a['id']","if a['id']!='PAR-086':assert a==b,a['id']\n else:\n  for key in a:\n   if key!='evidence':assert a[key]==b[key],key\n  assert b['evidence'][:2]==a['evidence'] and len(b['evidence'])==4")
s=s.replace('W2X_CUSTOMER_SERVICES_INDIVIDUAL_REVIEW','W2X_AGENDA_PRESENTATION_INDIVIDUAL_REVIEW')
s=s.replace("source=read(w/'w2x-customer-domain-title-wrap-checkpoint.json');assert source['publication']=='PUBLISHED' and source['sha']==j['base'] and source['checks']['browser']=='75_PASS_OWN_SOURCE'","source=read(w/'w2x-calendar-event-title-wrap-checkpoint.json');assert source['publication']=='PUBLISHED' and source['sha']==j['source_evidence']['sha'] and source['checks']['browser']=='72_PASS_OWN_SOURCE'")
s=s.replace("for f in source['visual_review']['frames']:assert hashlib", "frames=[x for x in source['visual_review']['frames'] if '-detail-' not in Path(x['path']).name];assert len(frames)==6\nfor f in frames:assert hashlib")
s=s.replace('PASS_ONLY_PAR046_341ROWS_31REVIEWS_GLOBAL_SRC_TESTS_UNCHANGED','PASS_PAR086_APPEND2_PRIMARY_STAGES_341ROWS_31REVIEWS_GLOBAL_SRC_TESTS_UNCHANGED').replace("'only_row':'PAR-046'","'only_row':'PAR-086'").replace("'source94':source['sha'],'visual_hashes':9","'source93':source['sha'],'visual_hashes':6").replace("j['status']='METADATA_PAR046_QUALIFIED_PARTIAL32'","j['status']='METADATA_PAR086_APPEND_QUALIFIED_PARTIAL32'").replace('PAR046_ONLY_341ROWS_31REVIEWS_GLOBAL_SRC_TESTS_UNCHANGED_PASS','PAR086_APPEND2_PRIMARY_STAGES_341ROWS_31REVIEWS_GLOBAL_SRC_TESTS_UNCHANGED_PASS')
(w/'preflight-unit98.py').write_text(s,encoding='utf-8')
