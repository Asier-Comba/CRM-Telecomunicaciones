# W2/W3 → W5: interfaz explícita del recurso PostgreSQL de pruebas

Estado: **propuesta de interfaz concreta de W2/W3 para ACK de W5; recurso no implementado ni consumido**. Esta propuesta responde al OFFER de W5 en [PR94, comentario 6084995168](https://github.com/Asier-Comba/CRM-Telecomunicaciones/pull/94#issuecomment-6084995168). W5 limita su trabajo al recurso y su runtime; W2/W3 conserva SQL, factory y controlador de negocio; W4 revisa independientemente.

## Consumidores existentes y punto pendiente

El consumidor directo existente es `scripts/security/native-postgres/positive-reconciliation-worker.mjs`. Abre `openPersistentNativeFixtureSessionV1()` de `persistent-fixture-session.mjs`, con una conexión `psql` mantenida por proceso. Los controladores existentes `positive-reconciliation-race.mjs` y `positive-reconciliation-process-cut.mjs` lanzan esos trabajadores y observan sus procesos y backends. Son primitivas de reconciliación positiva, no el controlador completo.

El constructor recibe el contenedor únicamente mediante `TELECOM_NATIVE_TEST_CONTAINER`, identificador privado hexadecimal de 12–64 caracteres. Comprueba la imagen, conecta a `telecom_test` como usuario local `postgres`, genera su propio `application_name` y obtiene su propio PID backend. No acepta una conexión ni un PID backend proporcionados por otro trabajador. Su cierre queda limitado a esa aplicación y base verificadas.

El controlador completo de negocio queda a cargo de W2/W3. Ruta propuesta: `scripts/security/native-postgres/durable-native-driver-v3.mjs`. **Ese módulo y sus seis exports completos todavía no están implementados**; no se presenta esta ruta como consumidor disponible. El runner existente es `scripts/durable-process-acceptance.mjs`, con semántica `assistant.durable-process.v3` y exports requeridos `setupScenario`, `connectWorker`, `execute`, `inspectBoundary`, `inspectScenario`, `cleanupScenario`.

## Superficie de recurso propuesta para acuerdo

Se acepta como límite de ownership propuesto por W2/W3 la superficie ofrecida por W5: `scripts/platform/durable-native-fixture.mjs`, su prueba `tests/platform/durable-native-fixture.test.mjs` y un job desechable propio. No se autoriza una función de negocio dentro de esa superficie ni se afirma aceptación conjunta hasta el ACK de W5.

API propuesta para ese módulo, pendiente de acuerdo y entrega por W5:

```ts
export async function createDurableNativeFixtureV1(): Promise<{
  contract: 'telecom.native-resource.v1'
  environment: Readonly<{ TELECOM_NATIVE_TEST_CONTAINER: string }>
  restart(): Promise<void>
  close(): Promise<void>
}>
```

- `createDurableNativeFixtureV1` crea exclusivamente su propio recurso desechable y la base vacía `telecom_test`. No recibe identificadores de un contenedor existente ni credenciales de producción. W2 aplica migraciones y crea los datos de escenario.
- La imagen del recurso nuevo queda fijada al export `NATIVE_POSTGRES_OFFICIAL_IMAGE` de `scripts/security/native-postgres/expected-image.mjs`. Esa referencia inmutable está verificada en el consumidor actual. No se cambia la imagen como parte de esta propuesta.
- `environment` es un canal privado entre el job y sus procesos hijos, sin credenciales de proveedor ni material publicado. No se imprime, no se incorpora a artefactos ni se usa como evidencia de negocio. W2 conserva el constructor de conexión independiente por proceso.
- `restart` actúa únicamente sobre el recurso creado por ese handle. Conserva el identificador privado, la base y el almacenamiento; espera disponibilidad. W5 comprueba ownership, identidad de recurso y un arranque posterior. W2 relee independientemente las filas y todos los ledgers de negocio antes y después; esos resultados no los certifica W5.
- `close` es idempotente, actúa solo sobre el recurso creado y verifica su retirada. No elimina ni reinicia un contenedor recibido del entorno, una base ajena o un recurso compartido. Debe comprobar identidad y ownership antes de la acción.
- Los fallos y artefactos públicos contienen categorías o resultados cerrados, sin identificadores de contenedor, credenciales, argumentos SQL ni datos de filas. El job desechable de W5 demuestra su recurso, no aceptación del CRM.

El trabajo de W5 puede arrancar cuando W5 confirme esta versión o proponga un ajuste explícito. W2/W3 no modifica fuentes de W5, no activa ese recurso por silencio y no añade ahora una dependencia de runtime al CRM. La conexión por proceso continúa siendo del consumidor de W2.

## Lo que queda por demostrar con el controlador completo

La composición con el recurso entregado requerirá una fuente exacta, un módulo de negocio implementado y controles propios. Sigue pendiente el conjunto de 23 escenarios, cuatro escenarios completos con 20 procesos Node y conexiones independientes, seis puntos de rollback, cortes antes y después del efecto, reinicio del mismo recurso y ausencia autoritativa con fencing y quiescencia.

La reconciliación positiva y su corte posterior a commit ya probados no demuestran ausencia verificada ni Full23. La ausencia no puede inferirse de una fila o un outbox vacíos mientras un proceso antiguo todavía pueda ejecutar. Las observaciones deben cubrir el registro completo, todas las auditorías originales, sus entregas y el baseline inmutable; los validadores existentes exigen los 21 campos de observación.

Hasta que existan módulo, recurso acordado, ejecución propia y aceptación independiente W4, IA comercial permanece **OFF**, issue10 **OPEN** y lanzamiento **NOT_ACCEPTED**. Esta interfaz no convierte ningún escenario pendiente en PASS.
