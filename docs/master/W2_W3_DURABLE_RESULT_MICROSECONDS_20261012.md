# W2/W3: cronología exacta de respuestas duraderas

La fuente padre `bba095fa0f5d0634ef7372438ee8aaf2bb49be4f` aceptaba una respuesta de finalización o reconciliación positiva con `updatedAt` un microsegundo anterior al registro autorizado previo. Ambos registros individualmente cumplían su contrato: el defecto estaba en comparar la transición mediante `Date.parse`, que pierde las tres últimas cifras fraccionarias de PostgreSQL.

Dos regresiones ejecutadas antes de corregir el código fallaron por ausencia del rechazo esperado. La comprobación común reutiliza la validación de timestamps y el cálculo exacto de microsegundos del productor de resultados existente. Ambos puertos la aplican después de validar la identidad, versión, recibo y contenido de la respuesta, y antes de exponer el resultado. Cada regresión también comprueba instantes iguales, un microsegundo posterior y un offset equivalente; no obliga a que la transición avance artificialmente el reloj.

La corrección rechaza la respuesta inconsistente como indisponible. Una mutación privada puede haber ocurrido: no se afirma rollback ni se inicia una segunda llamada para compensarla. Las pruebas comprueban una sola llamada y la señal abortada al finalizar. No cambia SQL, migraciones, schemas, permisos, timeouts ni auditoría.

Alcance: contrato W2/W3 con transporte sintético y controles propios de esta nueva fuente. No acredita los 23 escenarios físicos, ausencia autoritativa, reinicio del recurso W5, efectos comerciales completos ni revisión W4. Las escrituras comerciales IA permanecen OFF, issue #10 OPEN y release NOT_ACCEPTED. Los resultados anteriores de BBA no se heredan a esta revisión.
