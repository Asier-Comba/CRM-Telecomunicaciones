# W3: protocolo del evaluador aislado del contexto y del transporte

El padre `1955716eb5cd263d9811557d682ba856008ad189` tenía dos defectos reproducidos localmente: un campo `protocol` del contexto de un caso sustituía el protocolo de servidor, y el objeto del protocolo enviado al adaptador compartía referencia con la constante exportada. Un adaptador mutable también podía sustituir su callback entre casos, porque el wrapper del evaluador lo volvía a leer aunque el benchmark inferior ya conservase su transporte.

Un control independiente sintético y dos regresiones ejecutadas antes del arreglo observaron los incumplimientos. No hubo petición de modelo, herramienta CRM ni API de pago. Las regresiones comprueban los resultados fuera del callback y exigen casos puntuados: un error del adaptador capturado por el runner no puede convertir la prueba en un pase vacío.

La ejecución ahora toma una copia del protocolo por serie y otra por petición, sitúa el protocolo y la evidencia autorizada después de los datos del contexto y conserva el callback original con su receptor `this`. El contexto original permanece intacto; una mutación del objeto recibido no alcanza la constante ni la petición siguiente. El comportamiento existente de denominadores, timeouts, errores, coste, groundedness y ocultación de gold/IDs se conserva. No modifica el planner del producto ni sus capacidades.

Alcance: protección determinista del evaluador existente ante contexto/adaptadores mutables. Configuración `mode:llm` de un stub no demuestra modelo vivo; modelo real NOT_RUN. RAG operativo, presupuestos por tenant, durabilidad integral y W4 siguen pendientes; IA writes OFF y release NOT_ACCEPTED. Los controles propios de esta revisión son necesarios, sin heredar los pases de195 o1C0.
