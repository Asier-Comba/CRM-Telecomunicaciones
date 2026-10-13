# W2/W3: constructor del ciclo físico positivo

Base de autoría: PR142 `826a84c1875ff54897e3f75f8bb98e98914d87a2`, elegible con sus controles propios. Integración preservada: PR38 `d6e2ddba6535cc0b6d07fc99b8b48810140384eb`. La aceptación de estas bases no se hereda a esta modificación.

## Cambio y consumidor

`src/assistant/durable-positive-lifecycle-factory-v1.ts` reúne los constructores existentes de material privado, reserva confirmada, outbox, finalización, reserva sin confirmación y reconciliación positiva. No reimplementa sus transacciones ni sustituye el planner. El consumidor real es `scripts/security/native-postgres/positive-reconciliation-worker.mjs`: conserva su conexión PostgreSQL persistente, barreras, transportes permitidos, consultas de procedencia y recuperación por proceso.

La composición usa una única fuente de registros de dispatcher/capability/schemaVersion y una única función de autoridad fresca. Exige todos los loaders privados, verificador de recibo, origen de confirmación y transporte; no crea callbacks permisivos por defecto. Copia los valores de descriptores admitidos y captura dependencias de configuración, sin ejecutar accessors. Las llamadas de autoridad siguen siendo dinámicas; no se guarda el usuario autorizado como resultado de construir el módulo.

Los productores de resultados son distintos: finalización conserva la denegación por defecto de registros en cuarentena; reconciliación positiva usa su opt-in tipado. El objeto expuesto y el port quedan congelados. Hay once nombres de método conectados, pero **esto no acredita once métodos físicos completos ni ausencia autoritativa**: los outcomes negativos siguen devolviendo `invalid_transition`. La propiedad `verifiedAbsence:false` y `businessEffectsEnabled:false` hace explícito ese límite.

El consumidor nativo actual prueba el subconjunto que ya usaba: reserva sin confirmación, finalización, lectura y reconciliación positiva. Su transporte sigue siendo cerrado y no se amplía para fingir cobertura de los otros métodos. Continúa usando capacidades/receipts de fixture y no un handler comercial habilitado. Las primitivas de veinte procesos y corte posterior a commit deben ejecutarse de nuevo para esta fuente.

## Verificación

Seis regresiones de contrato locales PASS: superficie congelada y construcción sin consultas; dependencias ausentes/accessors; registros inválidos/duplicados; material registrado antes del transporte; revocación después de cargar el draft y tras construcción; denegación de ausencia reintentable/terminal sin lectura ni mutación. Strict ES2017 y sintaxis del consumidor PASS. La suite completa/lint se registran con la publicación exacta; PostgreSQL nativo, restauración, navegador y Supabase requieren controles propios de esta fuente. Las pruebas locales son sintéticas y no sustituyen ese resultado.

No hay migración, cambio de esquema, recurso W5, escritura comercial activada, modificación de fuente W4/W5, proveedor vivo ni llamada API de pago. El registro de lanzamiento sigue342/8PARTIAL/334NOT_RECONCILED/0RELEASE_READY, sin promociones.

## Dependencias y continuación

Issue10 OPEN, IA writes OFF, release NOT_ACCEPTED. Recurso/reinicio W5 y ACK conjunto de la [interfaz propuesta](W2_W5_NATIVE_RESOURCE_CONSUMER_V1_20261011.md) pendientes. W2/W3 conserva el driver de negocio v3 con seis exports, handler real, fábrica/ausencia completas y pruebas23/cuatro carreras completas/seis cortes/quiescencia/reinicio antes de pedir aceptación W4. Este constructor prepara su composición positiva sin adjudicarse esos resultados.

Siguientes unidades: cerrar controles propios de esta candidata; ampliar el consumidor/driver con pruebas físicas independientes cuando sus dependencias estén disponibles; mientras falte el recurso W5, avanzar con lecturas esenciales autorizadas y contratos minimizados existentes de W1. No consumir una candidata fallida ni cancelar su ejecución al publicar encima.
