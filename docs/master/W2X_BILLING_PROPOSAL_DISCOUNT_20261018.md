# Propuesta local: conservar el porcentaje completo de descuento

CLAIM6251873167. Base `8a3fc1cd0996dfb041299db07ac36f40ca3154a6`; rama propia `codex/w2x-billing-proposal-discount-20261018`.

Reproducción original: **tres fallos y un caso correcto en40,8s**. El texto100% se convertía en10%,10,5% en10% y101% en10%. El caso ordinario10% pasa. Se conserva log/exit1. No se envía comando de guardado en este banco; se reproduce la propuesta local y su solicitud de validación, no una escritura SQL ni emisión.

Solo cambia `parseDiscount`: consume el número completo con signo y decimales de coma/punto, sin extraer un sufijo parcial en la forma «porcentaje de descuento». El retorno conserva el valor numérico completo. Los límites y la precisión los siguen rechazando el normalizador y contrato existentes antes del envío. Se conserva todo el código restante de parser, incluidos IVA/IRPF, importes y fechas, así como editor/cálculo/contrato/repositorio. La guardia de reversión de esa única función devuelve exactamente el padre.

Controles propios: **141/141 de navegador en2,7min y24/24 funcionales en724,0069ms**. El banco nuevo tiene42casos: prefijo/sufijo;100%,10,5%,10.5%,10%,101%,-1%,10,123%;390/768/1440. Los positivos conservan precio100, cantidad1 e IVA21; verifican descuento exacto y totales0/108,30/108,90. La revisión permanece desmarcada y Guardar deshabilitado. Los tres inválidos por cada forma/ancho no envían invoice.propose ni abren editor; muestran el error seguro existente. Ninguno envía comando de guardado o emisión. Las99regresiones cubren recibos, lectura registrada, previsión exacta, contexto, fecha actual y revisión manual. Los24funcionales ejercitan parser/modelos y sus fechas reales, sin servicios vivos. Build66, lint/scan/diff/cola/publicación se registran en checkpoint sin herencia de otroSHA.

## Capturas realmente vistas

- discount-prefix-hundred-1440.png — SHA256 5e479caf25cbb0ea3cf781a36dba98ecf3982b5f5df604f50815027c42c4015f
- discount-suffix-comma-390.png — SHA256 af5074d8baa152bc2f884968d004e39e626b2ea27a2bb0ccbf78930364d0fa28
- discount-suffix-comma-1440.png — SHA256 ebd8cfaaf9a929d9482122eea984cde11695114c1dc7107d4801e272332fec3e
- discount-suffix-comma-768.png — SHA256 8065ca666ea8b38d68ad43471f0aaea7a2eb21fd55079081f32477abad6ce87a
- discount-prefix-hundred-768.png — SHA256 4c0bd8b024aaef4a83db0073e7eb67501626f2f0992ab287de3a0769d238a7ef
- discount-prefix-over-1440.png — SHA256 f2b4ff9d092137f2d29ccf6b5fc764ad9de0f1f6942fd3c5b6085eca89b560be
- discount-prefix-hundred-390.png — SHA256 2e7f2d0ef79b81f567076a78cefe90d69f5ff52645e97fc664b84bf8c4a9b362

Siete capturas:100% en prefijo y10,5% en sufijo,390/768/1440;101% inválido en1440. En móvil se ven porcentajes, totales0/108,30 y revisión desmarcada; las acciones inferiores quedan fuera. En768/1440 se ven cliente/fechas/vínculos/concepto y descuento al borde inferior, sin totales/acciones en pantalla. El inválido muestra error seguro y formulario de propuesta, sin editor. Fondo y navegación del fixture excluidos. No se acepta el editor completo, accesibilidad completa ni fiscalidad/seguridad real.

HTTP/DTO sintético, componentes/repositorio/parsers reales. AuthDB/JWT/RLS/Next integrado/modelo vivo NOT_RUN/API0. Los valores porcentuales prueban representación y validación de contrato, no asesoramiento ni aceptación tributaria. El resto de extracción de IVA/IRPF no se modifica ni se da por aceptado aquí; próxima reproducción independiente. Global1575fuente57 activo una vez y sin las correcciones58/61. Matriz342/27PARTIAL/315sinreconciliar/0READY; cincoHIGH/W4 pendientes, IA writesOFF, issue10OPEN, releaseNOT_ACCEPTED. F736/B9/981/1266 y fallos de fixture/preparación preservados. Fuentes ajenas/W3/W4/W5/recurso nativo intactos.
