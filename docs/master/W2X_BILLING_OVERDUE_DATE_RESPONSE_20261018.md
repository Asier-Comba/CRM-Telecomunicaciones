# Facturación: coherencia entre vencida y fecha de vencimiento

CLAIM6253675507; ampliación de fixture6253805997. Padre `3124717317606ed013e1dd00e5cb4f4de0e3378e`, rama propia `codex/w2x-billing-overdue-date-response-20261018`.

Causal controlado **1FAIL/1PASS24,8s**: la interfaz admitía una respuesta overdue=true con due_on=null bajo Vencidas; el positivo con fecha pasa. No reproduce un productor SQL ni una fuga real. Los contratos BILLING_V1 y BILLING_ANALYTICS_V1 requieren fecha previa al corte para vencimiento. Se conserva log/exit1/banco causal.

Una expresión del predicado compartido existente rechaza overdue=true si no está emitida o carece de due_on. Se reutiliza para get/summary/list. No calcula el reloj,as_of,importes,SQL,RLS ni permisos; no cambia wire ni añade servicios. Sin fecha y no vencida sigue siendo válido. Reversión exacta reconstruye el padre. Requiere revisión y consumo explícitos del propietario W1 antes de integración principal; no hay ACK inferido ni aprobación W4.

**165/165 navegador3,0min**:9 nuevos missing/dated/undated por390/768/1440 y156contextuales. El banco nuevo final es idéntico al causal. Se comprueban error seguro,sin filas ni falso vacío ante contradicción; fecha/Vencida positiva; sinfecha/noVencida positiva; cliente y filtros explícitos,sin comandos ni lecturas inesperadas.

**Funcionales originales51:50PASS/1FAIL791,8828ms** conservados. El fixture de PDF congelado tenía fecha nula y después activaba overdue=true: el predicado ahora lo rechaza antes de proyectar bytes; resultado null frente al PDF, no nondeterminismo de bytes. Referencia de propiedad PR30 w2/product-integration-v2: integración W1/W2 de contratos fiscales. Solo se cambia fecha inmutable del fixture a2026-10-05 para emisión2026-10-04, común a estados base/pagada/vencida. No se edita runtime/renderer/Storage/recurso W5 ni aserción de igualdad. Recheck solo2casos afectados: bytes y descarga, **2PASS/0FAIL361,4868ms**. Cobertura complementaria49anteriores no afectados+2recomprobados; NO51PASS de una ejecución ni52casos. Se preserva el fallo original.

Otros2fixtures positivos de bandera (browser y Node de72) reciben emisión2026-10-01/vencimiento2026-10-05; todas sus aserciones permanecen y se guardan originales. Los resultados72/73 no se convierten retroactivamente en prueba calendárica. Node añade un caso get/summary/list con fechas válidas,contradicción y sinfecha válida. Producto y ambos bancos browser mantienen sus fingerprints después del arreglo fiscal: no se repiten165verdes. Build66/lint0errores3warnings/scan/diff/cola/bundle propios.

## Revisión visual parcial

Nine frames actually viewed: missing/dated/undated at390,768,1440. Missing shows safe error;768/1440 empty table and disabled paging visible,390 table below viewport. Dated shows issued/Vencida,due2026-10-05,30.25EUR;undated shows Sin vencimiento without Vencida. Mobile cards/actions legible,top header partly outside positive screenshots. No action buttons invoked. Harness/banner/example placeholder excluded;synthetic invoice/date,not SQL truth or real absence.

- overdue-date-dated-768.png — SHA256 4b80d9a231c5a51a5d5f439004db996bfe6bf4bd1664717854b459aebbdb0b08
- overdue-date-undated-1440.png — SHA256 c65711dd4f806320c526d83a32e68b36a6ef5263038393c19dbf93a94b82c57c
- overdue-date-missing-1440.png — SHA256 472080402545ab16dee3c013be21c69a5c9babbcd01aab761946e55df3bc64cb
- overdue-date-dated-390.png — SHA256 865f844f80baacf901283f52c1250c2fa8ddf1c6a62ddad1b9e338bc4186af97
- overdue-date-undated-768.png — SHA256 785b1a8828bef13210599922cc80499eb5a6411835823b992116c7a5615e8943
- overdue-date-missing-390.png — SHA256 2c851e5af2f46fec88880a5fb3fc71619c085f75527c090e7b3f2c4ffe57db1b
- overdue-date-missing-768.png — SHA256 00d31187d4c17e5c57968d33020b2e02c3c5e6f839ab7db87bff7c403aa9d46c
- overdue-date-dated-1440.png — SHA256 551bfd5f745c59e8cc23cc1cb6acb0caa4d415bbf37dd7d36110a18fc852d6f7
- overdue-date-undated-390.png — SHA256 4479925a36c9c5bc02cdc5d66e92f829ba2966bafb2d3ac4e18b72412fc858b8

HTTP/DTO sintético con componentes/repositorio/parsers reales; AuthDB/JWT/RLS/SQL/Nextintegrado/modelo vivo NOT_RUN/API0. No acepta productorSQL,derivación diaria,ausencia,autoridad,durabilidad ni seguridad independiente. Matriz342/30PARTIAL/312sinreconciliar/0READY;HIGH5/W4 pendientes,IAwritesOFF,issue10OPEN,releaseNOT_ACCEPTED.

1842source72 cerradoPASS35,7min;1869source75 sigue activo sin estos cambios;1887/109 candidato coleccionado, no solicitado al redactar. Solo se ejecutará tras propia publicación y1869terminal/PUBLISHED/PASS;sinretarget/cancelación/duplicación/herencia. F736/B9/981/1266/fixtures/preparación conservados. Ramas/fuentes ajenas,PR38/142/153/main/W3/W4/W5/recurso intactos. Siguiente: cerrar full propio y continuar otro defecto comercial reproducible W2; revisión W1 pendiente.
