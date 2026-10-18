# Propuesta local: no absorber decimales con el atajo IVA0

CLAIM6252053457. Base `24a7b0da7d7d5dfd822cf2e07981ce2659b93d7f`; rama propia `codex/w2x-billing-proposal-zero-tax-20261018`.

Original: **dos fallos y un caso correcto en31,8s**. El atajo IVA0 consumía el prefijo de «IVA0,5%» y «IVA0,123%», devolviendo cero; el cero exacto pasa. Se conserva log/exit1. Solo se limita esa frontera para no admitir otro dígito ni separador decimal después del cero. Decimales pasan a la extracción62 y la precisión excesiva llega a la validación existente. La reversión de una sola expresión devuelve exactamente el padre; resto de parser, IVA incluido/sinIVA, descuentos, cálculo/contrato/normalizador/editor/repositorio intactos.

Controles propios: **144/144 navegador en2,4min y24/24 funcionales en765,2553ms**. Dieciocho nuevos: decimal coma/punto0,5, cero exacto, sinIVA, precisión0,123 y sufijo0,5%deIVA, en390/768/1440. Los positivos muestran porcentaje y total exactos100,50/100,00; revisión desmarcada y Guardar disabled. El inválido no envía invoice.propose ni abre editor; error seguro. Banco nuevo sin guardado/emisión;126regresiones de porcentajes IVA/IRPF y descuento. Sin herencia de PASS. Build66, lint/scan/diff/cola/publicación propios se registran en checkpoint.

## Capturas realmente vistas

- zero-tax-precision-390.png — SHA256 5637f29f1ef0f56c7d5c8a4b67932019e937a8afb6a785657b61519bf94ed4d6
- zero-tax-comma-390.png — SHA256 24ea57192f98381d1f6d5aada93b199baee9843bddba948a0f21ad33986968fc
- zero-tax-zero-1440.png — SHA256 7f9f057d5ddb21220d92442540f610752ab248bd28c915eecab59cdf44190fad
- zero-tax-comma-768.png — SHA256 b23165ccbae13dfe89a594a756aa89fea7151c771ad3fd37b73ce950281e7fe0
- zero-tax-comma-1440.png — SHA256 7c91bde7a92850b2e19e5b7a3d1a7e65984283ab38f1bd6108c89a133a5bd9aa
- zero-tax-precision-1440.png — SHA256 72bcc1588bc57103393b64c1b7f05ba6daab0815a1d1148646b1290ffba1005c

Seis capturas:0,5% con coma en390/768/1440, cero exacto1440 y rechazo de precisión390/1440. Los positivos muestran conceptos/cantidades/porcentajes, totales, revisión desmarcada y Guardar deshabilitado. Cliente/fiscal/fechas superiores quedan fuera. Los negativos muestran error seguro y ausencia de editor; en móvil se recorta la zona inferior de la propuesta. Fixture excluido. Sin aceptación del editor completo, accesibilidad completa, fiscalidad ni seguridad independiente.

HTTP/DTO sintético, componentes/repositorio/parsers reales. AuthDB/JWT/RLS/Next integrado/modelo vivo NOT_RUN/API0. Global1575 fuente57 separado y sin58/61/62/63. Matriz342/27PARTIAL/315sinreconciliar/0READY; cincoHIGH/W4 pendientes, IA writesOFF, issue10OPEN, releaseNOT_ACCEPTED. F736/B9/981/1266 y fallos históricos de fixture/preparación preservados. Los fallos propios posteriores también se vinculan a sus fuentes originales sin cambiar sus resultados anteriores. Fuentes ajenas/W3/W4/W5/recurso nativo intactos. Próxima verificación comercial: propuesta con descuento100%, revisión manual y guardado/lectura de borrador con total cero; no se da por aceptada antes de ejecutarla.
