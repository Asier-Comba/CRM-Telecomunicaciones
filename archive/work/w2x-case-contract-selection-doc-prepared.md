# W2-X: contratos de incidencia con operador, 15/10/2026

CLAIM6187486280. Base4ceac7fac6fa2abef8d0f7e8042b23cd6286fc22; rama codex/w2x-case-contract-selection-20261015.

Reproduccion original conservada:21 opciones cargadas; contratos de operadores distintos con igual fecha/estado mostraban la misma etiqueta. El navegador obtuvo Contrato del 01 oct 2026 / Activo en vez del operador esperado. No prueba una asociacion SQL incorrecta.

PortfolioRelationSelect resuelve solo operator_id con loadCollectionLabels existente: deduplicacion por pagina, cuatro lecturas concurrentes como maximo, permiso denegado con etiqueta segura. Conserva limites20/1, cursores y comprobacion exacta del seleccionado fuera de pagina. Valida customer_id antes de resolver operadores y no inicia esas lecturas si se retira el selector. Servicios y lineas conservan su comportamiento. No hay backend nuevo, endpoints, contratos ni recurso duplicado.

45 pruebas propias:18 nuevas en390/768/1440 (etiquetas, seleccion fuera de pagina, operador denegado, pagina denegada/recuperacion, cliente incoherente/recuperacion, respuesta posterior al cierre) y27 regresiones de incidencias. HTTP controlado con componentes/repositorio/parsers de producto; comandos comerciales cero. No es Auth/DB real.

Se conserva un primer intento45PASS cuya inspeccion visual detecto separador mal codificado. Build fallo causalmente por UTF-8 invalido en indice2241. Correccion explicita de codificacion y asercion de etiqueta completa; los resultados finales corresponden a la fuente corregida. No se oculta el fallo ni se relajan controles. Capturas propias de390/768/1440 inspeccionadas con operador legible; fecha/estado del select nativo se recortan al ancho movil. Aceptacion visual parcial, no aceptacion integral de Incidencias ni de otros consumidores compartidos.

Limite pendiente: contratos del mismo operador/fecha/estado pueden seguir siendo indistinguibles. Falta referencia comercial humana autorizada en DTO; requiere contrato coordinado con propietario W1, compatibilidad, privacidad multiempresa y evidencia individual. No mostrar UUID internos como referencia comercial ni afirmar unicidad total.

Controles finales, fuente publicada y hashes en checkpoint w2x-case-contract-selection-checkpoint.json.722/722 de4ce conservan solo eseSHA; no se trasladan a esta fuente. HIGH5 y revisionW4/ACK principal pendientes, IA comercial writesOFF, issue10OPEN y releaseNOT_ACCEPTED. Auth/DB/Storage/modelo vivo NOT_RUN/API0. Fallos historicos F736/B9/7F/3c7 y fixture cwd se conservan. Ninguna rama38/142/153/W3/W4/W5 ni recurso propietario modificado.
