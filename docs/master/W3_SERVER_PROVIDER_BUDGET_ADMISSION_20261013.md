# W3 — admisión del proveedor del backend

El evaluador CLI ya estaba cerrado, pero la fábrica del backend todavía creaba
OpenAiResponsesProvider al encontrar una clave. La ruta v2 comprobaba ready y
podía invocar ese proveedor después de la reserva de conversación, que no es
una reserva del presupuesto global autorizado.

Reproducción en la fábrica real con clave/modelo ficticios y fetch inerte:
providerReady true, una solicitud simulada, ninguna solicitud ni gasto OpenAI.
No se modifica el comportamiento del código del proveedor para reproducirlo;
el marcador server-only se resuelve solo dentro del proceso de prueba Node.

Ahora la fábrica no admite un proveedor hasta instalar de verdad el controlador
canónico: devuelve null y la ruta existente responde not_configured antes de
turn.start y de cualquier proveedor. No hay flag de aprobación del entorno que
omita el gate. El adaptador y sus pruebas, lecturas, historial y contratos no se
retiran. No se impide una evaluación inerte ni se afirma que una clave instalada
sea inválida: su instalación no acredita control de gasto.

Una regresión reproduce el padre y verifica cero llamadas y ready false incluso
con configuración ficticia y aprobación presupuestaria inventada. No se usa ni
imprime una clave real. La prueba es de fábrica/adaptador, no Auth/DB ni modelo.

Pendientes para quitar el gate: clave privada y modelo explícito, tarifas/cotas
verificadas para bytes exactos, ledger compartido único, reserva antes de cada
solicitud, liquidación medida, pérdida/cancelación/crash sin reinicio del saldo y
muestra autorizada. 1,50USD global/0,50USD primer lote; no220 casos automáticos.
IA comercial writes OFF; modelo vivo NOT_RUN; release NOT_ACCEPTED.
