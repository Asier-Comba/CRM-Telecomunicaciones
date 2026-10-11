# W2 — Día actual de agenda en Europe/Madrid

## Problema y cambio

El calendario presenta las reuniones y los plazos en Europe/Madrid, pero obtenía
su día inicial recortando un instante UTC. A las 00:30 del lunes 5 de octubre
de 2026 en Madrid (`2026-10-04T22:30:00Z`) seleccionaba el domingo 4 y su semana.
La reproducción anterior utiliza los componentes reales Calendar/ProductProvider
con React SSR sobre d22dac57c1f3357433565c4d38210879b0958f4a.

Calendar y el ancla inicial de IntegratedCalendar utilizan ahora `calendarDate`,
el conversor existente del dominio. Los instantes siguen Europe/Madrid y las
fechas civiles mantienen su día literal. La corrección también se aplica a Hoy,
que utiliza el mismo valor `today` del componente. Los cambios son exclusivamente
la normalización de esas dos fechas y su importación.

## Validación y límites

Siete regresiones renderizan los componentes e importaciones reales mediante
React SSR: antes/después de la medianoche de Madrid, cambio de mes en verano,
cambio de año en invierno, día bisiesto, fecha civil y calendario integrado con
reloj controlado y restaurado. Comprueban una sola selección y rechazan la fecha
incorrecta. El proveedor es sintético y los efectos React no se ejecutan en SSR;
estas pruebas no acreditan navegador, consulta API inicial ni base de datos.

La unidad parte de 3215f36c15046585b31f9ddb981fd3bd9a816fb4, separada de la
composición aún no aceptada. Requiere sus propias revisiones completas, incluida
la aceptación Supabase y la revisión visual, antes de su consumo en la composición.
La revisión React conserva el orden de hooks, los límites existentes, las etiquetas
accesibles y el estado de carga; no introduce efectos, dependencias ni estado global
de producto. No hay cambios en comandos, permisos, persistencia o escritura de IA.
