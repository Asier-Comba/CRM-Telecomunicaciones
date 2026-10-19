from pathlib import Path
import json,copy,subprocess,hashlib
w=Path(__file__).parent;p=w/'crm-w2x-par042-review';file=p/'docs/master/PRODUCT_RELEASE_REVIEWS.json'
r=json.loads(file.read_text(encoding='utf-8'));before=copy.deepcopy(r);review=r['row_reviews']['PAR-042'];source='9c361c9ce7e32ba202f0c6e24aacd371c5026e04';closed=json.loads((w/'w2x-contacts-closed-metadata.json').read_text(encoding='utf-8'));assert closed['source']==source and closed['supabase']['passed']==108
review['source_sha']=source;review['stages']['VISUAL_ACCEPTED']='PARTIAL'
review['mobile']='PARTIAL_ACTUAL_AUTH_UNCERTAIN_CONTACT_EDITOR390_768_1440_SOURCE9C361'
review['pending']='Complete per-row role/revocation/foreign-workspace, principal, cursor, lifecycle and staging acceptance plus independent W4. Source9c361 has partial lost-response creation acceptance only; uniond764 requires its own active CI38483489804/Sup38483489916 and is not covered by this evidence. No full-row PASS or release.'
review['evidence'].append({'source_sha':source,'kind':'AUTH_BROWSER','scope':'PARTIAL_ROW','stage':'BROWSER_ACCEPTED','positive':'Actual normal authenticated contact.create commits before its response is lost; retry uses identical command_id and inputs. Exactly one contact, product_command and audit event; ordinary paginated readback exposes the persisted label.','negative':'Uncertain editor refuses close/Escape and field changes until confirmation. No duplicate effect/command/audit; existing privacy and authority boundaries stay active. This case does not prove every role, revocation, lifecycle or foreign parent.','execution':'OWN_SOURCE9C361_EXECUTED781E200_TREEE54DA_SUP38480433895_JOB115581395988_PASS108_AUTH_TEARDOWN;required customer360_contact_lost_receipt_keeps_intent_and_single_persisted_effect PASS;NOT_FULL_ROW_NOT_W4_NOT_D764','paths':['scripts/security/supabase-local/product-customer360-collections-browser.mjs','src/features/customers/IntegratedCustomerDetail.tsx','docs/master/W2X_PAR042_INDIVIDUAL_REVIEW_20261014.md']})
review['evidence'].append({'source_sha':source,'kind':'VISUAL','scope':'PARTIAL_ROW','stage':'VISUAL_ACCEPTED','positive':'Actual disposable Auth/DB loaded uncertain create editor inspected at390/768/1440: contextual warning, disabled close/fields and enabled same-action retry; no horizontal overflow.','negative':'These images cover the uncertain editor; no claim that all contact inventory pages, lifecycle states or role combinations received loaded visual acceptance.','execution':'SOURCE9C361_SUP38480433895_PRODUCT11857332694_contact-uncertain-390/768/1440.png;SHA256 manifest in W2X_PAR042_INDIVIDUAL_REVIEW_20261014.md;PARTIAL_VISUAL_NOT_FULL_ROW','paths':['scripts/security/supabase-local/product-customer360-collections-browser.mjs','docs/master/W2X_PAR042_INDIVIDUAL_REVIEW_20261014.md']})
for key,row in before['row_reviews'].items():
 if key!='PAR-042':assert r['row_reviews'][key]==row
for key in before:
 if key!='row_reviews':assert r[key]==before[key]
assert review['evidence'][0]==before['row_reviews']['PAR-042']['evidence'][0]
assert all(v!='PASS'for v in review['stages'].values())
file.write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
images=[{'width':width,'sha256':hashlib.sha256((w/f'w2x-contact-auth-uncertain-{width}.png').read_bytes()).hexdigest()}for width in [390,768,1440]]
(w/'w2x-par042-visual-manifest.json').write_text(json.dumps({'source':source,'artifact':11857332694,'images':images},indent=2)+'\n',encoding='utf-8')
print('ONLY_PAR042_CHANGED_OLD_EVIDENCE_PRESERVED_ALL_STAGES_PARTIAL_OTHER_ROWS_METADATA_UNCHANGED')
