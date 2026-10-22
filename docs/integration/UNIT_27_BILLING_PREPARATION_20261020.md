# Unidad27 — conservar el contexto de preparación de factura

Base congelada PR156: `a9e977adf90b1e83cded23fb54aefc696839d014`,
árbol `ac48598bffd8a528919f63f2bcad1d07365c775d`. Rama sucesora exclusiva:
`codex/demo-billing-preparation-20261020`. No modifica la candidata congelada.

En «Nueva factura», la consulta de cliente/configuración dejaba seleccionar otra
empresa o cerrar el panel. La respuesta tardía abría el editor con la empresa
anterior. Chromium390 sobre la base, antes01, reproduce el cierre con Escape;
su captura muestra «Revisar borrador» reabierto al liberar la lectura en limpieza.

Cambio mínimo: cierre y selección deshabilitados durante la consulta, comprobación
de estado antes de iniciarla y aviso de carga persistente. Una denegación conserva
la selección y permite volver a consultar. No envía comandos, guarda ni emite.
El transporte, contratos, permisos, SQL y gestión de recibos no cambian.

Controles reales del componente/repositorio/parsers con HTTP sintético:
antes01 **1 FAIL** causal; después01 **12 PASS**, sin omisiones/reintentos/flaky,
390/768/1440, preparación con éxito/denegación/recuperación y seis regresiones
existentes de selección de factura. Cero comandos y errores JavaScript en los
seis casos nuevos. Capturas móvil antes/después revisadas.

El primer build local falló por el junction externo de node_modules, rechazado
por Turbopack; no es una regresión de producto. Se materializaron dependencias
propias de igual versión antes de repetir build. Lint dirigido, TypeScript
independiente y build por defecto con tipos/44 páginas PASS en esta fuente.
El SHA publicado se identifica en la entrega de issue67; no heredar los de a9e.

Solicitud de deploy exacta y coordinación Oier:
https://github.com/Asier-Comba/CRM-Telecomunicaciones/issues/67#issuecomment-6295194533

CODE_READY/LOCAL_TESTED limitados a este comportamiento; prueba hospedada
NOT_VERIFIED. El banco cloud/Oier y su feedback de Cartera permanecen propios.
Voz real NOT_VERIFIED; contenido privado afectado e IA writes OFF;
cinco HIGH, W4, plataforma y aceptación cloud conservan sus gates.
