from pathlib import Path
import json
w=Path('work');f=w/'w2x-domain-customer-label-wrap-checkpoint.json';j=json.loads(f.read_text(encoding='utf-8-sig'));c=json.loads((w/'w2x-domain-operator-label-wrap-checkpoint.json').read_text(encoding='utf-8-sig'));assert c['publication']=='PUBLISHED' and c['checks']['browser']=='99_PASS_OWN_SOURCE';j['known_remaining_defects']['global_operator_label']['fix_candidate'].update(status='PUBLISHED_OWN99_BUILD66_VISUAL9_SEPARATE_SOURCE',sha=c['sha']);f.write_text(json.dumps(j,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
