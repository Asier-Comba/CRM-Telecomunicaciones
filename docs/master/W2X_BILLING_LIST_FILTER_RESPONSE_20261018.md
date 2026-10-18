# Facturación: coherencia entre filtro solicitado y filas recibidas

CLAIM6253057995. Padre `917f4a475477c2b8aa544fcca55badf87fc08b3f`;rama propia `codex/w2x-billing-list-filter-response-20261018`.

Reproducción causal sobre el padre: **tres fallos y un positivo en46,8s**. DTOs estructuralmente válidos para lectura de espacio,verificados por el parser real coninputsin filtros,contradicen el customer_id ostatus explícitos,o declaran overduefalse bajoVencidas. La UI muestra esasfilas en vez de rechazar la respuesta. Capturas de contexto,inputs,logs yexit1 preservados. Es defecto deconsumo reproducido porHTTPcontrolado;no acredita fuga enDB/RLS real.

Una condición añadida en el bucle existente de parseBillingReadV1(invoice.list):si customer_id está presente,cadafila debe coincidir;si statusestápresente,debe coincidir,conoverdue=issued+bandera overdue verdadera. Se conserva lectura de espacio sinfiltros ylosestadosdraft/trashed/issued/paidválidos. No nuevo servicio/contrato dewire/consulta/SQL/permiso/cálculo;no controles eliminados. La semántica compartidaW1 queda pendiente derevisión yconsumo delpropietario antes de integrar en susramas. No revisiónW4 autoaprobada.

Propios147iniciales: **144PASS/3FAIL en3,2min**,fallosdelpositivo workspace. La ruta de fixture/facturacion abreinitialInvoiceId ydispara invoice.get,prohibido por el banco. No es fallo delnuevo validador:la fila global ya esvisible. Se preservan intento/log/exit1/snapshot. Corregido únicamente elpositivo:iniciaA yborra cliente manualmente para solicitarespacioB;mantiene todas lasprohibiciones decomandos/lecturas noesperadas. **Solo los3fallidos rechecados:3PASS10,2s**. Soncomplementarios144+3,no147singlePASS;no repetir verdes. Guardia reconstruye exactamente elbanco causal reviertiendo solo los3reemplazos defixture workspace;negativos ysu positivo causal sin cambios.

Banco nuevo18:cliente/estado/overduecontradictorios ypositivosacotado/espacio/overdue×3907681440. Respuestas contradictorias no exponenfilas,noconcluyen vacío ybloquean paginación;positivos siguenmostrando lafactura. Facturaciónpropia restante129regresiones incluye18páginas cargadas71 y111cliente/filtro/archivo/preparación/contexto/avisos. Una nueva prueba funcional enbanco existente mantiene sucontenido previo ycomprueba todoslosestados permitidos ynegativos decliente. **50/50funcionales817,5852ms** sobre nuevafuente;build66/lint/scan/diff/cola/bundle propios encheckpoint.

Elpositivo overdueusa bandera declarada delDTO,con due_onnull:demuestra solo binding delfiltro aesa bandera,no cálculo calendárico ni coherencia fiscal real. LaUIcapturada muestraVencida ySinvencimiento;esta combinación sintética no se acepta como dato financiero real. La asignación de fecha/as_of,overdue derivado,finanzas reales ySQL quedan sincertificar por esta prueba. No inventar fechas de vencimiento ocálculos medidos.

## Capturas realmente vistas

- filter-response-current-768.png — SHA256 5e89c14dc088a0854181c378d0c154af62c0dd2c7dc2d32f1a7bd12f5821c1d2
- filter-response-current-1440.png — SHA256 3a48739def7126031321a331471d6b5a9b3e8dbca271d4b6bb7b0ce247d2f84e
- filter-response-status-1440.png — SHA256 8631479b74af7a191634acd3bf4d1cf5484475b4a2f2439f5e330537370dae62
- filter-response-customer-1440.png — SHA256 4dd3f04240371e63258c2a7162242d22c6a64ddac7819f3356c75230bfc3d9c5
- filter-response-customer-768.png — SHA256 26ab378f0cdb5dac43257ef3dd514f7bc19ac07ff08b54b1c28bf566aee7b5c2
- filter-response-customer-390.png — SHA256 31c72197317484a734a131a3eaf18bfcabf038a671e3114070d3811cc12e0cb0
- filter-response-current-390.png — SHA256 6b00b9084bca82633845dc6be39a1d21cab753a615bf83630da01285b32ffba6
- filter-response-current-overdue-1440.png — SHA256 7ac67503781decb2bdbd0f7806bc42561aeaf3fee920843b78b7dd53b89f3390
- filter-response-overdue-1440.png — SHA256 426370e8f377143d62cbf37a74fbaaf218be2d13a1685fae6a76bc3d70bb2195
- filter-response-workspace-1440.png — SHA256 66cba2ae82661db5edc30b97489ae1c6e364017034d0a68fd8b6c8cf5c2e43b4

Ten frames:customer mismatch/current3907681440,status/overdue mismatch1440,current-overdue1440 and correctedworkspace1440. Negatives no rows/no false empty conclusion,disabled paging;safe error visible7681440,above mobile viewport390. Current row12/issued/30.25EUR/actions readable;mobile filters above viewport. Overdue positive shows Vencidas and issued/Vencida flag but Sin vencimiento in syntheticDTO:tests explicit declared flag binding only,not overdue date derivation or financial truth. Workspace shows Todo el espacio/Newdisabled/noPrompt/currentrow,not customeridentity pixels. Fixture banner excluded;partial visual only.

HTTPDTOsintético,componentes/repositorio/parser reales;AuthDB/JWT/RLS/SQL/Nextintegrado/modelovivoNOT_RUN/API0.342/29PARTIAL/313sinreconciliar/0READY sinpromoción. HIGH5/W4pendientes,IAwritesOFF,issue10OPEN,releaseNOT_ACCEPTED.1806fuente69único18288 activo,sin71/72;1842/106 recolectado sobrecandidato,NOejecutadoaún ysinPASSheredado. Solo solicitar controlador traspropios/publicación72 yprevio1806terminal/PUBLISHED/PASS. F736/B9/981/1266/fixtures/preparación/finanzas conservados;fuentesajenas/PR38/142/153/main/W3/W4/W5/recursointactos. Próximaunidad:mejorar identificación visible delcliente seleccionado si reproduce truncamiento,osinotropatrón estable reescrito.
