# Reserva persistente para evaluación local — W3

`scripts/assistant/eval-budget-ledger-v1.mjs` añade almacenamiento contable local
para el evaluador, sin sustituir los presupuestos por empresa ni el recurso
PostgreSQL W5. Usa el SQLite incluido en Node, con transacciones `BEGIN IMMEDIATE`
y sincronización `FULL`. No instala paquetes ni realiza peticiones al proveedor.
API y compatibilidad: [Node 22 SQLite](https://nodejs.org/download/release/v22.23.0/docs/api/sqlite.html).

La creación explícita es única. Reabrir un archivo inexistente, corrupto o con
política distinta falla: nunca significa un nuevo saldo. La política fija
1.500.000 microUSD compartidos y 500.000 por lote; los importes son enteros. Cada
reserva registra un identificador de llamada único y se confirma antes de volver
al consumidor. Los identificadores nuevos de lote no reinician el total.

Solo se admite una llamada no liquidada. Una pérdida de acuse, coste desconocido
o importe superior a la reserva conserva íntegramente el máximo y bloquea nuevas
reservas. No hay expiración, liberación automática ni recuperación que presuponga
coste cero. El replay de una reserva no concede un nuevo permiso. La liquidación
idéntica es idempotente; una liquidación contradictoria no cambia lo cobrado.

Pruebas sobre archivos SQLite reales: reapertura y ambos límites, coste
desconocido y superior al máximo, duplicados y conflictos, admisión cerrada,+ocho procesos independientes sobre el mismo archivo y terminación observada
después de confirmar una reserva. El primer fallo de limpieza de pruebas en
Windows se conserva; la limpieza corregida cierra los handles propios antes de
retirar exclusivamente el directorio temporal verificado.

Alcance: una primitiva contable del host local de evaluación. No acredita Auth/RLS
multiempresa, autenticidad de tarifas, medición de tokens o costes de OpenAI,
apagado físico del ordenador, aceptación W4 ni durabilidad de negocio v3. El
host debe mantener un único archivo canónico para la autorización compartida;
crear archivos distintos no constituye un presupuesto global. La privacidad
ACL de Windows tampoco queda acreditada por los permisos POSIX del archivo.

**No está conectada al proveedor**: todas las respuestas llevan
`dispatchAuthorized:false`. El evaluador sigue bloqueado hasta componer política
de precios verificada, cota de tokens, archivo compartido canónico, secreto
privado y liquidación del uso real. No se han realizado llamadas pagadas.
IA writes OFF; modelo vivo NOT_RUN; release NOT_ACCEPTED.
