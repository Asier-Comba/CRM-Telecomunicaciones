# W2-X · PDF fiscal privado después de navegar · 15/10/2026

CLAIM6180781959, basea2922568fe584e0dfec0930ef4e226505e53ccfa, rama codex/w2x-private-pdf-download-lifetime-20261015.

## Defecto confirmado

Descargar el PDF privado de factura A, navegar B y recibir el binario pendiente disparaba una descarga de A. Reproducción original:0 descargas esperadas,1 observada Factura_fiscal_privada.pdf. El componente real y su repositorio/parser trabajan sobre HTTP controlado. No se atribuye fuga de autorización del servidor.

PrivateInvoicePdf retira su referencia de montaje en cleanup y comprueba montaje antes de crear URL/blob y pulsar el enlace. Una respuesta tardía denegada tampoco publica error ni finalización en una vista retirada. Conserva descarga activa, validaciones de tipo/tamaño/firma PDF del repositorio, permisos y comandos de conservación sin cambios. No cancela la petición enviada ni modifica almacenamiento, renderer o W5. El padre ya remonta por invoice.id. Cambios de versión de la misma instancia quedan fuera de esta aceptación.

## Controles propios

15 HTTP controlado PASS19.3s:12 nuevos ×390/768/1440 (respuesta/denegación tras navegar y descarga/denegación activas) más3 regresiones de lectura tras emisión. Una petición binaria por caso, cero comandos de conservación; el positivo descarga una vez y el retirado cero.6 pruebas de componente existentes PASS después del cambio, incluyendo referencia/repository/denegación y mismo comando ante incertidumbre. Lint y build66 PASS. Tres capturas propias retiradas inspeccionadas: nueva factura y panel operativo, sin alerta obsoleta ni desbordamiento visible. Visual parcial, no aceptación íntegra de Facturación.

Un primer intento de editar usó ruta relativa de coordinador desde checkout: FileNotFound antes de modificar.6 pruebas ejecutadas entonces sobre fuente original conservadas por separado, no heredadas. Se corrigió la ruta, editó y repitió6 sobre fuente corregida. El fallo causal de descarga original permanece separado.

Binario PDF y totales de factura son sintéticos. No es renderizado fiscal real, Storage, persistencia, Auth/DB ni evaluación de modelo. ModeloNOT_RUN/API0. No hereda653 de a292. La evidencia anterior conserva primer intento640/13 por cwd y complementario13PASS del mismoSHA; no se convierte en suite única verde ni se atribuye a esta fuente.

Sin cambios de matriz ni ramas38/142/153/W3/W4/W5. PR153 conserva7F fallida. HIGH5/F736/B9/3c7 originales intactos; W4/ACK principal pendientes; IA writesOFF, issue10OPEN, releaseNOT_ACCEPTED.

Siguiente investigación: descarga PDF autorizado general en IntegratedBilling al cambiar de factura; requiere CLAIM y reproducción propios.
