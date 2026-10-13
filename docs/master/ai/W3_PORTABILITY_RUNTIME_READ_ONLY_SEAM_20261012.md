# W3 — Puerto de portabilidades limitado a lectura en runtime

El factory devuelve ahora un adaptador dedicado, en lugar de una anotación de
tipo sobre PortabilityServiceV1.execute. Solo acepta portability.list, cliente
obligatorio y máximo20, sin filtros privados. Get/commands/operación no textual
y llamadas amplias se deniegan ANTES de consultar autoridad o invocar un RPC.
Solo W1 portability_v1_query, operación fija list y workspace del servidor.

Permisos/read DTO siguen en PortabilityServiceV1; minimización y fence de
autorización antes/después siguen en el ejecutor. No cambia endpoint ni permite
escritura. Las cuatro pruebas específicas usan un puerto W1 sintético observable:
ningún RPC/resolve ante operación inadmisible, límite/filtros, cuatro roles,
rol revocado y fallo del backend. No son Auth/DB real ni modelo vivo.

La candidata precedente c898 está publicada y necesita sus propios1249/334/
native85_320+ledger13/Supabase107. Esta descendiente requiere nuevos1253 (543+710)/
334/native13/Supabase107 tras controles terminales, sin cancelación ni herencia.
Conserva33 lecturas/214 casos/220 entradas y28/16/12 de esta rama; aún sin SIM.

Corrige la atribución del fallo bootstrap local Windows:538/543 PASS,5 FAIL.
Primera excepción en guard realpath(root)!==root, línea23, antes de permisos.
Probe físico propio de directorio vacío confirma canonical_equal:false y,
por separado, bits grupo/otros066 (privacidad POSIX no acreditada). No modifica
staging/crypto/guard: mismas fuentes del padre1CF. No acredita soporte Windows
ni rebaja controles; petición técnica W4/W5 y evidencia conservadas.

IA writes OFF, modelo NOT_RUN, cincoHIGH FAIL, full23/recurso/reinicio W5
pendientes, revisión W4 independiente y release NOT_ACCEPTED.
