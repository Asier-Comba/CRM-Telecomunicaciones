# Equipo completo en móvil

La captura real `team-390.png` de a035/Supabase37957116328 mostraba estados
Suspendido/removed cortados horizontalmente. La tabla de cuatro columnas
obligaba a desplazar lateralmente el contenedor para leer estados y acciones.
Esto no invalida el107/107 funcional de esa fuente, pero deja un gap premium.

La reproducción con IntegratedSettings, canManageTarget, repository.team/post,
parsers cerrados, Status/Badge, ConfirmDialog/Button nativos, React19, Tailwind
y Geist reales confirma overflow a390, sin overflow a768/1440. Usa seis miembros
sintéticos y HTTP/presentación en memoria, sin Auth ni SQL.

Se cambia únicamente la tabla de equipo a filas con cuatro etiquetas y campos
completos en móvil; conserva la tabla a partir de sm, roles semánticos y
encabezados accesibles. Se añade la traducción de removed como Retirado al
diccionario visual de Status. No se cambia ese estado del DTO ni la autoridad.
El resto de IntegratedSettings fuera de la tabla es idéntico, incluyendo
lectura, paginación, canManage, prepare, CAS, execute, retry, confirmación e
invitaciones. No altera backend/API/contratos/RLS/migraciones/dependencias/IA.

Con el ajuste, seis filas y sus cuatro celdas/controles caben a1440/768/390, sin
overflow ni errores. El helper integrado completo pasa en esas tres anchuras.
Propietario, propio usuario y retirados conservan ausencia de controles. Un
administrador tampoco puede gestionar otro administrador/propietario ni
seleccionar admin para un miembro.

La prueba móvil de componentes/repositorio/parsers reales canceló por Escape
una intención de rol iniciada con Enter, sin comando. Después confirmó cuatro
acciones sintéticas: cambio de rol, suspensión, reactivación y retirada, con
el mismo ID y expected_version1/2/3/4, cuatro command_id distintos y recibos
version2/3/4/5. Al retirar desaparecen select y acciones. Son efectos en memoria,
no pruebas de membresía/Auth/Postgres independientes ni aceptación W4.

El gate existente de layouts verifica ahora TODAS las filas, cuatro celdas,
controles y etiquetas móviles dentro del main, sin recorte horizontal, y guarda
tres capturas nuevas `team-complete-members-{1440,768,390}.png`. Conserva los
checks anteriores y tiempos. Requiere107/107 propio, calidad y capturas reales
revisadas antes de consumo. El107 de su base95 no acredita este árbol. #29/#10,
revisión W4, Windows persistente, semántica viva y aceptación comercial siguen
pendientes; escrituras IA de negocio OFF.
