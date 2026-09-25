# W1 — Triage y saneamiento de Secret Scan

- Fecha: 2026-09-25
- Owner: W1
- Rama limpia: `w1/bootstrap-sanitized`
- Baseline: `w4/security-baseline@44375b0`
- Estado: saneado; validación reproducible final pendiente

## Resultado del triage

El scan del PR bootstrap anterior produjo nueve hallazgos `generic-api-key`. No
se ha añadido ninguna allowlist global.

| Clase | Cantidad | Localización | Resolución |
| --- | ---: | --- | --- |
| C — falso positivo legítimo | 7 | scripts n8n `inspect`, `patch`, `verify` y `drift` | La credencial ya procedía exclusivamente del entorno. Se renombró la variable local ambigua sin cambiar su origen ni su uso. |
| B — fixture/test dummy | 1 | `scripts/p65-action-e2e.mjs` | El marcador inválido se construye de forma determinista en runtime y conserva la prueba negativa. |
| B — fixture/eval dummy | 1 | `src/lib/agents/__evals__/assistant-turn-policy-strict.evals.ts` | El marcador de inyección se construye de forma determinista en runtime y conserva la semántica del eval. |
| A — credencial real o histórica | 0 | — | No se encontró ninguna credencial que requiera rotación. |

No se registran valores en este documento, logs o mensajes. Al no existir un
hallazgo de clase A, no hay acción humana de rotación o purga por credencial.

## Estrategia de historia limpia

1. Se preservó un safety ref únicamente local del bootstrap anterior.
2. Se creó una rama nueva desde la baseline W4, sin reescribir ni forzar la rama
   publicada.
3. El primer commit W1 contiene ya el snapshot saneado (`e7d5b43`).
4. Migración, resolver y contratos se reaplican como commits posteriores
   auditables.
5. El PR anterior solo se cerrará como superseded cuando la rama nueva pase CI y
   el checkout limpio reproducible.

La rama bootstrap anterior puede conservar objetos Git con falsos positivos y
fixtures dummy; no contiene una credencial real según este triage. La rama nueva
no hereda esos commits.

## Evidencia de validación

- Scan del árbol tracked saneado: **PASS**.
- Scan de historia completa del rango W1 nuevo: pendiente del HEAD definitivo.
- Gate desde clon limpio remoto: pendiente de publicación de la rama nueva.
