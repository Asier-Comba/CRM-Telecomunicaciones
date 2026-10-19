from pathlib import Path
w=Path('work');p='w2x-line-number-recovery-close';s=(w/('run-'+p+'.ps1')).read_text(encoding='utf-8-sig').replace('-controls-requested','-corrected-controls-requested').replace('-collection.txt','-corrected-collection.txt').replace('186 tests','189 tests').replace('tests=186','tests=189').replace('-final.config.cjs','-corrected.config.cjs')
for name in ['browser','lint','build']:s=s.replace("+'-"+name+".txt'","+'-"+name+"-corrected.txt'").replace("+'-"+name+"-exit.txt'","+'-"+name+"-corrected-exit.txt'")
(w/('run-'+p+'-corrected.ps1')).write_text(s,encoding='utf-8-sig')
f=w/('checkpoint-'+p+'.py');s=f.read_text(encoding='utf-8-sig').replace('OWN186','OWN189').replace('186_PASS','189_PASS').replace('186 passed','189 passed')
s=s.replace("for s in ['browser','lint','build']","for s in ['browser-corrected','lint-corrected','build-corrected']").replace("log('browser')) and '66/66' in log('build')","log('browser-corrected')) and '66/66' in log('build-corrected')")
a=s.index(" assert (r/paths[1]).read_text");b=s.index(" obs=list",a)
s=s[:a]+''' actual=(r/paths[1]).read_text(encoding='utf-8');assert actual==(w/(p+'-corrected-test.ts')).read_text(encoding='utf-8')
 for old,new in reversed(read(w/(p+'-bank-extension.json'))):assert actual.count(new)==1;actual=actual.replace(new,old)
 assert actual==(w/(p+'-causal-test.ts')).read_text(encoding='utf-8'),'ORIGINAL_NINE_ASSERTIONS_PRESERVED_THREE_ESCAPE_REVIEW_CASES_ADDED'
 assert log('browser-exit').strip()=='1' and re.search(r'(?m)^\\s*3 failed',log('browser')) and re.search(r'(?m)^\\s*183 passed',log('browser'))
''' +s[b:]
s=s.replace("['causal','collection','browser','lint','build','scan']","['causal','collection','browser','corrected-collection','browser-corrected','lint-corrected','build-corrected','scan']")
f.write_text(s,encoding='utf-8')
