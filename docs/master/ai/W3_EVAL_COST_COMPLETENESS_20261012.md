# W3: coste desconocido separado de subtotal observado

El agregador de benchmarks devolvía `costMicrousd:0` cuando todas las llamadas fallaban sin informar uso, junto a `usageComplete:false`. En una ejecución mixta devolvía el subtotal conocido bajo el mismo nombre de coste total. Esto no demuestra coste cero: un timeout o error puede haber consumido tokens aunque no recibamos medición.

El contrato ahora devuelve `costMicrousd:number|null`: solo hay total cuando todas las observaciones tienen coste. `observedCostMicrousd:number` expone por separado el subtotal efectivamente medido. Uso completo con tarifa sintética cero conserva total cero; uso ausente conserva total desconocido. El agregador rechaza costes negativos, no enteros/no finitos y sumas fuera del rango entero seguro.

Se ejecutaron tres regresiones antes de corregir el padre `58cc56cc2eebef3f6162ea977bf7fd51af3e8dcf`; fallaron. Cubren todo-desconocido, mezcla conocido/desconocido, cero sintético genuino, total completo conocido y entradas/coste acumulado inválidos. Los consumidores existentes de total completo siguen siendo compatibles; ningún consumidor encontrado exige número sin revisar completitud. No se guardan prompts, resultados ni excepciones del proveedor.

Alcance: métricas deterministas del evaluador existente. No activa API, no consulta tarifas actuales, no prueba calidad de modelo vivo ni establece facturación real. Política de precios, límites/concurrencia por empresa y medición durable de consumo siguen pendientes. Modelo vivo NOT_RUN y presupuestos comerciales NOT_IMPLEMENTED; IA writes OFF, release NOT_ACCEPTED y controles propios de esta fuente necesarios. El subtotal no permite aprobar un presupuesto ni un coste de explotación.
