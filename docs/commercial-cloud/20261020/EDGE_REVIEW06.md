# EDGE-REVIEW-06 — revisión independiente acotada

Propuesta W5e42cfd59615a284bf26a758c4078c299bed39290 / PR163, basada en3b80. Solo dos archivos cambian: admisión y su test. Este work no modifica ninguno: añade un banco de revisión separado, consumible por Asier, sin otro contrato de admisión.

## Evidencia propia

- Banco original35/35 ejecutado sobre e42 exacto, no heredado del informeW5. Cubre binding/origen/proyecto, proxy503sinSDK/no-store, usuario fuera de cohorte403cerrado, AuthgetUser fresco, revocación en siguiente petición, fábrica de servidor, cookiesSecure y separación de peticiones. ClienteAuth controlado; no AuthDB real ni Netlify.
- Banco adicional d69445da:10/10 con compilador SWC instalado de Next16.3.8 y valor real de getDefineEnv de producción. Evalúa módulo compilado sobre runtime controlado sin NODE_ENV, no altera process.env real. El padre3b80 devuelve invalid, e42enabled; objetos de configuración ajenos siguen invalid. APP_ENVausente/producción, origen/proyecto incorrectos, cohorte ausente, flaglocal, no-cohorte con metadata privilegiada y revocación permanecen cerrados.
- Lint original d694 FALLÓ por variable local module prohibida por Next. Original conservado; 507f1cbe5b3ea28d6c55d944e9fd10f42c8c8b1d renombra solo variable del banco sin relajar aserciones.10/10 de nuevo y lint dirigido0. TypeScript0 medido sobre d694; no se atribuye nueva ejecución a507 porque solo cambia nombre de variable en.mjs. No se repite build del producto.

La prueba nueva W5 original sólo llama objetos de entorno explícitos: por sí sola no ejercita env===process.env ni el valor inlinado. El banco adicional cubre ese hueco de forma local controlada, conservando el positivo y los negativos. Next define observado: node_modules/next/dist/build/define-env.js establece process.env.NODE_ENVproduction para build no-dev. Transformación real del compilador, no reemplazo textual manual.

## Límites y adopción

Esto apoya semánticamente el delta; NO aprueba seguridad, ACK de integración, build completo Netlify/Deno, destino/config desplegados o negativos cloud. El informe W5 sobre el bundle y el recorrido sigue evidencia ajena. A/B de tenants, negativo fuera de cohorte en el deploy, voz y lecturaDB propia siguen NOT_RUN. Revocar configuración entre llamadas controladas no acredita revocación real de sesión/membresía ni despliegue actualizado.

Asier: revisar/adoptar el test aislado tools/oier_cloud_qa/edge-compile-review.test.mjs si procede junto a PR163; no fusionar esta rama como segunda integración ni interpretar este análisis como aprobación W4. W5 conserva hosting/config/nativo/Storage. Sin SQL, cohorte, permisos, secretos o rama ajena modificados. CincoHIGH visibles; IA writesOFF; releaseNOT_ACCEPTED.

Comandos locales: node --experimental-transform-types --test tests/bootstrap/product-staging-admission-v1.test.mjs (fuentee42); node --experimental-transform-types --test tools/oier_cloud_qa/edge-compile-review.test.mjs (fuente507). Originales locales por intento y hashes en EDGE_REVIEW06.json. No fuente funcional nueva del producto.
