# Retirar lecturas dependientes de una selección sustituida

CLAIM 6204361588. Base a0a3d0476feea251342ac48251fc3acd6f49402d. Rama propia W2-X; no adopción ni escritura en ramas de terceros.

## Reproducción y alcance

Dos reproducciones nuevas (SIM física y eSIM a 1440) fallaron antes de cambiar producto: después de seleccionar A, B y volver a A, la respuesta retenida de B iniciaba una lectura portfolio.get de su servicio. Esperado 0; observado 1 en ambos casos. Los logs y trazas originales se conservan fuera del repositorio.

readLineContext admite un cuarto argumento opcional que comprueba vigencia antes de consultar la línea, después de su respuesta y después de consultar los padres. La selección SIM pasa su vida actual. Los consumidores existentes de tres argumentos mantienen el comportamiento anterior. Una selección retirada produce AbortError local; no se interpreta como ausencia, autorización o cancelación física de una petición ya emitida. No se modifica ninguna política o primitiva W3/W4/W5.

La regresión añade una aserción de cero lecturas del servicio B a los seis escenarios de selección existentes, preservando cuerpos, CAS, permisos y controles de interfaz. Banco propio recogido: 330 casos en 14 archivos, unión sin duplicados de SIM, altas de incidencias y consumidores de portabilidad del helper. El checkpoint externo registra los resultados reales; este documento no declara PASS antes de que terminen los controles.

## Límites de aceptación

Navegador con HTTP controlado y DTO sintético, componentes y parsers reales. Auth/DB desechable y modelo vivo NOT_RUN; API pagada 0. VISUAL NOT_REVIEWED_CURRENT_SHA: no se heredan capturas de otras fuentes. El global 1266 pertenece exclusivamente a 21a75fa y continúa independiente. No se cancela ni sustituye.

Cinco HIGH siguen visibles; revisión W4 independiente pendiente, IA comercial writes OFF, issue10 OPEN y release NOT_ACCEPTED. Fallos F736, CASE_NOTE_CURSOR B9, 981 original y corrección de fixture del primer 210 conservan su evidencia y alcance. Ningún PASS de otro SHA se hereda.
