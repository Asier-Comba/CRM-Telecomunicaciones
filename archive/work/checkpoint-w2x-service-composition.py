from pathlib import Path
import json,hashlib,subprocess
w=Path(__file__).resolve().parent;r=w/'crm-w2x-commercial-composition';p=w/'w2x-service-parent-read-checkpoint.json';j=json.loads(p.read_text(encoding='utf-8'));parent=json.loads((w/'w2x-opportunity-command-read-checkpoint.json').read_text(encoding='utf-8-sig'))
assert parent['published'] and parent['publication']=='PUBLISHED'
assert subprocess.check_output(['git','-C',str(r),'rev-parse','HEAD'],text=True).strip()==parent['sha']
for x in j['candidate_fingerprints']:assert hashlib.sha256((r/x['path']).read_bytes().replace(b'\r\n',b'\n')).hexdigest()==x['sha256_utf8_lf']
assert {s[3:].replace(chr(92),'/') for s in subprocess.check_output(['git','-C',str(r),'status','--porcelain'],text=True).splitlines()}=={x['path'] for x in j['candidate_fingerprints']}
j.update(base=parent['sha'],composed_source14=parent['sha'],status='OWN21_CONTROLS_RUNNING',next='INSPECT21_LINT_BUILD_TERMINAL;SCAN_COMMIT_PUSH_VISUAL_HANDOFF')
p.write_bytes((json.dumps(j,ensure_ascii=False,indent=2)+'\n').encode('utf-8'))
for n in ['outputs/CRM-recuperacion-inventario.json','work/canonical-next-composition-metadata.json','work/current-authorized-execution-unit.json','work/w2x-current-execution-unit.json']:
 p=w.parent/n;d=json.loads(p.read_text(encoding='utf-8-sig'));t=d if n.endswith('w2x-current-execution-unit.json') else d.setdefault('w2x_recovery',{});t['active_commercial_unit']={'claim':j['claim'],'base':j['base'],'branch':j['branch'],'checkpoint':str(w/'w2x-service-parent-read-checkpoint.json'),'status':j['status'],'next':j['next']};p.write_bytes((json.dumps(d,ensure_ascii=False,indent=2)+'\n').encode('utf-8'))
print(json.dumps({'composed_base':j['base'],'preserved_candidate_files':len(j['candidate_fingerprints'])}))
