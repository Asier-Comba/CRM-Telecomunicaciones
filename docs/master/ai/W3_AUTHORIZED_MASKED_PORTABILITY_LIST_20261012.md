# W3 — Portabilidades autorizadas del cliente seleccionado

Registra solo `crm.portability.list`, READ, local ON, stage/prod OFF. Reutiliza
PortabilityServiceV1 con cookie y autorización actuales, y valida el DTO W1 entero
antes de minimizar. Cliente obligatorio mediante referencia opaca autorizada o
dependencia única; no ID del modelo, selector de empresa, inventario global,
get/command/reveal ni confirmación física de transferencia con el operador.

Máximo20 filas, incluido el límite por defecto; estado/dirección y ventana civil
cerrados por W1. La ventana requiere ambas fechas, orden correcto y máximo366d.
Cursor íntegro, orden/IDs únicos y filtros del cliente comprobados; no truncado
silencioso. Next_id preserva parcialidad, no total ni ausencia global.

Solo máscara de tres dígitos, dirección, estado/fechas/motivo registrados y origen.
Se descartan IDs de cliente/contrato/servicio/línea/identificador/operadores/
responsable, versión y tiempos privados. ID/cursor internos permiten referencias
del servidor, sin aparecer como columnas ni datos del planner. La tabla usa
etiquetas de estado registrado; un estado completado no acredita al operador ni
que la línea haya cambiado. Permisos owner/admin/member/viewer existentes; fence
de empresa/actor/rol/epoch antes y después de cada await y al liberar resultados.

Banco213 anterior íntegro + un positivo =214; registro33 lecturas/220 entradas en
esta candidata (factura+portabilidad, sin SIM). Root64 tiene otro conjunto33/214
(SIM+factura), con historial real28/16/12 ya verificado. La composición futura de
los tres conjuntos necesita34/215 y su historial33/19/14 propios, sin sustituir
SIM por portabilidad ni heredar resultados.

Ocho controles sintéticos cubren filtros, privacidad, lifecycle, keyset,
parcialidad, roles y revocación. El control Auth/DB añadido prepara una portabilidad
draft sintética por W1/JWT/cookie fuera de la IA, usa número reservado ficticio,
verifica lectura de cookie real y máscara, consulta viewer autorizada, rechazo de
referencia extranjera y revocación durante lectura. Snapshot incluye todos los
padres/identificador/portabilidad/operadores e invoice; zero business writes y
historial de esta candidata exige28/16/12. Pending hasta ejecución exacta propia.

Propios previstos1249 (543+706)/334/native85_320+dos ledger13/Supabase107. Fallos
locales de importación de etiqueta y contador antiguo213 se conservan; no se
relajan controles. Modelo/planner sintético no evalúa LLM vivo; RAG Auth/Storage,
presupuesto duradero, full23 y recurso/reinicio W5 siguen pendientes. IA writes
OFF, cincoHIGH FAIL, release NOT_ACCEPTED y revisión W4 independiente.

Control bootstrap local Windows:538 PASS/5 FAIL, sobre543. Las cinco pruebas de
staging/importación cifrada son ajenas a esta lectura: constructor disposable
rechaza primero la raíz porque realpath(root)!==root (línea23), antes de evaluar
permisos. Un probe físico de un directorio temporal vacío propio confirma esa
desigualdad y registra también bits grupo/otros066: privacidad POSIX no acreditada.
No se usa esta segunda condición como causa de la primera excepción. Esas fuentes permanecen idénticas
a1CF, cuyo bootstrap543 propio en Linux cerró PASS. Se retiene el fallo local;
no se quita la validación de permisos ni se afirma PASS local543. La nueva fuente
requiere sus propios controles Linux completos y revisión W4/W5 de ese soporte.
