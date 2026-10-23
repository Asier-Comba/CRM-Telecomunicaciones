# Clasificación de hallazgos de seguridad (W5, 20/10/2026)

Clasificación del autor (W5). **No es revisión independiente**: necesita un revisor distinto. No se han aplicado excepciones, supresiones, `npm audit fix --force` ni cambios de umbral.

## 1. Dependencias: 5 HIGH = una sola cadena

| Paquete | Ruta | Exposición real | Mitigación | Estado |
|---|---|---|---|---|
| `braces` 3.0.3 (GHSA-vfj7-8cjw-p6xm, agotamiento de pila) | `eslint-config-next@16.3.8 → @next/eslint-plugin-next@16.3.8 → fast-glob@3.3.1 → micromatch@4.0.8 → braces@3.0.3` | Solo desarrollo: lint en local y en CI sobre patrones del propio repo. No entra en el bundle ni en el runtime de Next | Ninguna versión corregida de `braces`; el "fix" de npm es **degradar** `eslint-config-next` a 14.2.35 (major), que no se aplica | BLOCKER upstream; revisar en cada versión de `eslint-config-next` |
| `micromatch`, `fast-glob`, `@next/eslint-plugin-next`, `eslint-config-next` | Misma cadena (cuentan como 4 de los 5) | Igual | Igual | Igual |

Runtime: 0 HIGH/CRITICAL.

## 2. Historial Git: 23 hallazgos de gitleaks 8.24.3 (todas las ramas y tags, 1.460 commits)

Escaneo local con el mismo binario fijado que CI (checksum oficial verificado) y con `--redact`. El informe bruto **no se publica ni se conserva**. Por política del auditor, este documento **no publica ubicaciones** de los hallazgos; la tabla con rutas la tiene W5 en privado para el revisor.

| Clase | Nº | Criterio verificado sin revelar valores | Exposición real |
|---|---|---|---|
| Referencia a variable de entorno (el valor nunca está en el repo) | 7 | El "secreto" detectado es el texto de la expresión que lee la variable | Ninguna |
| Expresión de código | 1 | Texto de una expresión JS, no un literal | Ninguna |
| Prosa / texto de documentación | 3 | Palabras de un párrafo en español | Ninguna |
| Cadenas de estado en evidencias JSON (incluye la única regla `netlify-access-token`) | 2 | Valores 100 % `MAYÚSCULAS_CON_GUIONES_BAJOS` (enumeraciones de estado), sin formato de token | Ninguna |
| Fixtures de prueba de redacción y placeholders | 10 | Valores con patrones de placeholder, en tests del redactor; un JWT de prueba que decodifica a `{"v":1}` | Ninguna |
| **Credencial real** | **0** | — | — |

Siguiente paso, que necesita revisor: aprobar o rechazar una lista de excepciones **por huella individual** (no por ruta ni por regla) para que el gate pueda pasar sin suprimir hallazgos futuros. No se ha aplicado.

## 3. Imágenes vendor (Trivy 0.75.0, ya reportado)

| Imagen | Hallazgos | Exposición | Decisión |
|---|---|---|---|
| n8n 2.42.7 | 73 HIGH / 13 CRITICAL, 85/86 con fix | **No desplegado** en staging ni en producción | No desplegar. Proponer el pin a la versión más reciente **solo** tras pasar el escaneo Trivy en CI |
| postgres 16.15-alpine3.24 | 24 HIGH / 1 CRITICAL, todos en la stdlib Go de `gosu` | Solo recursos desechables de CI/local; `gosu` se usa al arrancar para bajar privilegios | Ya es la etiqueta más reciente: BLOCKER upstream. Decisión de riesgo del propietario y revisor |

## 4. Storage (#166 / migración 88)

Sigue siendo **propuesta, no aplicada**. El contenido de documentos sigue OFF. Su revisión independiente, el perfil 88 que preserva el 87 y los ensayos tras revocación siguen pendientes (ver `CLOUD_HANDOFF.md`).
