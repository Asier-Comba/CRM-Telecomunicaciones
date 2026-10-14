# Recuperación de oportunidades ante un recibo ilegible

Propietario: W2-X. CLAIM issue #67: 6163867180. Base: `3bd49ed45d039fcc8d31158cc7aff33d144b2d48`.

## Defecto reproducido

Al crear una oportunidad, el servidor HTTP controlado aplica una operación y devuelve HTTP 200 con JSON ilegible. La interfaz muestra el error, pero permite cerrar el panel, perdiendo la intención original. La regresión anterior a la corrección falla al comprobar que el panel sigue abierto después de pulsar Cerrar. Ese intento se conserva en `w2x-opportunity-invalid-original-repro.txt` en el checkpoint local; no se presenta como fallo de Auth/DB real.

## Cambio y límites

OpportunityEditor conserva el comando pendiente ante `internal_safe` o `transport_uncertain` mientras no exista un recibo validado. Mantiene el identificador y cuerpo originales y bloquea cierre y edición hasta confirmar el resultado. Un recibo válido elimina la incertidumbre antes de consultar la oportunidad guardada. Si esa consulta falla, el siguiente intento solo consulta y no repite la escritura. Una denegación explícita sigue permitiendo cerrar.

No se modifica el movimiento de tarjetas del pipeline, los contratos compartidos, el backend, permisos, RLS, fuentes W3/W4/W5 ni el recurso nativo. Las acciones de etapa y asignación comparten el ejecutor del editor, pero esta evidencia no las acepta individualmente.

## Evidencia propia

33 casos de navegador con repositorio real de frontend y HTTP controlado:

- 9 casos de crear, editar y archivar en 390/768/1440: JSON ilegible, identificador de recibo incorrecto o sobre de respuesta incompatible; dos envíos idénticos y un solo efecto en el simulador.
- 9 denegaciones explícitas 403: una solicitud, ningún efecto en el simulador y cierre habilitado.
- 15 regresiones existentes: pérdida de transporte y recuperación mediante consultas después de un recibo confirmado.

Capturas de creación en los tres tamaños inspeccionadas: botón de reintento visible, campos y cierre bloqueados; panel desplazado hasta la recuperación. Es evidencia visual parcial del estado de recuperación, no aceptación de la pantalla completa, de accesibilidad integral ni de Auth/DB.

El SHA publicado, hashes de logs, build y lint se fijan en el checkpoint y handoff de esta unidad. No se heredan pruebas de la base. Auth/DB real y modelo vivo: NOT_RUN. Matriz de aceptación sin promociones. Cinco HIGH pendientes; IA comercial writes OFF, issue #10 OPEN, revisión W4 y consumo principal pendientes, release NOT_ACCEPTED.

## Próxima integración

Entregar la fuente propia al propietario de la composición sin cambiar PR38/142. PR153 permanece en su fuente fallida preservada hasta disposición de los controles pendientes: REQUEST6162715998 (Supabase sin Safe) y REQUEST6162753210 (límite del navegador). No repetir aquellos intentos ni cambiar sus límites, permisos o aserciones.
