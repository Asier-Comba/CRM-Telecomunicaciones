# Cierre exacto de migraciones del consumidor — W2

Responde a REQUEST W5 issue67/comment6146872077. La unión entregada PR147,
`a1b4357f890e0c5dda551dea57b2727e0f9984ac`, conserva los 85 blobs canónicos y
añade exclusivamente `20261008010000_align_provider_rpc_execution_grants.sql`.
El rechazo anterior se produjo antes de aplicar migraciones por exigir 85;
no se atribuye a SQL, disponibilidad del recurso o fallo de W5.

El consumidor propio captura y verifica todos los nombres y SHA256 de los
85 archivos antes de aplicar el primero. Solo admite esos archivos o esos
archivos más la extensión exacta de W5, SHA256
`700d2dea9db5351cb97a0256461e67e93d399d9c0b8320bbd2e8b96ed4f6da9b`.
No admite números arbitrarios, archivos sustituidos, SQL modificado, ausencias
ni aplicación doble. Las cadenas SQL verificadas quedan capturadas para evitar
volver a leer un archivo cambiado entre validación y ejecución.

La fixture JSON conserva los bytes exactos del SQL público entregado sin
instalar una migración nueva en el directorio canónico. El modo privado fijo
`delivered_grants_86` permite ejecutar esa composición en el mismo factory W5.
El workflow independiente mide su aplicación real y reinicio comprometido;
el workflow canónico conserva sus 85 migraciones. Ninguno copia el recurso ni
cambia imagen, puertos, autoridad, ledgers, baseline, replay, expiry o limpieza.
Los informes publican el número aplicado y la variante reales, no 85 fijo.

Cinco pruebas locales verifican los objetos reales de Git, LF/CRLF, ambas formas de
86, inmutabilidad, modificación/substitución, extras/ausencias y modo inválido.
Esto verifica admisión de fuente; la aplicación/reinicio físico de 86 sigue
NOT_RUN hasta cerrar su job de la fuente propia. La compatibilidad nativa no
equivale a Auth/DB del producto con 86, seguridad W4 o release. Se conserva la
unión86 fallida de W5 y se requiere nueva evidencia tras consumo de la entrega.

IA writes OFF; modelo vivo NOT_RUN; full23/ausencia/quiescencia/handler y
revisión W4 pendientes; release NOT_ACCEPTED.

Corrección posterior: SOURCEABA pasó la admisión en el checkout Windows pero
falló en Linux antes de aplicar migraciones. El manifiesto original se obtuvo
de `git archive` bajo conversión CRLF; una exportación fresca LF y `git cat-file`
reprodujeron85 huellas distintas. Ahora se fijan directamente los85 objetos
Git mediante un único batch y se conserva su OID. Solo se admite el archivo
exacto o la conversión de checkout CRLF que vuelve al mismo objeto LF; se aplica
la cadena que coincide con su SHA. No se cambian migraciones ni se admiten otras
transformaciones. Se conservan ambos fallos y sus alcances: consumidor canónico
rechazado en MIGRATIONS con teardownPASS, pruebas de86 fallidas antes de crear
su recurso; nuevo ensayo físico sigue siendo obligatorio.
