from pathlib import Path
w=Path('work');p='w2x-commercial-number-full';s=(w/'refresh-w2x-contract-lifetime-queue.py').read_text(encoding='utf-8-sig').replace('w2x-commercial-contract-lifetime-full',p).replace('w2x-contract-create-read-retirement','w2x-line-number-recovery-close').replace('2007','2043').replace('116','118').replace('1968','2007').replace('commercial_contract_lifetime_full_coverage','commercial_number_full_coverage').replace("w2x-commercial-contract-full-requested.json","w2x-commercial-contract-lifetime-full-requested.json")
s=s.replace('Keep1908source80 and2007source84 exactpins. Unique2043waiter only after2007terminal/PUBLISHED/PASS;continueindependentwork15.','Keep1968source84 and2007source86 exactpins. Unique2043source88 waiter only after2007terminal/PUBLISHED/PASS;continueindependentwork15.')
a=s.index("  if d['dispatch']=='NOT_DISPATCHED':")
s=s[:a]+"""  if d['dispatch']!='NOT_DISPATCHED':
   import subprocess
   assert subprocess.check_output(['git','-C',str(w/'crm-w2x-commercial-composition'),'rev-parse','HEAD'],text=True).strip()==d['source']
   assert not subprocess.check_output(['git','-C',str(w/'crm-w2x-commercial-composition'),'status','--porcelain'],text=True).strip()
   row.update(sha=d['source'],branch='DETACHED',clean=True,branch_published=True,status=d['status'],frozen=d.get('publication')!='PUBLISHED',active_global=d)
   for key in ['next_global','following_global']:
    if row.get(key,{}).get('source')==d['source']:row.pop(key,None)
  else:
   if (w/'w2x-commercial-contract-lifetime-full-requested.json').exists():
    row['next_global']=d
    if row.get('following_global',{}).get('source')==d['source']:row.pop('following_global',None)
   else:row['following_global']=d
"""+s[s.index('save(f,j)',a):]
(w/'refresh-w2x-number-queue.py').write_text(s,encoding='utf-8')
f=w/'run-w2x-commercial-number-full.ps1';s=f.read_text(encoding='utf-8-sig');anchor="Push-Location $repo\n$ErrorActionPreference='Continue'\nnode node_modules/@playwright/test/cli.js test --config";assert s.count(anchor)==1;s=s.replace(anchor,"python work/refresh-w2x-number-queue.py\nif($LASTEXITCODE){throw 'RUNNING_CHECKPOINT_FAILED_PRESERVE_REQUEST'}\n"+anchor);f.write_text(s,encoding='utf-8-sig')
f=w/'refresh-w2x-contract-lifetime-queue.py';s=f.read_text(encoding='utf-8-sig');a=s.index("  if d['dispatch']=='NOT_DISPATCHED':");s=s[:a]+"""  if d['dispatch']!='NOT_DISPATCHED' and not (w/'w2x-commercial-number-full-requested.json').exists():
   import subprocess
   assert subprocess.check_output(['git','-C',str(w/'crm-w2x-commercial-composition'),'rev-parse','HEAD'],text=True).strip()==d['source']
   assert not subprocess.check_output(['git','-C',str(w/'crm-w2x-commercial-composition'),'status','--porcelain'],text=True).strip()
   row.update(sha=d['source'],branch='DETACHED',clean=True,branch_published=True,status=d['status'],frozen=d.get('publication')!='PUBLISHED',active_global=d)
"""+s[a:];f.write_text(s,encoding='utf-8')
