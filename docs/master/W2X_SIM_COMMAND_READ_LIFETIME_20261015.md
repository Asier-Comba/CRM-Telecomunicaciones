# SIM/eSIM: vigencia del refresco de activación registrada

CLAIM6203149786. Base b431287d5432c2323ec9d0f0ae477426f0b92b7d,metadata19PARTIAL y src/tests funcionales ff5e5a7.

Reproducción antes de corregir:4FAIL y4PASS vigentes (1,0min), físicas/eSIM y dos fases. Un recibo de activación pendiente liberado tras abrir otra SIM iniciaba sim.get de la ficha retirada; sim.get de refresco pendiente liberado tras cambiar iniciaba lecturas de cliente/línea retirados. Delta medido0 esperado/1 observado. El fixture conserva DTO cerrado, recibo con versión2 y asociación válida; el cambio a activo exige confirmación manual explícita y no representa una llamada al operador.

La vida de SimDetail invalida el callback de refresco al retirarse. Se comprueba antes de la consulta primaria, se reutiliza el control existente entre consulta primaria y relaciones y se protege la devolución al estado. Consulta inicial, helper de relaciones, contratos y comandos no cambian. El comando ya enviado conserva su tratamiento y no se envía otro.

Banco nuevo:dos tipos, dos fases, cinco contextos (referencia/empresa/actor/lector/vigente), tres anchos. Positivo vigente muestra activo después del recibo y lectura nuevos, cuerpo exacto y una operación. Regresiones de carga inicial/sustitución/scope se ejecutan también. HTTP controlado con componentes/repositorio/parsers reales; no acredita Auth/JWT/RLS/DB persistida, aprovisionamiento externo ni aceptación integral del módulo.

Global1065ff5e5a7 permanece en su SHA, no se hereda. Se conservan originales y revisiones individuales de fuentes anteriores. HIGH5/W4/ACKprincipal pendientes;IA writesOFF,modeloNOT_RUN/API0,issue10OPEN,releaseNOT_ACCEPTED.

Refinamiento del fixture:el primer banco114 y sus controles se conservan por intento. La consulta de línea incrementaba sintéticamente su versión tras activar la SIM; las migraciones actuales sim.activate cambian asociación/SIM y no línea. Se fija línea versión1; SIM/recibo siguen versión2 y estado activo. La causal original de lecturas tardías no depende de esa versión; no acredita escritor concurrente ni incremento SQL de línea. Se ejecuta de nuevo el banco completo con fixture corregido y controles de la fuente final, sin heredar el primer114.
