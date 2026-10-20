# Unidad12 — compatibilidad de conflictos PT409 y reconstrucción87

Fuente2f87fdc8f56fbac86660cf77ac078bd79241bfd0; árbol6416c34d10852b86ed21eeada45ed7ba6986fc88. Publicada en rama propia/PR156; validaciones en curso. No es release.

**Actualización:** lintglobal/tipos/build44 de2f87 terminaronPASS. Su CLI39409261247 ejecutó53875cc6857bba278c031d9b877f4b82bba4b5fe y falló CHECK_PRODUCT_CHANGED_INPUT_CONFLICT; teardownPASS. Se detectaron seis aserciones heredadas dePR159 que pedían HTTP500 yPT409 simultáneamente. Corrección1f49a8347a50deb09502d63b1bcea1562a2491be/árbol933ef74d139ce4f40abf96457739f3a21ce6a8a0 exige HTTP409 yPT409 exactos en los cuatro bancos afectados, manteniendo un ganador/19conflictos y efecto único. LintdirigidoPASS; aún requiere repetir el CLI completo sobre su fuente. El primer fallo no incluye estado/código observados, por lo que no se afirma retrospectivamente que devolviera409 ni se convierte el run anterior enPASS.

## Procedencia y alcance

Revisadas59rutas de PR159 HEAD2f1b6dd7b449290aeff904f3bd13ca82f83ffecc. Se importan57:23mapeadores de servicio, la migración ya publicada, contrato bootstrap y expectativas SQL/nativas/HTTP. Se excluyen mode.ts y su test de staging HTTPS genérico; permanece la política de origen/proyecto/cohorte de unidad10. Dos bancos nuevos comprueban explícitamente40001 yPT409 en cliente y conversación con autoridad actual y error privado suprimido.

La migración cambia únicamente cuerpos de funciones y preserva owner/ACL/SECURITY DEFINER/config con guard transaccional. Se conserva el archivo W5 exacto20261020100000_business_conflict_non_retryable.sql, blob979164b7c979f31bd8001ae40013577e486c781f, SHA256LF5cb2704c505a82426b583f129be6a24d384b129ec4fd66d878dec91ea7524245. La unidad NO ejecuta SQL alojado ni reset/reapply. W5 reportó previamente su aplicación en staging87; la reconstrucción propia es sólo checkout/CI desechable.

PostgREST documenta la familia PTxyz para seleccionar el estado HTTP; PT409 corresponde a409. Referencia oficial consultada20/10:[PostgREST16/errors](https://docs.postgrest.org/en/stable/references/errors.html#raise-errors-with-http-status-codes). Los servicios mantienen40001 por compatibilidad. Las15sondas hospedadas comunicadas por W5 no son pruebas propias.

## Causal y QA inicial

Probe antes sobre941:2PASS40001/2FAILPT409; cliente devolvía internal_safe y conversación unavailable. Después:4PASS. La corrección de unidad10 incluida4ef29582 preserva SDK para BD loopback canónica cuando next start usa modo de compilaciónproduction; APP_ENVstaging/production o URLremota siguen rechazados sin admisión aprobada y laUIintegrada producción sigue apagada. Causal del transporte:2FAIL sobre941→48controlesPASS. No se cambia run-stack/W5.

Bootstrap propioWindows:646PASS/6FAIL de652. Cinco corresponden a permisos POSIX ya preservados; el sexto es incompatibilidad real del perfil fijo85/86 con el directorio87. Assistant827PASS,0FAIL/skip/retry; no modelo real. Lint/typecheck/build de esta fuente aún en curso al crear este documento. CI39409261525/Supabase39409261247 requieren sus propios resultados, sin herencia de474/941.

## Bloqueo de perfil nativo

loadOwnedConsumerMigrationsV1 admite sólo los85blobs fijados y la extensión exacta86. El test que exige admitir el checkout real y los consumidores nativos86 rechazan87. Se mantienen loader, manifiesto, workflow y prueba intactos; no se elimina migración, se relaja el pin ni se transforma rechazo enPASS. REQUEST a propietarioW5 issue67/6289026792 aporta fuente/blob/hash y pide propuesta separada de perfil87 con positivos/negativos y restore real. El perfil antiguo conserva su cierre estricto. ENV_INVENTORY_DRIFT también debe reconciliarlo W5; se reconoce el delta nuevo de dosbindings y migración87.

P0Storage, accesoNetlifyEdge, cohorte autorizada y revisiónW4 independiente siguen pendientes. Sin flags reales, hosting, secretos, main, producción o resellpro. IA de negocioOFF/gasto0, AuthDBhospedadoNOT_TESTED, releaseNOT_ACCEPTED.
