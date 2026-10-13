# Condiciones comerciales ligadas a la versión seleccionada

## Defecto y cambio

`VersionTerms` conservaba las condiciones de A durante la lectura de B. En el padre publicado `5da315ad67717e929fba067e8f2c1ff21a15a082`, tres pruebas de navegador (390, 768 y 1440 px) reproducen el título y los precios de A mientras la petición de B permanece pendiente. El caso usa el componente, repositorio y validación `catalog.v1` reales, con transporte HTTP sintético.

El componente exportado monta `ScopedVersionTerms` con la identidad de la versión como clave. Cambiar la versión retira sincrónicamente las condiciones y el error anteriores; la limpieza del efecto impide que una respuesta tardía de A sustituya C. Seleccionar de nuevo el mismo id conserva la instancia y no repite la consulta. Las condiciones vendidas siguen siendo lecturas de una versión inmutable.

## Comprobación local

Tres casos pasan en 390/768/1440 px: retirada del título y precios antiguos antes de responder B, precios/componentes propios de B, respuesta tardía de A después de C, acceso denegado a D sin conservar precios de C, cierre del panel, cero comandos, cero errores de página y ausencia de desbordamiento horizontal. Tipos estrictos de la superficie afectada y lint pasan. Las capturas de C corresponden a estos componentes y datos sintéticos; no acreditan Auth, SQL, RLS ni aceptación visual de toda la capacidad comercial.

La primera ejecución posterior al cambio fue interrumpida por un selector de prueba incorrecto (`Cerrar` frente al nombre accesible real `Cerrar panel`). Se conserva el registro y se corrige únicamente ese selector; los tres casos definitivos pasan. El fallo del padre de las tres anchuras conserva su evidencia independiente.

## Límites de aceptación

Esta unidad modifica producto y añade tres casos de navegador (seis en los dos proyectos de CI), por lo que requiere controles propios antes de consumirse en la integración. Resultado esperado tras publicarla: 208 pruebas de preview; no es una ejecución acreditada todavía. No promueve ninguna fila a `RELEASE_READY`.

La integración B423 conserva su fallo propio de Supabase: HTTP 500 HTML, categoría cerrada `SERVER_SYNTAX_JSON_INPUT`, antes de completar el historial y los recorridos de producto. La causa no está establecida; no se sustituyen los resultados por los de otra fuente. La última raíz funcional aceptada sigue siendo A885. IA de negocio OFF, aceptación independiente W4, seguridad, privacidad y escenarios físicos completos de durabilidad siguen pendientes.

## Investigación segura del fallo de integración

La siguiente unidad añade al diagnóstico de la respuesta rechazada `json_parse_frame`: `NEXT_MANIFEST_LOAD`, `HTTP_BODY_PARSE` o `UNCLASSIFIED`. Únicamente inspecciona los marcos de pila de un `SyntaxError` serializado por Next en `__NEXT_DATA__`, dentro del límite ya existente de 256 KiB. Exige el marco `JSON.parse` y una ubicación conocida del parser; no clasifica coincidencias sueltas en mensajes o datos de usuario. Solo exporta el enum, nunca la pila, ruta, HTML, JSON, cabeceras o credenciales. JSON y otros tipos de respuesta conservan `null` para este campo.

Se inspeccionó el código de Next 16.3.8 instalado (`server/render.js`, `server/load-manifest.external.js`); no se modifica Next ni su configuración. Cinco pruebas de diagnóstico pasan: casos Linux/Windows y parser HTTP, descarte de datos privados, documentos malformados, nombres de error incorrectos, coincidencias fuera de la pila y límites de tamaño. El campo describe un marco observado, no demuestra una causa ni convierte un error en recibo exitoso. B423 permanece FAIL y no se repite su árbol idéntico.

Esta unidad y la corrección de precios se publicarán juntas después de cerrar los controles de 5da. Esperados 1.142 funcionales (537 bootstrap + 605 asistente) y 208 preview; todavía requieren ejecución propia.
