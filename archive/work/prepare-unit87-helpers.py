from pathlib import Path
w=Path('work');old='w2x-contract-create-read-retirement';p='w2x-portability-recovery-close'
s=(w/('checkpoint-'+old+'.py')).read_text(encoding='utf-8-sig').replace(old,p).replace("j['unit']==86","j['unit']==87").replace("'unit':86","'unit':87").replace("['source86']","['source87']").replace('OWN156','OWN177').replace('156_PASS','177_PASS').replace('156 passed','177 passed').replace('4 failed','6 failed').replace('1 passed','2 passed')
a=s.index('paths=');b=s.index("if mode!='running':")
s=s[:a]+"paths=['src/features/portabilities/Portabilities.tsx','tests/e2e-preview/portability-recovery-close.spec.ts','docs/master/W2X_PORTABILITY_RECOVERY_CLOSE_20261018.md']\n"+s[b:]
a=s.index(' actual=(r/paths[1])');b=s.index(" assert subprocess.check_output(['git','-C',str(r),'branch'",a)
s=s[:a]+''' assert (r/paths[1]).read_text(encoding='utf-8')==(w/(p+'-causal-test.ts')).read_text(encoding='utf-8'),'ORIGINAL_BANK_UNCHANGED'
 obs=list((w/(p+'-causal-results')).rglob('observations.json'));assert len(obs)==8
 for x in obs:
  o=read(x);assert o['errors']==[] and len(o['commands'])==(0 if o['mode']=='review' else 1) and o['effects']==(1 if o['mode'] in ['uncertain','read_failed'] else 0)
''' +s[b:]
s=s.replace('ONLY_LOCAL_CONSTRUCTOR_CORRELATION_AND_EXISTING_RECEIPT_REF','ONLY_EXISTING_CLOSE_POLICY_CONSUMPTION')
(w/('checkpoint-'+p+'.py')).write_text(s,encoding='utf-8')
s=(w/('run-'+old+'.ps1')).read_text(encoding='utf-8-sig').replace(old,p).replace('156 tests in 9 files','177 tests in 7 files').replace('tests=156;files=9','tests=177;files=7');(w/('run-'+p+'.ps1')).write_text(s,encoding='utf-8-sig')
