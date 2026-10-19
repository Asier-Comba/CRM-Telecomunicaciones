# Unidad05 — recibo inválido y lectura posterior

Fuente ejecutada `3884671ac6a5fc667e6494c0669470141070f44f`, árbol `823435b256fc7afeedf9b57930a4485f040ff2aa`. Cherry-pick único-x642d1aa3d64e54646338ea36e6f10e4ddea93389; seis archivos, cambios backend sólo en consumidores de aceptación. Sin SQL/contratos/infra/dependencias nuevos.

Antes390:3FAIL en recibos ilegibles de emisión/emisor/cliente fiscal y1PASS de lectura fallida después de recibo válido. Después:88PASS3,0min:42recibos inválidos/denegados,3lecturas después de recibo válido y43regresiones de unidad04, sin heredar su PASS. Mismo banco causal/final, Node24.19.0/Chromium1228, unworker/retries0/timeout60000. El reintento después de un recibo válido consulta solamente; no vuelve a emitir.

Lint global/typecheck/build66 PASS. Bootstrap propio615/620,5FAIL IMPORT_STAGING_INVALID bajo Windows/POSIX, sin omitir; assistant propio825/825PASS. Ningún modelo/API real invocado. TresPNG de emisión con recibo inválido vistos a390/768/1440; no revisión visual de todos los88casos. HTTP sintético, no garantía de efecto único en hospedado. Consumidor Auth nuevo requiere su propia CI; fallo histórico7F permanece separado.

Colección de preview oficial590casos/desktop+mobile sin errores; sólo inventario en esta fuente, no ejecución590 aquí. La regresión amplia se ejecutará sobre el checkpoint documental siguiente y quedará ligada a ese SHA en issue67. Esta metadata no hereda88 ni1435PASS. ReleaseNO,IAwritesOFF,342sinpromoción. Handoff general incluye nuevas PR157/158 de Cowork; ninguna se fusionó ni se aplicó una migración87.
