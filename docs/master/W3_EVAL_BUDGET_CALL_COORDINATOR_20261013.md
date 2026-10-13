# W3 — Reserva, transporte y liquidación de una llamada de evaluación

El ledger local ya conserva el saldo entre procesos. Faltaba una unidad que
hiciera inseparables reserva previa, envío único y liquidación del uso observado.
`runBudgetedEvaluationCallV1` coordina estos tres pasos sobre el ledger existente:
una repetición o una reserva pendiente nunca llama al transporte. Una excepción,
respuesta perdida, tarifa incompatible o uso fuera de cota conserva íntegra la
reserva y bloquea nuevas llamadas incluso después de reabrir SQLite.

La cota de entrada se vincula al SHA256 de los bytes exactos enviados. No se
estima a partir de caracteres. Modelo explícito, texto sin herramientas, sin
streaming, `store:false` y tier `default`; se excluyen opciones externas capaces
de introducir cargos adicionales. Las tarifas son una entrada privada del host,
no una verificación automática de precios ni una autorización de gasto. Los
tokens cacheados se calculan por separado, con aritmética BigInt y redondeo hacia
arriba a microUSD. Este importe calculado no es una factura del proveedor.

Una respuesta `incomplete` puede haber consumido tokens: su uso válido se
liquida aunque su calidad no sea aceptable. No se equipara respuesta completa
con uso gratuito ni con precisión. El coordinador devuelve la respuesta solo al
consumidor privado; no guarda prompts, respuestas, claves ni excepciones.

Tres pruebas focalizadas utilizan archivos SQLite reales y transporte inerte:
reserva visible desde otra conexión antes de enviar, uso cacheado en respuesta
incompleta y repetición; pérdida/uso desconocido/tier distinto/cota excedida con
reapertura; bytes alterados, presupuesto máximo, cancelación y concurrencia.
Los importes y el modelo de estas pruebas son sintéticos, no tarifas OpenAI.

La ruta `eval-live-v2.ts` sigue denegada. Faltan instalación privada de clave y
modelo, tarifas comprobadas, cota de entrada comprobada, ledger canónico único,
transporte Responses del backend y muestra autorizada conectados y revisados.
Este módulo no los sustituye, no crea un ledger automáticamente y no dispone de
fetch ni reintentos. No API real, no gasto, no modelo vivo, IA writes OFF,
release NOT_ACCEPTED. Límites compartidos 1.500.000 / lote 500.000 microUSD.

Referencia de protocolo: [conteo oficial de tokens](https://developers.openai.com/api/docs/guides/token-counting).
`max_output_tokens` comprende también tokens no visibles; no se añaden los
tokens de razonamiento una segunda vez al `output_tokens` medido.
