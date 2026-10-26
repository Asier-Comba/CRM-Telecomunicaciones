# Unidad60 · paquete físico recuperable

Problema cerrado: faltaba un paquete standalone conservado, ligado a fuente y verificado fuera del checkout.
El Dockerfile ya montaba correctamente sus5orígenes; no se atribuye un defecto a Next por omitir assets de standalone.

- Código: **e1fba41349c67516479687d6e7aafe91ede5bc9e**, árbol a163236800cdf7c4b0433eb24b4d9ff484155181, padre3e98b55.
- Rama:codex/release-artifact60-20261026. Candidata principal#191 intacta en3e98b55.
- Alcance:tools/asier_release60/**; Dockerfile,src,SQL,plataforma,CI y configuración compartida idénticos a3e98.
- CLAIM/decisión W0:issue67 comentario6423132985. Sin ACK/reasignación W2 recibidos al comprobar.

## Antes → después, misma fuente y build

Build real con el script existente `scripts/platform/boundary.mjs --build`, entorno aislado sin valores backend públicos ni credenciales heredadas.
PASS:25clases de canarios privados;2476archivos generados/logs/cache comprobados por el validador existente.
Node24.20.0/Next16.4.3/Windowsx64. El build incluye su comprobación de tipos de producción.

| Comprobación física | Standalone sin montar | Paquete restaurado |
|---|---|---|
|Liveness y cabeceras|PASS|PASS|
|Backend ausente503 y producto cerrado|PASS|PASS|
|Bytes estáticos exactos|FAIL|PASS|
|Bytes públicos exactos|FAIL|PASS|
|Canarios privados ausentes del log|PASS|PASS|

El montaje reutiliza exactamente los5COPY existentes, incorpora entrypoint/configuración sin cambiarlos y rechaza nuevos COPY no revisados.
Se restaura a otra carpeta, fuera del checkout y sin NODE_PATH/configuración de proveedores heredados.
El arranque físico usa el entrypoint existente en LOCAL aislado; no elimina el rechazo STAGING/PROD ni acredita runtime alojado.
Procesos propios detenidos tras las pruebas; ningún servicio protegido ni puerto3109 utilizado.

## Artefacto retenido

- ZIP: **7736059bytes**,2509archivos de runtime más manifiesto.
- SHA256: **3a262cbf77f8a1130ccab6550f04de6f842b98d17463d268b0fc3c5020f675da**.
- Dos ZIP del mismo build:bytes idénticos. No se afirma identidad entre rebuilds de Next con nuevos buildID.
- Manifiesto interno:fuente/árbol,lock,plataforma,buildID y hash/tamaño por archivo;perfilLOCAL_UNCONFIGURED explícito.
- Restauración validada contra fuente y digest esperados antes de arrancar. SHA equivocado y digest equivocado rechazados también sobre el ZIP real.
-18pruebas focalizadas PASS(8Node+10archivo),0skip;lint y sintaxisPASS.
-Negativos:bytes alterados aunque se recalcule hash exterior,archivo extra,colisión de nombres,traversal,junction/symlink,dotenv/clave/cache y sobrescritura.
-ZIP conservado localmente en outputs/Integration-2026-10-26/unit60/attempt01;no subido al repositorioPUBLIC ni a un registro.

## Límites y siguiente unidad

Es un artefacto Windows sin backend configurado; no es un bundle del adaptador Netlify, imagenLinux, manifest de registro,
loginAuth,persistenciaCRM,W4_ACCEPTED ni release autorizado. Integridad no sustituye firma/autenticidad ni revisión independiente.
El código puede incorporarse selectivamente junto a la futura corrección autorizada; no se mueve#191 sólo para repetir CI pesada por una utilidad externa.
Se pide revisión W5 del contrato de copia/procedencia y W4 de los límites de archivo/restauración antes de adopción.

W0 tiene una única solicitud explícita de decisión sobre IntegratedPortfolio, arnés real F0/F5 y Reports sólo si la causa demostrada lo exige.
Silencio no autoriza cambios. No se rehacen repros58/59 ni se consume#185/Storage88.
Auth real de#191 permanece103/116(run40307021660);no suite completa repetida ni aceptación trasladada a este SHA.
Permiso de origenNetlify,cuota/adaptador/artefactoalojado,W4/W5 y autorización del propietario siguen pendientes.
La referencia de netlify.toml a un workflow inexistente tampoco equivale a una ruta de deploy ejecutable.
Siguiente unidad prioritaria:decisión W0/entrega W2→corrección causal autorizada→composición y aceptación del nuevoSHA.
Sin cambios de Supabase staging,Storage88,hosting,main,Arizan,IA live/escrituras o costes.
