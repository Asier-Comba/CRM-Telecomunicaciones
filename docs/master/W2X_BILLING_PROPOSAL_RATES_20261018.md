# Propuesta local: porcentajes completos de IVA e IRPF

CLAIM6251956555. Base `b193330f61fa097cb0bb73b1328c81fc01bd91ba`; rama propia `codex/w2x-billing-proposal-rates-20261018`.

La reproducción original termina con seis fallos y dos casos correctos en1,5min. En IVA e IRPF se truncan100%,10,5% y101% a10%; los dos controles ordinarios10% pasan. Se conserva log/exit1; no se envía comando de guardado ni emisión.

Solo cambia la extracción numérica de `parseTax` y `parseWithholding`: consume el porcentaje completo con signo y decimales coma/punto, sin interpretar un sufijo parcial. El normalizador y contrato existentes mantienen sus límites y precisión antes del envío. Permanecen idénticos IVA incluido/sinIVA, descuento61, fechas, importes y demás parser, editor, cálculo, contrato y repositorio. Revertir únicamente esas dos funciones devuelve exactamente el padre. No se añaden mecanismos de autoridad o aceptación tributaria.

Controles propios: **225/225 de navegador en4.0m y24/24 funcionales**. El banco nuevo tiene84casos: IVA/IRPF, prefijo/sufijo,100/10coma5/10punto5/10/101/-1/10coma123 y390/768/1440. Positivos verifican porcentaje completo, cantidad1/precio100/descuento0 y total exacto; revisión desmarcada y Guardar deshabilitado. Inválidos no envían invoice.propose ni abren editor y muestran el error seguro. Nuevo banco sin comandos. Las141regresiones incluyen descuentos61, previsión exacta, recibos, lectura registrada, contexto, fecha y revisión manual. Los24funcionales ejercitan parser/modelos y fechas reales con stubs locales. Build66, lint, scan, diff, cola y publicación propios quedan en checkpoint. Ningún PASS se hereda de otra fuente.

## Capturas realmente vistas

- rates-tax-prefix-comma-390.png — SHA256 479f0e9fad423cefb4eaf3073718f7e246ad67b72066057b10c6702667924444
- rates-withholding-prefix-comma-768.png — SHA256 66598a943c1a5caed5093cd625e34baffe37ea287d7061e7edfbbf8f2ea3f61d
- rates-withholding-prefix-comma-1440.png — SHA256 1f15541c4c9526c2149ba008a12f32751d5ad117c3d36114a0809b2c66a98d42
- rates-tax-prefix-over-1440.png — SHA256 d88677cdd12e756c23eee625a45ca1cef56dae5692a94d5292f38bd52cb5f3ce
- rates-tax-prefix-comma-1440.png — SHA256 4e0c6faa88a172b764216557137aadcabd69cf502d2304fd7ab23e168b99d8b9
- rates-tax-prefix-comma-768.png — SHA256 589e0c6100c864a240a6c444c5c5b8d088dd6a7ccda5f5a694ab880205b1f963
- rates-withholding-prefix-comma-390.png — SHA256 7e29d26de929539b54dd5bf5d8aa7a906eb55540d59819571316076e1ca110e7

Se han visto siete capturas: IVA e IRPF10,5% en390/768/1440 y rechazo IVA101% en1440. En los seis positivos se ven conceptos, porcentajes, base/IVA/IRPF/total y revisión desmarcada en los tres anchos. Guardar deshabilitado es visible salvo en IVA390, donde queda debajo; en otros casos se ven algunas acciones inferiores, sin aceptar todo el tramo. Cliente, identidad fiscal y fechas superiores quedan fuera. El inválido muestra error seguro sin editor. No se acepta el editor completo. Contexto y navegación del fixture excluidos. La ausencia de solicitudes se mide en registros HTTP, no en imágenes.

HTTP/DTO sintético; componentes/repositorio/parsers reales. AuthDB/JWT/RLS/Next integrado/modelo vivo NOT_RUN/API0. Matriz342/27PARTIAL/315sinreconciliar/0READY; cincoHIGH y W4 pendientes; IA writesOFF, issue10OPEN, releaseNOT_ACCEPTED. El global1575 de fuente57 permanece separado y no contiene estas correcciones. F736/B9/981/1266 y fallos de fixture/preparación preservados. Fuentes ajenas/W3/W4/W5/recurso nativo intactos. El atajo existente IVA0 permanece idéntico; su frontera decimal inferior todavía exige reproducción independiente, sin resultado inventado.
