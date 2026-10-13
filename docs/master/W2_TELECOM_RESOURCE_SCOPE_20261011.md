# Incidencias y SIM: una ficha pertenece a un solo registro

`CaseDetail` y `SimDetail` retenían la ficha y su estado local cuando cambiaba
`id` y la consulta nueva seguía pendiente. Además, `CaseEditor` se identificaba
solo por `version`: dos incidencias distintas con versión 1 podían compartir
el título de un borrador, aunque la cabecera ya mostrase la incidencia nueva.
La SIM conservaba su propuesta y diálogo de cancelación durante el cambio.

Los dos componentes exportados ahora delimitan un hijo por `id`. Se retiran
los datos, el editor, las propuestas e intentos anteriores al cambiar registro;
la limpieza de las consultas existentes sigue descartando respuestas tardías.
Volver a seleccionar la misma incidencia conserva su borrador. La autorización,
los contratos, las versiones y los comandos existentes no cambian.

## Evidencia acotada

La nueva prueba usa los componentes, repositorio y validadores reales con
respuestas HTTP sintéticas, sin afirmar aceptación SQL/Auth/RLS:

- Dos reproducciones válidas del padre 8d0 a 1440px fallan porque sigue visible
  la cabecera anterior durante la consulta del registro nuevo.
- Un control adicional del padre admite la respuesta nueva y confirma que el
  editor de la incidencia conserva `Draft of resource A` en vez del título B.
  Ambos registros tienen versión 1. El fichero y la prueba se restauran con
  comprobación de sus bytes después del control.
- Seis casos finales pasan a 390, 768 y 1440px: estado anterior retirado antes
  de recibir B, borrador conservado con el mismo id, editor B/C correcto con
  igual versión, diálogo de SIM retirado, respuesta tardía A descartada,
  denegación D sin ficha anterior, cero comandos y errores de navegador,
  sin desbordamiento horizontal.
- Tipos estrictos ES2017 enfocados y lint pasan localmente. El navegador CI
  deberá ejecutar 190 casos en esta candidata; es una expectativa pendiente.

La fuente publicada anterior 8d0 posee 1140 pruebas funcionales, navegador178,
lint/tipos/build66 y PostgreSQL85 migraciones/320 funciones incluyendo SIGKILL
normal postcommit y recuperación completa con14 auditorías originales PASS.
Su Supabase38139035261 está pendiente al preparar este cambio. Esta unidad no
hereda esos resultados y no cancela la ejecución anterior para publicarse.
B57 FAIL105/107 y D3ac FAIL100/107 siguen conservados. La causa del bloqueo de
cartera antes del efecto de acceso sigue sin demostrarse.

Raíz A885 conserva sus gates funcionales propios cerrados. IA negocio OFF;
full23, ausencia independiente, seguridad W4 y lanzamiento pendientes.

Actualización de composición: 4e5 se conserva como ancestro local sin gates
independientes. La candidata conjunta añade portabilidad/servicio, valida los
operadores mediante `operator.get` y vuelve a pasar estos seis casos; la
expectativa conjunta es202 navegador, pendiente de ejecución propia.
8d0 cerró su propio Supabase107 PASS antes de preparar la publicación conjunta.
