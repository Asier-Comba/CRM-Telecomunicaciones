from pathlib import Path
w=Path('work');s=(w/'close-w2x-customer-domain-title-wrap.ps1').read_text(encoding='utf-8-sig');s=s.replace('customer-domain-title-wrap','customer-services-review').replace("'fix(customers): wrap full service names inside collection cards'","'docs(product): reconcile Customer360 services evidence individually'")
start=s.index('$cp=Get-Content');s=s[start:]
prefix="""$ErrorActionPreference='Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
$prefix='w2x-customer-services-review';$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
if(Test-Path ('work/'+$prefix+'-close-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='METADATA_PREFLIGHT_DONE_PUBLISH_ONCE'}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-close-requested.json')
"""
s=prefix+s
a=s.index('$body=@"');b=s.index('\nforeach($n in',a)
body='''$body=@"
HANDOFF W2-X95 — Revisión individual PAR-046: Customer360 Servicios.

Fuente de metadata $sha; árbol $tree; rama $($cp.branch); padre3baf2ebef46e3ea8d48e84078f4841d9048f492a; CLAIM6255954582. Solo nueva revisión PAR046, cola derivada y documento. Runtime/build/AuthDB/modelo en SHAmetadata:NOT_RUN; ningún75 ni PASS del padre se hereda.

La evidencia sigue anclada a fuente94/3baf2eb:75 pruebas propias en2,1min, build66, lint0errores/3avisos, scan/cola/bundle y publicación propios. Solo15 casos pertinentes a Servicios:9 de nombres/denegación a390/768/1440 y6 de foco/paginación/cambio de colección. Los60 de Incidencias/SIM/Contratos son contexto. No se repiten verdes por una revisión documental.

Se registra PARTIAL para implementación, consumo, navegador y visual. PROVEN_BACKEND y SECURITY_ACCEPTED siguen NOT_RECONCILED; EXTERNAL_BLOCKED continúa BLOCKED y RELEASE_READY falso. No aceptación de Auth/JWT/RLS/roles/membresía reales, altas/edición/suspensión/baja/cambios de tarifa, todas las relaciones, pantalla comercial completa, accesibilidad o táctil.403de fixture no demuestra aislamiento físico. En1440 la tabla larga usa scroll intencional y no se aceptan todas las columnas.

Nueve imágenes de fuente94 realmente vistas, cuyos hashes originales se verificaron y constan en el documento nuevo. Ese documento es un índice de evidencia de94, no un archivo ejecutado en94 ni imágenes del SHAmetadata. Banco de94 conserva su causal1FAIL1PASS21,8s en el padre y sus aserciones. F736/B9, fallos de preparación93 y todos los originales conservan su alcance; no se borran ni reciben una causa nueva.

Guardias propias: únicamente PAR046,341otras filas y31revisiones previas idénticas; metadata global/accepted/candidate/blockers,src ytests sin cambios. Cola342/32PARTIAL/310sinreconciliar/0READY, diff/scan y bundle verificado. Sin promoción masiva, PASS global o aceptación comercial completa.

2043/source88 continúa una vez53189,2109/source92 espera93887 tras2043terminal/PUBLISHED/PASS.2007/source86 PASS55,8min publicado conserva solo su SHA. CincoHIGH/W4 pendientes, IA comercial writesOFF, issue10OPEN, releaseNOT_ACCEPTED, API0. Sin cambios a main, ramas principales/ajenas/congeladas, W3/W4/W5/recurso o producción. Consumo principal requiere ACK exacto. Continuar otra unidad comercial útil tras checkpoint.
"@'''
s=s[:a]+body+s[b:];(w/'close-w2x-customer-services-review.ps1').write_text(s,encoding='utf-8-sig')
