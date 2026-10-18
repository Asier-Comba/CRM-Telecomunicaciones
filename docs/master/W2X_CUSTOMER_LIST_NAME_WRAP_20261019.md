# W2-X96 — Nombre completo dentro del enlace de la tabla de Clientes

CLAIM6256007130. Rama propia `codex/w2x-customer-list-name-wrap-20261019`, padre `becd6984d201cec807d91dc9e512ee254b05d9d6`. Ese padre solo revisa metadata; sus árboles src/tests son idénticos a94 por comprobación directa. No se heredan sus75 pruebas ni se atribuye runtime al SHA de metadata.

## Reproducción y corrección

La tabla de Clientes muestra un enlace flex con icono y nombre. Un nombre sintético válido de160 caracteres sin espacios ocupa1299 píxeles de contenido en un enlace de347 a768 y363 a1440. El texto invade otras celdas aunque la página no crece. La tarjeta móvil ya ajusta el mismo nombre correctamente y no se modifica.

La reproducción válida conserva2FAIL4PASS en39,8s: dos nombres largos en tabla fallan; largo y ordinario en móvil y ambos ordinarios en tabla pasan, incluida la selección, su limpieza y el filtro. El primer intento de medición falló dos veces antes de medir porque buscaba td en la tarjeta móvil article. Se corrigió solo el ancestro responsive a td/article, con las mismas aserciones y sin cambiar el producto. Ambos intentos, bancos, resultados y logs se conservan.

Solo se añade mínimo de ancho0 y envoltura en la clase del enlace de tabla existente. Permanecen el icono, el nombre completo, el href, las columnas, los umbrales responsive, las tarjetas móviles, los filtros, la selección y las consultas. No se introducen otra primitiva, nueva lógica de producto o servicio.

## Controles propios

Nueve casos primarios, largo/ordinario/denegado en390/768/1440. Los positivos miden el contenido del enlace, comprueban el href y ejercitan seleccionar, quitar selección y filtrar por estado, conservando la limpieza de selección. Los denegados comprueban alerta y ausencia de filas/cuerpo privado. Las lecturas de opciones del formulario son independientes y no se presentan como ausencia de lecturas tras denegación.

Suite propia60/6: nueve primarios y51 regresiones representativas de Customer360, colecciones de Servicios, foco/paginación y retirada de recursos. Resultados finales y hashes de las capturas realmente inspeccionadas constan en `work/w2x-customer-list-name-wrap-checkpoint.json`; no se anticipa PASS en este documento.

Nueve capturas iniciales revisadas: la corrección del título de tabla es visible en768/1440. En los dos positivos390, los filtros ocupan el primer cuadro y la tarjeta queda debajo: su nombre y acciones tienen evidencia DOM, no aceptación visual de esa tarjeta. La alerta denegada sí es visible en las tres anchuras. No se oculta este límite ni se repite la suite verde solo para contar más imágenes.

Se extiende el modo del fixture customer-resource existente para montar IntegratedCustomers real. El AppRouterContext es un contexto de prueba controlado con la interfaz de Next instalada, incluido bfcacheId; no se afirma navegación Next integrada ni funcionamiento de push/replace/prefetch reales. No se crea otro servidor o recurso W5. Las ramas previas del fixture mantienen su comportamiento.

Componentes, repository y parsers reales con respuestas HTTP sintéticas. Sin comandos en primarios; los contextuales conservan solo su alcance. AuthDB/JWT/RLS/roles/membresía/multiempresa física/modelo vivo NOT_RUN, API0. ProductProvider real ya remonta su ámbito: no se fabrica otro defecto de scope mediante un proveedor de prueba que no lo remonte. No aceptación de seguridad, permisos, todas las columnas del inventario, accesibilidad o táctil. Sin ausencia/quiescencia/reinicio/handler/full23.

PAR046 sigue PARTIAL en su fuente94; la matriz32PARTIAL/310sinreconciliar/342/0READY no recibe nuevas promociones.2043/source88 y2109/source92 conservan pines y controladores, sin acreditar96. F736/B9 y originales mantienen su alcance y causa completa desconocida. CincoHIGH y W4 pendientes, IA comercial writesOFF, issue10OPEN, releaseNOT_ACCEPTED. Sin cambios a main, ramas ajenas/principales/congeladas, W3/W4/W5, recurso nativo o producción.
