# Portabilidades y servicios: retirar el estado de otra referencia

`PortabilityDetail` y `ServiceDetail` retenían la ficha y propuestas anteriores
cuando cambiaba `id`. Sus editores estaban identificados por versiones; dos
recursos distintos con la misma versión compartían estado local. En el padre,
la portabilidad B podía conservar la fecha editada de A. En un servicio, B ya
mostraba su cabecera e instalación nuevas mientras el diálogo proponía el
cambio preparado para A.

Cada componente exportado delimita ahora un hijo por `id`. Cambiar referencia
retira la ficha, campos, propuestas e intentos antes de admitir la nueva
respuesta. Seleccionar la misma referencia conserva el borrador. La limpieza
existente rechaza respuestas tardías; contratos, CAS, permisos y operaciones
comerciales permanecen iguales.

## Reproducción y verificación local

Se usa React, los componentes, el repositorio y los validadores reales con
respuestas sintéticas cerradas para identidad, línea, servicio, contrato,
instalación y catálogos autorizados. No demuestra SQL, Auth o RLS.

- Servicio: reproducción del padre conserva la cabecera mientras B está
  pendiente. Portabilidad: la reproducción válida usa la máscara admitida
  `••••` más tres cifras, y también conserva la cabecera. Un primer intento
  usó una máscara no admitida: su fallo de DTO se conserva y no es evidencia
  de un fallo de producto.
- Dos controles adicionales continúan hasta admitir B: la portabilidad
  mantiene la fecha editada `2026-11-11`, y el servicio conserva el diálogo
  preparado para A incluso tras cargar la instalación B. Las fuentes y prueba
  se restauran con comprobación de todos sus bytes.
- Seis casos finales pasan a 390, 768 y 1440px: mismo id conserva borrador;
  id nuevo retira datos/editor/diálogo; B/C muestran valores propios con
  versiones iguales; respuesta tardía A no sustituye C; denegación D retira
  los datos anteriores; no se envía ningún comando ni aparecen errores de
  navegador o desbordamiento horizontal.
- Las respuestas de `operator.get` y colecciones relacionadas son admitidas
  por los validadores reales; las capturas esperan el operador cargado.
  Tipos estrictos ES2017 enfocados y lint pasan localmente.

Esta candidata reúne también la unidad incidencia/SIM 4e5, conservada como
ancestro local sin ejecución CI independiente. Sus seis casos se vuelven a
verificar con el operador cargado: doce casos nuevos en total, con expectativa
de 202 casos de navegador CI. Es una expectativa; los controles propios de
la nueva fuente están pendientes.

La fuente anterior 8d0 posee sus propios1140 funcionales/178 navegador/native85
migraciones320 funciones/Supabase107/Auth85/historial/grounding/teardown PASS.
B423 la compone con la cola actualizada y espera controles propios; no hereda
aceptación. B57 FAIL105/107 y D3ac FAIL100/107 permanecen conservados.
Root A885 sigue como última raíz con gates propios cerrados. IA negocio OFF;
full23, ausencia independiente, aceptación W4 y lanzamiento pendientes.
