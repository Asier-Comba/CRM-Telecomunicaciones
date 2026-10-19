from pathlib import Path
from zipfile import ZipFile
import datetime, hashlib, json, subprocess

w = Path(__file__).parent
source = '1dd4272232403ae901ea3f3f5e11becfb874fe65'
executed = '0b4401542acc67440e7546b67b5ecced4f1a841b'
tree = '61d8fdcd2320794374d5cccdae4f91e737a69024'
refresh = json.loads((w / 'w2x-second-commercial-supabase-refresh.json').read_text(encoding='utf-8-sig'))
assert refresh['pr']['head'] == source
assert refresh['run']['head_sha'] == source
assert refresh['run']['status'] == 'completed' and refresh['run']['conclusion'] == 'success'
assert all(j['status'] == 'completed' and j['conclusion'] == 'success' for j in refresh['jobs']['jobs'])
for sha in (source, executed):
    actual = subprocess.check_output(['git', '-C', str(w / 'crm-w2x-commercial-composition'), 'rev-parse', sha + '^{tree}']).decode('utf-8').strip()
    assert actual == tree
with ZipFile(w / 'w2x-second-commercial-safe.zip') as z:
    entries = [n for n in z.namelist() if n.endswith('w4-supabase-safe-evidence.json')]
    assert len(entries) == 1
    report = json.loads(z.read(entries[0]))
assert report['sha'] == executed
assert all(report[k] == 'PASS' for k in ('result', 'auth', 'teardown'))
assert report['migration_count'] == 85
assert report['w1_backend_checks'] == 3815 and report['w2_backend_takeover_checks'] == 227
passed = report['w2_product_ui_passed_checks']
assert len(passed) == len(set(passed)) == 115
assert not report.get('w2_product_ui_failed_checks')
previous = json.loads((w / 'w2x-commercial-closed-metadata.json').read_text(encoding='utf-8'))
required = previous['required_checks'] + [
    'document_upload_three_uncertain_steps_same_intent_single_document_object',
    'agenda_task_meeting_create_update_complete_exact_lost_response_single_effect',
    'opportunity_uncertain_create_archive_confirmed_update_read_only_recovery',
]
assert all(name in passed for name in required)
quality = json.loads((w / 'w2x-second-commercial-quality-closed.json').read_text(encoding='utf-8'))
assert quality['source'] == source and quality['executed'] == executed and quality['tree'] == tree
assert quality['functional']['preview'] == 622 and quality['functional']['total'] == 1430
summary = json.loads((w / 'w2x-second-commercial-safe.safe-summary.json').read_text(encoding='utf-8'))
assert summary['passed'] == 115 and summary['failed'] == 0
quality.update(utc=datetime.datetime.now(datetime.timezone.utc).isoformat(), supabase=summary,
               supabase_run=38499685299, supabase_job=115643420270, required_checks=required,
               qualified='FUNCTIONAL_SCOPED_SOURCE_FOR_OWNER_REVIEW_CONSUMPTION_NO_RELEASE_APPROVAL',
               artifacts=[{'id': a['id'], 'name': a['name'], 'size_in_bytes': a['size_in_bytes']} for a in refresh['artifacts']['artifacts']],
               artifact_sha256={s: hashlib.sha256((w / f'w2x-second-commercial-{s}.zip').read_bytes()).hexdigest() for s in ('safe', 'product', 'history')})
out = w / 'w2x-second-commercial-closed-metadata.json'
out.write_text(json.dumps(quality, indent=2) + '\n', encoding='utf-8')
p = w / 'w2x-current-execution-unit.json'
m = json.loads(p.read_text(encoding='utf-8'))
assert m['sha'] == source
m['status'] = 'OWN1DD_1430_622_AUTH115_BUILD_NATIVE_PASS_HIGH5_NOT_RELEASE'
m['checks']['auth_db_storage'] = '115_PASS_OWN_AUTH_DB_STORAGE_TEARDOWN_BACKEND4042'
m['checks']['own_quality'] = quality
m['closed_metadata'] = str(out.resolve())
m['utc'] = quality['utc']
m['next'] = 'PUBLISH_VERIFIED_OWN_THIRD_COMPOSITION_AFTER_ALL_1DD_RUNS_TERMINAL_THEN_CLOSE_NEW_SOURCE_CONTROLS_NO_INHERITANCE'
p.write_text(json.dumps(m, indent=2) + '\n', encoding='utf-8')
(w / 'w2x-second-commercial-composition-checkpoint.json').write_text(json.dumps(m, indent=2) + '\n', encoding='utf-8')
print('OWN_1DD_115_AUTH_STORAGE_TEARDOWN_CLOSED_EXACT_SOURCE_EXECUTED_TREE_NO_RELEASE')
