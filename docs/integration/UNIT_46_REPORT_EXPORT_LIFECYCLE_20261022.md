# Unidad 46 — exportación ligada al periodo y contexto activos

Base explícita `f9aa469bec768ad73572a2f462f1f1505e6791a5`.
Producto `f45d089327b9bf2feb91eed29d46e0d69b51bfa0`,
tree `9d0cd52a8efa4713a8a0634544f2fcdb8dc7cd4f`.
[CLAIM46](https://github.com/Asier-Comba/CRM-Telecomunicaciones/issues/67#issuecomment-6346426172).
No mueve #175 ni #184 y no adopta #182/#183. Es una corrección independiente
del informe existente, pendiente de revisión e integración selectiva.

## Defectos causales

Mientras exportaba mediante una lectura fresca de permisos, el periodo seguía
editable aunque ámbito y actualización estuvieran bloqueados. Además, al cambiar
empresa, usuario o rol, el proveedor desmontaba el informe pero la promesa de la
exportación anterior aún podía crear y descargar un CSV. Dos pruebas fallaron en
f9aa: selector habilitado y descarga efectivamente iniciada después de cambiar
empresa. Se conservan ambos fallos originales.

## Corrección mínima

El selector existente se deshabilita con un fieldset durante la lectura, sin tocar
el control compartido. La limpieza del componente invalida las exportaciones de
su instancia/proveedor. Una respuesta tardía no genera Blob, descarga, error ni
actualización de estado en el informe nuevo. Se conserva la lectura autorizada
fresca y su parser real; no se exporta el snapshot previo. La denegación no
descarga datos y el reintento explícito hace una nueva lectura.

## Evidencia propia

13 casos nuevos y la regresión previa del proveedor: 14/14 PASS, retries0/skips0.
Tres anchuras 390/768/1440; cambios de empresa/usuario/rol, bloqueo de controles,
CSV real descargado con valores frescos y ámbito/periodo/nombre correctos,
denegación y recuperación explícita. Tres capturas inspeccionadas. Lint de los
archivos modificados, tipos y build por defecto 44/44 PASS.

Se reutiliza el fixture de ProductProvider con una opción `#reports`; la prueba
anterior conserva su rama de montaje y pasa. ProductProvider, informe, repositorio
y parser DTO reales; HTTP controlado. No es una prueba física de Auth/RLS,
aislamiento DB, persistencia comercial ni despliegue. No se ejecutan escrituras.
Casos y hashes en [evidencia segura](evidence/20261022-reports46/acceptance.safe.json).

## Handoff

Revisión independiente de consumo y posterior integración sólo con ACK; la nueva
composición necesitará regresión propia. La propuesta no toca BillingAnalytics,
editor de Oier, API, SQL, contratos, permisos, plataforma o recursos físicos.
W5 mantiene el recurso Supabase activo sobre f9aa y la titularidad del diagnóstico
de tiempo/evidencia; W1/W4 deciden #183 y W4/W5 #182. No se ha modificado su alcance
ni se ha repetido ningún efecto incierto.

0 EUR, sin modelo live, IA negocio OFF, Issue10 abierta, Storage88 no autorizado
en staging y RELEASE_NOT_ACCEPTED.
