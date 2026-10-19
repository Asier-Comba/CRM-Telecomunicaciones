from pathlib import Path
import json,subprocess,re,hashlib
w=Path('work');r=w/'crm-w2x-document-upload-uncertain';p='w2x-line-number-recovery-close'
def log(name):
 b=(w/(p+'-'+name+'.txt')).read_bytes();return b.decode('utf-16') if b.startswith(b'\xff\xfe') else b.decode('utf-8-sig')
assert log('browser-exit').strip()=='1' and re.search(r'(?m)^\s*3 failed',log('browser')) and re.search(r'(?m)^\s*183 passed',log('browser'))
f=r/'src/features/portabilities/Portabilities.tsx';assert f.read_bytes()==(w/(p+'-first-own-source.ts')).read_bytes()
for x in (w/(p+'-final-results')).glob('line-number-recovery-close-*uncertain*'):
 o=json.loads((x/'observations.json').read_text(encoding='utf-8'));assert o['controls']=={'closeDisabled':True,'cancelDisabled':True} and o['effects']==1 and len(o['commands'])==1 and o['errors']==[]
base=subprocess.check_output(['git','-C',str(r),'show','HEAD:src/features/portabilities/Portabilities.tsx']).decode('utf-8').replace('\r\n','\n');actual=f.read_text(encoding='utf-8')
for old,new in json.loads((w/(p+'-changes.json')).read_text(encoding='utf-8-sig')):assert actual.count(new)==1;actual=actual.replace(new,old)
assert actual==base
cp=w/(p+'-checkpoint.json');j=json.loads(cp.read_text(encoding='utf-8-sig'));j['first_own']={'failed':3,'passed':183,'duration':'6.2m','exit':1,'evidence':'original browser log/exit/results/first-own-source.ts/first-own-test.ts preserved','scope':'All3uncertain failed afterEscape;guards true/true,effect1/command1,errors[];not fixturefailure'};j['status']='TEMP_PRODUCT_BASE87_FOR_COMPLEMENTARY_ESCAPE_TAB_CAUSAL';j['next']='Run unique nested-key causal on sourcebase87;currently childguardtemporarilyreverted after186terminal. Restore/apply child+parentonly after reading causal. Firstsource snapshot retained. No repeat186/cancelglobal.';cp.write_text(json.dumps(j,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');f.write_text(base,encoding='utf-8');assert not subprocess.check_output(['git','-C',str(r),'diff','--','src'],text=True).strip()
marker=w/'w2x-line-number-nested-key-causal-requested.json';assert not marker.exists();marker.write_text(json.dumps({'state':'REQUESTED_ONCE','source':'1fd0d94da7687881d073c24b6edd550d2e4a2cdd','product_src_diff':'EMPTY_VERIFIED','keys':['Escape','Tab'],'bank_sha256':hashlib.sha256((w/'w2x-line-number-nested-key-bank/nested-key.spec.ts').read_bytes()).hexdigest()},indent=2)+'\n',encoding='utf-8')
