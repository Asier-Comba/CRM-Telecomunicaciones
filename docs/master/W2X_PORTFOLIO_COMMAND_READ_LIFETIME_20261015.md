# W2-X · Cartera: lectura tras comando y retirada de contexto ·15/10/2026

CLAIM6199739994, base2468b2d376d8d1de5a1303e175de4833b312467d. Alta de servicio y activación de contrato: respuesta pendiente, cambio de empresa, liberar recibo. Fuente original realiza una lectura posterior del contexto anterior: dos FAIL esperado0/observado1, junto con dos positivos vigentes PASS. No prueba acceso SQL ni resultado comercial real.

IntegratedPortfolio.saved comprueba la vigencia del componente antes de iniciar la lectura y después de su respuesta. El cleanup que ya invalida búsquedas/selección también invalida esta lectura. No cancela el comando, no cambia intención/recibo/idempotencia, permisos, parsers ni backend. Los recibos vigentes conservan su lectura y tarjeta.

Se reutiliza PipelineFixtureProvider.resetOnScopeChange con parámetro opt-in reset_scope=1 para reflejar el ProductProvider real, cuya clave contiene empresa/actor/rol. Default del fixture permanece igual. Primer intento sin opt-in: dos fallos antes de causal; preservado separadamente, no contado como reproducción del producto.

Banco final previsto244:30 nuevas (alta/activación×empresa/actor/lector/referencia/vigente×390/768/1440) y214 regresiones propias reejecutadas sobre esta fuente. Registros, cuerpos y efectos simulados mediante repositorio/parsers de producción y HTTP controlado. Los números finales y hashes deben consultarse en checkpoint, nunca inferirse del previsto.

Visual pendiente hasta inspección real de capturas actuales. Auth/DB/Storage/modeloNOT_RUN/API0; no aceptación completa ni W4. HIGH5 visibles, IA comercial writesOFF, issue10OPEN, releaseNOT_ACCEPTED. Ramas38/142/153 y fuentesW3/W4/W5/recurso intactos. Fallos originales preservados.
