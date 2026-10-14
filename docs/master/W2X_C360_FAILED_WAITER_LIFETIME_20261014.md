# W2-X — respuestas pendientes después de una acción fallida

CLAIM issue67 comentario6157715752. Rama propia codex/w2x-c360-failure-waiters-20261014 desde9c361 cualificada. No se escribe el headF79 activo ni run-stack/infraestructuraW5.

El consumidor C360 prepara waitForResponse antes de una acción. Si esta falla antes de esperar la respuesta, el Promise puede rechazar posteriormente fuera de check. Un proceso Node con consumidor real y Chromium, documento deliberadamente sin UI/API y timeout de fixture40ms observa cuatro checks FAIL y dos rechazos huérfanos en la fuente original. El probe original queda conservado.

Ahora se registra un handler en ese mismo Promise y se devuelve el Promise original. Si el control lo espera, sigue rechazando: la prueba exige TimeoutError del primer check y que todos los controles sigan fallidos, sin ningún PASS. Si una acción anterior ya abortó el control, la respuesta pendiente no produce otro rechazo sin recoger. No cambia timeout productivo, predicate, aserciones, SQL, permisos, cuerpo ni resultado de lectura.

Navegador/proceso real:1/1 test PASS; probe final conserva cuatro controles FAIL, primer TimeoutError y ningún rechazo huérfano. Typecheck/lint pasan. Es prueba de orquestación sintética del consumidor, AuthDB NOT_RUN; no acredita aceptación de producto ni una causa completa del safe ausente enD764. La codificación deD764 y REQUEST6157549134 permanecen separados y conservados.

Solo se modifica el consumidor existente y se añade su fixture/test, sin otro backend/servicio/primitiva. El delta se publica independiente y se puede componer enPR153 después de sus controles terminales, con nuevas pruebas propias y sin otraPR. No PASS heredado, W4/cincoHIGH/full23/staging/modelo/release pendientes; IA writesOFF/issue10OPEN.
