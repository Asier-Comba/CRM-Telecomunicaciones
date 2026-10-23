# Unidad49: propuesta de actualización de seguridad Next.js · 23/10/2026

Estado: **PROPOSAL_ONLY / RELEASE_NOT_ACCEPTED**. Base #175, source f9aa469bec768ad73572a2f462f1f1505e6791a5, tree16d83e73283c66ca4988778a2068ba2d5d2c6b4b. CLAIM49 #67/6369270398, precisión de versión #67/6369315410. No mueve esa candidata ni adopta otras propuestas. No contiene los cambios de #186.

## Problema y cambio

El escaneo reciente de la imagen de #186 (Enterprise39981640449/job120510164332) reportó dos avisos CRITICAL y uno HIGH en Next16.3.8. El build/smoke había pasado, pero la imagen quedó bloqueada. Un escaneo histórico limpio no acredita seguridad vigente.

Se fijan **next y eslint-config-next16.4.3** exactos, dentro de16.x, manteniendo Node24 y React19.2.4. Registro oficial: Node>=20.9; compatible con .nvmrc24 y runtimeDocker24.21.0. Se verificó también la [publicación16.4.3](https://github.com/vercel/next.js/releases/tag/v16.4.3). Se conserva el lockfile y npm ci.

El lock mantiene497paquetes: solo12identidades cambian de16.3.8 a16.4.3 (next, eslint-config-next, @next/env, pluginNext y8binariosSWC). No se añaden ni eliminan rutas de paquete ni se actualizan dependencias ajenas.

Archivos: package.json, package-lock.json, infra/deployment/sbom.cyclonedx.json y este informe. No cambia código de aplicación, admission/Host/origin/Auth/cookies/RLS, Next config, Dockerfile, entrypoint, workflows o pruebas. No se modifica el test de inventario porque siguen siendo497componentes.

## Fuentes primarias y límites

Los mantenedores publican16.4.1 como primer parche de estos tres avisos;16.4.3 queda fuera de sus rangos afectados:
- [GHSA-2464-fhr4-w9xw](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw): Image Optimization y SVG en Linux con glibc.
- [GHSA-673q-mjm6-r5xr](https://github.com/vercel/next.js/security/advisories/GHSA-673q-mjm6-r5xr): funciones use cache que devuelven múltiples typed arrays.
- [GHSA-p3m5-59mp-jv5r / CVE-2026-94482](https://github.com/vercel/next.js/security/advisories/GHSA-p3m5-59mp-jv5r): denegación de servicio en App Router con Server Actions.

No se ensayan exploits contra el VPS ni se afirma que la configuración actual permita explotar cada aviso. Se actualiza la dependencia afectada; su imagen final requiere escaneo propio.

## Auditoría e inventario

Auditoría npm antes: **1paqueteCRITICAL (Next), con3avisos**. No son tres paquetes ni se suman a los cinco HIGH históricos como si fuera una única fotografía. La auditoría actual no reproduce aquellos cinco HIGH; se conserva su evidencia histórica y falta la decisión W4.

Después de instalar mediante npm ci --ignore-scripts y auditoría nueva: **0info/0low/0moderate/0high/0critical/0total**. Sin npm audit fix, overrides, waivers o filtros que omitan paquetes.

SBOM generado desde el lock con **npm10.9.3 fijado**, normalizado/verificado por scripts/platform/supply-chain.mjs existente.497componentes, SHA256normalizado08e9e3787248527c6d5c04e30786974fe617f5877ae502dae7d8fddafb550c2c. La primera generación con npm11 no cumplía el contrato por ruta; se descartó y se empleó el generador de la versión ya registrada. No se cambió la validación ni se excluyeron componentes.

El SBOM es del lock completo (desarrollo, opcionales, runtime), **no prueba un inventario instalado en contenedor ni firma/procedencia de una imagen publicada**.

## Pruebas reales locales

Entorno Windows, Node24.20.0. Guía instalada de self-hosting de Next16.4.3 leída; outputstandalone, proxy, variables públicas y caché siguen con sus reglas existentes.

| Comprobación | Resultado |
| --- | --- |
| Instalación por lock | npm ci --ignore-scripts PASS |
| Auditoría npm nueva | 0 vulnerabilidades |
| Bootstrap | 672ejecutadas:667PASS/5FAIL/0SKIP |
| Asistente | 827PASS/0FAIL/0SKIP |
| Plataforma | 107total:106PASS/0FAIL/1SKIP |
| Lint | PASS |
| Tipos después del build | PASS |
| Build Next16.4.3 | PASS,44/44páginas, standalone |
| SBOM normalización+check | PASS,497componentes |
| git diff --check | PASS |

Los5FAIL locales corresponden a import-staging-v1 (2) y protected-telecom-import (3), todos IMPORT_STAGING_INVALID en el guard de permisos privados de directorio. El adapter y ambas pruebas son idénticos byte a byte (normalizandoCRLF) a f9aa. El adapter importa solo módulos nativos Node. Una sonda desechable propia en Windows observó modo666; el guard (mode & 077) !=0 rechaza correctamente. Se eliminó solo ese directorio vacío propio, sin limpieza recursiva.

Esto identifica la condición de entorno, pero **no convierte esos5FAIL en PASS**. No se quitan guardas, se cambia ACL ni se añaden skips. CI Linux debe ejecutar los672 completos sobre esta fuente nueva. El1SKIP de plataforma es la aceptación nativa que su prueba reserva a CI desechable; no equivale a un PASS de persistencia.

npm test no alcanzó automáticamente la segunda batería tras los5FAIL; las827pruebas de asistente se ejecutaron aparte y finalizaronPASS. Los tipos se volvieron a verificar tras regenerar los validadores de build. No se hereda regresión UI/física de f9aa ni de #185.

Evidencia recuperable local: work/security49-before-audit.json, security49-after-audit.json, security49-tests.log, security49-assistant.log, security49-platform.log, security49-lint.log, security49-types-after-build.log y security49-build.log. No contienen valores de proveedores y no se publican logs crudos.

## Aceptación pendiente y rollback

CI Linux, preview desktop/móvil con unión exacta, aceptación física si se dispara, build/scan de imagen actualizado y revisión independiente W4/W5: **pendientes al publicar**. Se debe vincular cada resultado a su source/merge/tree antes de calificarlo.

La actualización no cierra vendor/history, aislamientoDocker, dominio, sesiónHTTPS, admisión del origen nuevo, contratoSMTP/startup o autorización de release. IA live/business writesOFF, Storage88NO, sin claves, Supabase ni hosting alterados.

Rollback de propuesta: revertir el commit solo en esta rama si se rechaza; nunca desplegar por ese rollback la versión vulnerable. La App crm-telecom-staging permanece vacía en EasyPanel, sin contenedor, source o credenciales.

Siguientes: revisar resultados propios y negativos de CI; W4/W5 decidir adopción de esta actualización y resolver vendor/history; componer solo deltas aceptados y probar la nueva composición antes del alojamiento.
