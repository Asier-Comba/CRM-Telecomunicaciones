# Customer360 → atención: conservar el cliente

CLAIM 6212750000; base 2741fb82047534ecdf27044f25514f0d690b69e3, rama propia codex/w2x-customer-attention-context-20261016.

Dos clientes de la ficha Customer360 enlazaban a /attention sin customer. El Centro de atención tampoco admitía contexto inicial. La reproducción original a 1440 terminó 5 FAIL y 4 PASS: dos href sin customer, dos consultas iniciales sin customer_id y un intento denegado sin ese filtro. Son pruebas de presentación y transporte controlado, no reproducciones de una fuga de datos ni aceptación de autorización.

El enlace conserva customer; la página Next espera searchParams y pasa únicamente un parámetro string al componente, usando key por contexto para su navegación. El componente valida la forma UUID y normaliza minúsculas antes de iniciar el estado del filtro. Entrar sin parámetro o con forma inválida mantiene la consulta general. Paginación y actualizar conservan el cliente; Limpiar filtros elimina cliente y cursor explícitamente. No cambia el contrato ni permisos de telecom.attention.

El banco propio contiene 60 casos en 4 archivos: 27 del contexto y negativos, 33 regresiones Customer360/lecturas/comandos. Los 60 terminaron PASS en 1.2 minutos. La ruta Next queda compilada y revisada en fuente; el navegador controlado prueba el enlace real y el componente de destino por separado, NO el enrutamiento Next integrado ni Auth/DB real. No se atribuye aquí esa aceptación. El checkpoint externo registra compilación, lint, scan, hashes, commit y publicación propios.

Antes del banco final se refinó la respuesta sintética de paginación: next_cursor requiere página completa y última tupla coincidente. El original conserva su archivo y todos sus fallos, que ocurrieron antes de consumir ese cursor; no se declara positivo alguno sobre la respuesta inválida. El final usa 20 registros de incidencia ordenados y cursor de la fila 20. La segunda página vacía es un dato del fixture, no una certificación de ausencia en base de datos.

Se revisaron seis capturas del SHA candidato (A/B a 390,768,1440), con filtros, cliente seleccionado y segunda página vacía; en móvil la parte inferior queda fuera del viewport. Revisión visual parcial, sin aceptación del módulo entero ni de nombres visibles de cliente (el selector muestra Cliente seleccionado). Sin pantallas nuevas ni modificación del selector compartido.

Global 1266 de 21a75fa y global en curso de 2741fb8 son fuentes distintas; ninguno se hereda a esta. Auth/DB y modelo vivo NOT_RUN, API pagada 0; cinco HIGH visibles, W4 pendiente, IA writes OFF, issue10 OPEN, release NOT_ACCEPTED. F736/B9/981 original, primer210 y fallo del script33 se conservan. Ramas ajenas, producción y recurso W5 intactos.
