import json
from pathlib import Path
w=Path('work');p=w/'w2x-portfolio-result-label-wrap-checkpoint.json'
j=json.loads(p.read_text(encoding='utf-8-sig'))
j['known_remaining_defects']['selected_long_title']['fix_candidate']={'unit':92,'sha':'f20dfd511bb36e5064761d27b303cba3b3c89e2f','checks':'OWN282_PASS_BUILD66_VISUAL9_PUBLISHED','scope':'Separate source;source91remainsreproduceddefective,noPASSinheritance'}
p.write_text(json.dumps(j,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
