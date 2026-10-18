# Cierre visual alineado con resultado pendiente de borrador

CLAIM6251143949;base45738ab9e830c9c65150231fa691778d3c08aa52;rama propia codex/w2x-billing-draft-close-20261018.

Original2FAIL(create/update1440):Xhabilitada después de recibo incierto aunque handler existente impedía cerrar. Ahora InvoiceEditor admite closeDisabled opcional false ylo pasa aDrawer existente;IntegratedBilling pasa blocked,que incluye busy/registrado/incierto. No se usa locked,pues también incluye conflicto con cierre legítimo. Sin nuevoestado/efecto/request,comandos/recibos/pendientes/CAS/handler originales idénticos al revertir prop. PrimitivaDrawer sin cambios. Escape yclickfuera siguen controlados porprimtiva existente yhandler conserva defensa.

Controles propios60:18crear/actualizar borrador+42recibos de otras7acciones. Negativo inciertoXdisabled/camposbloqueados,Escape no descarta,intención exacta enreintento;403 mantiene edición ycierre. Positivos guardan/readback estrictos conHTTP controlado. No persistenciaSQL/Auth ni duplicadosDB acreditados. Resultados terminales propios de browser/lint/build66/scan/cola/diff/bundle encheckpoint externo,sin herencia de18/1416.

Revisión react-best-practices aplicada aalcance:propbooleana derivada existente,no estados duplicados/efectos/nuevasdependencias;disablednativo delbotón conetiqueta existente,no nueva primitiva niopción visual divergente dehandler. Defaultfalse conserva consumidorespreview. No auditoría integral React oaccesibilidad.

## Capturas realmente vistas

- draft-receipt-update-invalid-390.png SHA256 83376f5d2e1c00cf1d968359bef6a89c69241d4eab7ec938d01673860f754b27
- draft-receipt-create-denied-390.png SHA256 f5eac5e224ab6f251c2ad53f63a8033d3ec63afb736974dde0f273850dc53408
- draft-receipt-create-invalid-390.png SHA256 a09f495767abbdcd7ac7881662a2ea85b36307653467b299855a277e52df5fbd
- draft-receipt-create-invalid-1440.png SHA256 cbb6d692f3cffe023e101c52125e0541718380551cd5b21f91f43ca8128b9d04
- draft-receipt-update-denied-1440.png SHA256 bbf243debe697934e77bd7b7e90a49309f4e1175df787b32684b84f0475ce94e
- draft-receipt-create-invalid-768.png SHA256 75d32db2e51359a78d6f98ddcc226a6ddbe7b1d0dde2bd5186f4329da7c7aedb
- draft-receipt-update-invalid-1440.png SHA256 3cd8aafdfa4ddcb15f2a74dec2dbc8a6871217ac5cd30f61601e2c4b5ee53d6d

Inciertosuperior:Xgris deshabilitada,reintento activo ycampos bloqueados. Denegadosinferior:edición/importe484/revisión/acciones;error/cabecera fuera viewport. Visualparcial,noroles completos.

AuthDB/JWT/RLS/Nextintegrado/modelovivoNOT_RUN/API0. Cola342/26PARTIAL/316sinreconciliar/0READY. HIGH5/W4/IAwritesOFF/issue10OPEN/releaseNOT_ACCEPTED;F736/B9/981/1266yfixture45/harness48intactos. Global1416padre noheredado. Sin fuentesajenas/W3/W4/W5/recurso.
