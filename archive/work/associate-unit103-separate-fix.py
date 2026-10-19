from pathlib import Path
import json
w=Path('work');f=w/'w2x-customer-domain-table-title-wrap-checkpoint.json';j=json.loads(f.read_text(encoding='utf-8-sig'));j['known_remaining_defects']['global_customer_label']['fix_candidate'].update(status='PUBLISHED_OWN90_BUILD66_VISUAL9_SEPARATE_SOURCE',sha='002c2565894e26eafa6349e29aac391c1e607873');f.write_text(json.dumps(j,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
