from pathlib import Path
w=Path('work');old='w2x-contract-created-read-binding';p='w2x-contract-create-read-retirement'
s=(w/('checkpoint-'+old+'.py')).read_text(encoding='utf-8-sig').replace(old,p).replace("j['unit']==85","j['unit']==86").replace("'unit':85","'unit':86").replace("['source85']","['source86']").replace('OWN141','OWN156').replace('141_PASS','156_PASS').replace('141 passed','156 passed')
a=s.index('paths=');b=s.index("if mode!='running':")
s=s[:a]+"paths=['src/features/contracts/Contracts.tsx','tests/e2e-preview/fixtures/telecom-resource-entry.tsx','tests/e2e-preview/contract-create-read-retirement.spec.ts','docs/master/W2X_CONTRACT_CREATE_READ_RETIREMENT_20261018.md']\n"+s[b:]
s=s.replace("6 failed","4 failed").replace("2 passed","1 passed")
a=s.index(' actual=(r/paths[1])');b=s.index(" assert subprocess.check_output(['git','-C',str(r),'branch'",a)
s=s[:a]+''' actual=(r/paths[1]).read_text(encoding='utf-8')
 for old,new in reversed(read(w/(p+'-fixture-changes.json'))):assert actual.count(new)==1;actual=actual.replace(new,old)
 parent=subprocess.check_output(['git','-C',str(r),'show',j['base']+':'+paths[1]]).decode('utf-8').replace('\\r\\n','\\n');assert actual==parent,'ONLY_EXISTING_FIXTURE_ENTRY_EXTENSION'
 assert (r/paths[2]).read_text(encoding='utf-8')==(w/(p+'-causal-test.ts')).read_text(encoding='utf-8'),'ORIGINAL_BANK_UNCHANGED'
 obs=list((w/(p+'-causal-results')).rglob('observations.json'));assert len(obs)==5
 for x in obs:
  o=read(x);assert o['before']==0 and o['after']==1 and len(o['commands'])==1 and o['effects']==1 and o['errors']==[]
''' +s[b:]
s=s.replace("['causal','receipt-corrected-causal','collection'","['causal','collection'")
(w/('checkpoint-'+p+'.py')).write_text(s,encoding='utf-8')
s=(w/('close-'+old+'.ps1')).read_text(encoding='utf-8-sig').replace(old,p).replace('session=77713','session=12245').replace('bind created record reads to confirmed input','avoid starting dependent read after create form unmount')
a=s.index("$body=");b=s.index('foreach($n',a)
s=s[:a]+'''$body='HANDOFF W2-X86 — contrato: evitar iniciar lectura dependiente tras desmontar el formulario. Fuente '+$sha+', árbol '+$tree+', rama '+$cp.branch+', padre '+$cp.base+', CLAIM '+$cp.claim+'. Propios '+$cp.browser_summary+':15 casos de vida del formulario y141 regresiones. Build66,lint,scan,diff,cola ybundle propios.'+$nl+'Original4FAIL1PASS48,6s conservado con log/exit/banco y5observaciones: referencia,empresa,actor yrol retirados iniciaban portfolio.get después del recibo;contexto actual positivo. El guard local de montaje se consulta antes de iniciar la lectura dependiente. No cancela efectos de creación ni una consulta ya iniciada. Un comando y un efecto sintético en cada escenario,0 lecturas tardías en12 contextos retirados y1 en3 actuales. Reutiliza fixture HTTP existente;no recurso nativo nuevo.'+$nl+'Quince capturas revisadas y observaciones a390/768/1440;inventarios vacíos son declarados,estado/enlace registrado visible en actual,filas fuera del viewport. Cambios de ámbito simulan desmontaje controlado del Provider;no prueba AuthDB/JWT/RLS/SQL,revocación real,ausencia/quiescencia nativa,reinicio/handler/full23. No guardia después de GET ni reclamación de protección de peticiones ya emitidas. Modelo vivoNOT_RUN/API0. FunctionalNOT_RUN_UI_COMPONENT_LIFETIME_BEFORE_DEPENDENT_READ.'+$nl+'1908source80 y1968source84 mantienen sus pines ycontroles;1968 no contiene la correlación85 ni esta guardia86.1992 preparado nunca solicitado;coalescer2007/116 y verificar colección real antes de solicitar tras1968terminal/PUBLISHED/PASS. No resultados heredados. Matriz342/31PARTIAL/311sinreconciliar/0READY,HIGH5/W4 pendientes,IAwritesOFF,issue10OPEN,releaseNOT_ACCEPTED. F736/B9 yfallos anteriores de fixture/preparación/pérdida auxiliar83 conservados. Fuentes/ramas ajenas,main,PR38/142/153,W3core,W4/W5/recurso intactos. Consumir en principal requiere ACK exacto;no aceptación por silencio.'

''' +s[b:]
(w/('close-'+p+'.ps1')).write_text(s,encoding='utf-8')
