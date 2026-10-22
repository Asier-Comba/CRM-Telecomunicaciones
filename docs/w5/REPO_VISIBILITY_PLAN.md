# Plan PUBLIC → PRIVATE con coste 0 (W5, 22/10/2026)

Estado: **ANÁLISIS; no se ha cambiado la visibilidad.** Repositorio `Asier-Comba/CRM-Telecomunicaciones`: cuenta personal (GitHub Free), PUBLIC. Colaboradores: 1 admin y 3 con escritura. 0 forks, 0 webhooks, 13 workflows, sin protección de ramas. Secret scanning y push protection activados.

## Qué cambia al pasar a PRIVATE en GitHub Free (documentación oficial, 22/10)

| Pieza | PUBLIC hoy | PRIVATE en Free | Impacto |
|---|---|---|---|
| Minutos de Actions | Ilimitados en runners estándar | **2.000 min/mes y 500 MB de artefactos**; "If your account does not have a valid payment method on file, usage is blocked once you use up your quota" | Un push completo de la candidata consume **~91 min-job** (medido en `48e4c64e`). Hubo **402 ejecuciones del 15/10 al 22/10**. Al ritmo actual, la cuota se agotaría en pocos días y **CI quedaría bloqueada** hasta el mes siguiente |
| Environments (`staging` protegido con revisores y secretos) | Disponibles | "Users with GitHub Free plans can only configure environments for public repositories"; las reglas existentes se ignoran | El deploy controlado de #171 (secretos solo en el entorno protegido) **no sería configurable** |
| Secret scanning | Gratis en público | No disponible para repos privados de cuentas personales Free | **Regresión de seguridad**: se pierde la detección automática |
| Colaboradores | 4 | Ilimitados en Free | Sin impacto |
| Netlify | Deploy por CLI desde exportación exacta, sin integración Git | Igual | Sin impacto |
| Secretos de Actions (`OPENAI_API_KEY`) | Los workflows de forks no los reciben; cualquiera con escritura podría leerlos con un workflow nuevo | Igual para colaboradores con escritura | Sin cambio material |

## Conclusión

Con presupuesto 0 €, **pasar a PRIVATE hoy es contraproducente**: bloquearía CI en días y eliminaría los environments protegidos y el secret scanning, que son los controles que permiten desplegar con seguridad. **No se recomienda** sin un plan de pago (decisión del propietario), y W5 no lo propone.

## Mitigaciones a coste 0 mientras siga PUBLIC

1. **Ningún secreto ni dato personal en el repo**: historial clasificado con 28 hallazgos y 0 credenciales reales; push protection activo.
2. **Detalles explotables de defectos sin corregir** fuera de comentarios y documentos públicos (política ya aplicada en Storage P0).
3. **`OPENAI_API_KEY`**: no referenciado por ningún workflow. Opción del propietario: eliminarlo del repositorio hasta que exista una ruta medida con kill switch; volver a crearlo es inmediato.
4. **Revisar permisos de colaboradores** (3 con escritura): mínimo necesario y retirar cuentas inactivas. Decisión del propietario.
5. **Proteger la rama por defecto** (disponible gratis en repos públicos): sin force-push, sin borrado y con revisión antes de fusionar workflows. Requiere al propietario (admin).

## Si en el futuro se aprueba PRIVATE (pasos, no ejecutados)

1. Reducir el consumo de CI: workflows pesados solo en `workflow_dispatch` o en etiquetas de candidata, y cancelar ejecuciones redundantes.
2. Mover el deploy protegido a un mecanismo que no dependa de environments (p. ej. aprobación manual en el workflow y secreto de repositorio), con revisión W4.
3. Comprobar después de cambiar: Actions, colaboradores, deploy Netlify por CLI y vínculos de documentos.
4. Reversibilidad: volver a PUBLIC restaura los environments, pero no deshace que el contenido ya fue público.
