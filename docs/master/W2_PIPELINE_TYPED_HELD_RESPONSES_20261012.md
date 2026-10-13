# W2 — Fixture de Oportunidades: respuestas retenidas por operación

Root64 CI38248964771, preview114809976585:321 PASS/1 FAIL. Falló el control
desktop1440 pipeline-current-query en la línea83: esperaba una petición retenida
y recibió dos; timeout5000 sin cambio de controles. QA1247 y native85/320+ambos
ledger13 propios pasaron. No322 PASS ni preview producción acreditado.

El fixture conservaba un work.get anterior en la misma cola usada al iniciar los
controles de actor/rol. Podía contar esa petición anterior como la nueva y luego
responder con un DTO global.search a work.get. El orden de llegada permitía dos
peticiones dentro de esa cola. Se conserva la evidencia original; no se afirma
que sea una regresión del componente, cuyo blob protegido permanece intacto.

Se retiene el detalle anterior por identidad propia. Cada cambio de scope
espera exactamente una búsqueda nueva, valida operación/consulta y responde con
su DTO correcto; espera su respuesta exacta. El detalle antiguo se libera luego
por su identidad, con su DTO work.get, y debe seguir sin sustituir Gamma. La
limpieza incluye también ese detalle ante cualquier fallo intermedio.

No se amplían timeouts, admiten dos peticiones ni eliminan fases/comprobaciones:
actor, rol, empresa, error tardío, selección tardía, cliente/resultado actuales,
restricción de lectura, ausencia de comandos y overflow siguen comprobados.
La validación local repite dos veces las tres anchuras por el fallo dependiente
del orden de llegada. Nuevos controles completos propios requeridos al publicar.

Datos/transporte sintéticos, no Auth/DB/modelo ni aceptación W4/W5/release. IA
writes OFF, cincoHIGH conservados y release NOT_ACCEPTED.
