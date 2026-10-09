# Importaciones: comprobar las filas de la lectura actual

La unidad97 corrige etiquetas de estado y diez familias omitidas. La aceptación
existente ya verifica listado, detalle, cancelación persistida y procesamiento
bloqueado. Sin embargo, sus capturas genéricas de cartera no esperaban ni
contrastaban cada etiqueta de importación con una respuesta actual validada.

Esta unidad amplía el check existente `desktop_tablet_mobile_layouts`, después
de la apertura/cierre del contrato referenciado, sin cambiar sus55 nombres de
main, el total107, las aserciones anteriores ni sus tiempos. Ejecuta el botón
ordinario Actualizar importaciones con el filtro vacío y correlaciona exactamente
su POST `importjob.list`/`{limit:20}` al endpoint del mismo origen. Exige HTTP200,
envelope cerrado y el parser real importjob.v1. Una respuesta HTTP503, campos
ajenos o ausencia/estado incorrecto del trabajo requerido se rechazan mediante
códigos cerrados. No captura payloads ni atribuye Auth/RLS a validación de DTO.

El trabajo requerido es el cliente sintético cancelado y comprobado contra SQL
en el check anterior. Cada fila recibida debe mostrar exactamente su ID abreviado,
familia española, estado español, número de filas y botón Ver trabajo. Comprueba
los elementos completos en viewport y la fila dentro de main, sin overflow
horizontal. Guarda `import-current-rows-1440.png`, `-768.png` y `-390.png`.
Se permite scroll normal; una captura no afirma que todos los registros quepan
simultáneamente. El helper realiza sólo una lectura por anchura: no cancela,
escribe, pagina, procesa archivos ni altera la configuración de permisos.

La reproducción nativa usa ImportJobs/Status/Badge/repositorio/parsers reales,
React19, Tailwind y Geist con HTTP e identidad explícitos en memoria.18 registros
cubren18 familias y8 estados. La comprobación rechaza las etiquetas antiguas en
las3 anchuras y acepta las18 filas actuales, manteniendo8 filtros/detalles por
anchura. También rechaza HTTP503, un campo extra en el DTO y la identidad de un
trabajo requerido ausente. Resultado69lecturas/0comandos/0pageerrors; miembro y
lector no muestran el panel ni realizan lecturas. Esta prueba no acredita
Auth/Postgres/cancelación nativa/W4. Lint2, sintaxis2 y diff PASS. Una comparación
del main confirma identidad de todo su código al retirar sólo el nuevo import
y la llamada del helper. No se cambia producto/backend/API/migraciones/deps.

Base ejecutada97: `edc06b00a72741375395b9e189284b033a7fa25e`, árbol
`15b20befb2f67ddbf7fb229c952790326b551b72`, idéntico a su fuentec9605698.
La aceptación propia del nuevo árbol107/Auth/history/grounding/Storage/teardown,
calidad y capturas reales permanece pendiente; no hereda la de su base.
Audit5HIGH/#29, durabilidad física/#10, W4, instalación Windows persistente,
semántica viva y aceptación comercial siguen abiertos. IA negocio OFF.
