# Unidad 45 — conservar incertidumbre de alta tras recarga

Producto propio desde `f9aa469bec768ad73572a2f462f1f1505e6791a5`.
Commit de producto `75d393ed7b37b98ff64660b4d74eb0e1d67ff6cf`,
tree `6dc2fe35ffda5d3f6eb76a7689d77002a681a20f`.
[CLAIM de archivos propios](https://github.com/Asier-Comba/CRM-Telecomunicaciones/issues/67#issuecomment-6346135587).
#175 permanece congelada; esta corrección no está adoptada.

## Defecto y cambio

En f9aa, un POST de onboarding sin recibo bloqueaba otro envío mientras seguía
montada la página. Recargar borraba ese bloqueo: si la lectura de membresía aún
no confirmaba acceso, reaparecía el formulario. Dos pruebas causales fallaron
antes del cambio: pérdida de respuesta seguida de recarga y almacenamiento no
disponible antes del envío.

La misma página persiste un marcador mínimo por usuario y origen antes de enviar.
No guarda nombre de empresa, credenciales ni recibos. Una recarga con marcador
permite únicamente comprobar acceso mediante las lecturas existentes de sesión,
membresía activa y workspace activo. Un fallo de lectura no libera el bloqueo.
El marcador se elimina ante esa membresía confirmada o una denegación explícita
con código/status del handler actual. Un recibo 200/201 por sí solo no lo elimina.
Si el navegador no puede guardar y releer el marcador, no se envía el POST.
Un guard síncrono impide dos envíos durante la misma instancia.

## Aceptación propia

- 2 FAIL causales sobre f9aa conservados; no contabilizados como PASS.
- 16 casos nuevos PASS (12 + 4 distintos), 58 regresiones existentes PASS.
- 390/768/1440, teclado, cambio de usuario, relectura denegada, interrupción antes
  del recibo, recarga, almacenamiento que lanza error o descarta la escritura,
  recibo válido y denegación no reconocida. Sin retries ni skips.
- Lint de archivos modificados, tipos y build Next por defecto 44/44 PASS.
- Tres capturas de recuperación tras recarga inspeccionadas a las tres anchuras.
- Primera invocación local no pudo resolver Playwright desde la configuración
  externa; configuración corregida antes de recoger los dos fallos causales.

Componente real; SDK, HTTP y navegación controlados. No es aceptación Auth/DB ni
persistencia de empresa real. Los reportes originales, hashes de archivos/casos
y capturas están registrados en
[evidencia segura](evidence/20261022-onboarding45/acceptance.safe.json).

## Límites y coordinación

Es una barrera conservadora del navegador. Borrar almacenamiento, cambiar de
dispositivo/origen y la concurrencia de pestañas requieren garantías del servidor;
no se afirma idempotencia global, rollback o recuperación autenticada completa.
No cambia backend, RPC, SQL, AuthGate, recibos ni roles. #183 sigue pendiente de
W1/W4; #182 sigue pendiente de W4/W5. Esta unidad no adopta ambas propuestas.

Diagnóstico 44 confirmado en la anotación del
[job físico original](https://github.com/Asier-Comba/CRM-Telecomunicaciones/actions/runs/39765853702/job/119780986564):
excedió el máximo de 35 minutos; no encontró el archivo de resumen seguro.
Sólo 110 checks UI completados están acreditados; backend total y teardown no
verificados. No se hereda el PASS de otra fuente. W5 ha recibido tiempos y la
solicitud de ACK para conservar progreso seguro y diagnosticar preparación,
sin ampliar tiempos arbitrariamente ni quitar checks. Archivos compartidos intactos.
Se detectó un segundo intento ajeno sobre f9aa; este Work no lo lanzó ni lo cancela.

0 EUR, IA negocio OFF, Issue10 abierta, Storage88 sin autorización en staging,
ningún deploy. RELEASE_NOT_ACCEPTED.

## Siguiente trabajo asignado

W5: cerrar intento físico exacto con evidencia final y teardown; revisar mecanismo
de evidencia ante interrupción. W4/W5: decidir #182. W1/W4: decidir #183 y recuperación
servidor. Integrador: revisar esta barrera de consumo sin confundirla con la
recuperación completa; integrar únicamente lo aprobado y ejecutar la nueva fuente.
