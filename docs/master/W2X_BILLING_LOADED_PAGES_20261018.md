# Facturas cargadas: páginas y filtros con recuperación

CLAIM6252963108 y ampliación técnica conservada en checkpoint. Padre `d6cca70f59307c69f0a8d88d4497d1cba25af55c`;rama propia `codex/w2x-billing-loaded-pages-20261018`.

Producto y pruebas previas intactos. Nuevo banco de18casos:avance/retroceso/estado/cliente/recarga/denegación con recuperación×390,768,1440. Primera página de50facturas sintéticas conIDs ascendentes11..60 ycursor60;segundaID61/número12. Filas diferenciadas para filtro de estado yclienteB. Se usan componentes/repositorio/parser reales conHTTP controlado;el propio parseBillingReadV1 valida positivamente cada DTO de página antes de entregarlo.

Primer intento **18FAIL**,sin producto defectuoso acreditado:fixture ofrecía next_id conuna sola fila ylimit50. El parser exige página completa ycursorigualúltimoID;rechaza el DTO inicial antes de cualquier navegación. Logs/exit1/contextos/testoriginal se conservan. Corrección únicamente de datos sintéticos:50filas,IDs/cursor ascendentes ypositivo deparser añadido. Validador,límites,aserciones de comportamiento yproducto sin cambios. Se repiten solo los18fallidos;resultado nuevo separado **18/18PASS en29,4s**,sin sumar intentos. No repetir funcionales49 ya verdes sin cambio deproducto.

El banco comprueba que al pedir otra página las filas anteriores desaparecen y ambos botones de paginación quedan bloqueados durante la respuesta retenida. Página2 muestra factura12 yAnterior disponible;retroceso devuelve página1. Cambiar estado/cliente orecargar quitaafter_id,vuelve apágina1 yretira fila2. Un403 no muestra ni filas antiguas niconclusión falsa delista vacía;Actualizar recupera página1 ylimpia ese error. Invoice.list siemprelimit50 yclienteA/B explícito;resumen financiero conserva alcance delespacio. Dos lecturas de lista para avance ytres para cadaotrorecorrido;solo una conafter_id. Sin comandos,invoice.get,propuesta oemisión nuevos. No se certifica aislamiento real por verificar inputs sintéticos.

Build/lint/scan/diff/cola/bundle propios encheckpoint;no PASS global heredado. La regresión1806fuente69 única18288 sigue separada,sineste banco18;checkout14congelado. No se abreotraPR niseavanzaHEAD dePR38/142/153.

## Capturas realmente vistas

- loaded-pages-customer-1440.png — SHA256 f76d77a1cf54f0a52da184a723312061e36e015f96a318a18bfba5aac2a49c6a
- loaded-pages-denied-1440.png — SHA256 39d11297ac345e9be56d7921daecd65864e82b04250239474b4ea262acb33b7f
- loaded-pages-denied-390.png — SHA256 c00527a23cfd8f9fa758e91d5fe9115517cd9d1061c394caaa0705e8389f5540
- loaded-pages-denied-768.png — SHA256 bfa6c5a67b346210cef2fa7d8a5dc1d833416575335c7fd50ed38b5e06ee5c72
- loaded-pages-next-1440.png — SHA256 b705e31c04466acec9f9faefeded6c79958ab903ad94e67e1edb30c81c7427c7
- loaded-pages-next-390.png — SHA256 3777d576de172aa1b38172b032800d9f7ec472202dfc1897bdfa9e5e0c556084
- loaded-pages-next-768.png — SHA256 39bfc2ab6385ac63e23f6231d281538793350cdf74669c45f6cf0db9bc837fab
- loaded-pages-status-1440.png — SHA256 9f185d96adbfaa77c2843a7401588400c1bf0a2ba57ec42a46ece727def66116

Eight frames:next/denied-recovered3907681440,status/customer1440. Next invoice12,issued,due2026-10-25,total30.25EUR/actions readable. Pagination2/previousenabled/nextdisabled visible7681440,but below mobile viewport. Statusissued invoice13/page1 and customerB invoice14/page1 visible1440;B label clipped in closed narrowselect so full identity is DOM evidence. Denied screenshots AFTER recovery show first50-row page top,not error pixels or pagination;negative403 measured HTTP/DOM only. Mobile stackedcards and desktoptable readable;50row remainder andupperheader outside recovered viewport. Fixture banner excluded;partial visual,no wholemodule/accessibility/security acceptance.

AuthDB/JWT/RLS/SQL/Nextintegrado/modelovivoNOT_RUN/API0. Primera página completa esfixture,norecursoSQL real;los50IDs noacreditan ausencia,autoridad oaceptaciónfinanciera. Faltan filas/datosrealesautorizados,otrosestados/periodos/divisas/roles,accesibilidad yW4. Matriz342/29PARTIAL/313sinreconciliar/0READY sinpromoción. HIGH5/W4pendientes,IAwritesOFF,issue10OPEN,releaseNOT_ACCEPTED. F736/B9/981/1266 yfixtures/preparación conservados,sinatribuirlesesta causa. Fuentesajenas/W3/W4/W5/recursonativo intactos. Continuar defecto comercial reproducido oaceptación individual respaldada,sinactividadartificial.
