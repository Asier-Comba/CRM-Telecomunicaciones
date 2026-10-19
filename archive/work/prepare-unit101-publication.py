from pathlib import Path
w=Path('work');s=(w/'close-w2x-customer-list-page-focus.ps1').read_text(encoding='utf-8-sig').replace('customer-list-page-focus','customer-list-refresh-focus').replace('session=9111','session=1405').replace('preflight-unit99.py','preflight-unit101.py').replace("'fix(customers): restore pagination outcome focus without stealing user intent'","'fix(customers): restore explicit refresh and retry outcome focus'")
a=s.index('$body=@"');b=s.index('\nforeach($n in',a)
body='''$body=@"
HANDOFF W2-X101 — Clientes: foco al actualizar y reintentar la lectura.

Fuente $sha; árbol $tree; rama $($cp.branch); padre $($cp.base); CLAIM6256363492. Propios $($cp.browser_summary):42 casos relacionados con inventario y51 contextuales. Compilación66, analizador con tres avisos previos conservados, scan, diferencias, cola y copia Git verificada. Padre100 es metadata con src/tests idénticos a99; ningún78 u otro PASS se hereda.

Causal3FAIL1PASS40,8s en390, producto intacto: Actualizar correcto, Actualizar403 yReintentar correcto dejan BODY pese al resultado/alerta visible. Elegir Nuevo cliente conserva BUTTON. Lecturas retenidas,observaciones/capturas/logs/banco conservados, sin comandos ni errores de página. No fallo de backend o roles reales.

Una sola condición del reload existente activa su propia intención de orientación. Reutiliza refs,estado/alerta enfocables ypolítica99: orientar al terminar si no se eligió otro control;filtrar retira intención yla revisión de consulta ya existente retira peticiones anteriores. Sin otra primitiva,servicio,consulta,API omecanismo de estado. Paginación99 yfiltros97 preservados.

Quince nuevos casos: éxito,denegación,foco elegido,reintento desde fallo inicial yfiltro que sustituye actualización pendiente,en390/768/1440. Las filas se retiran durante espera,error permite reintento por teclado,filtro conserva valor ydescarta respuesta/foco antiguos. Banco final idéntico al causal;las otras anchuras/caso de filtro ya previstos se ejecutan ahora. Los78 controles anteriores se ejecutan de nuevo en esta fuente, sin heredarlos.

Quince cuadros actuales realmente vistos,con hashes: resultado/alerta enfocados,botón elegido,reintento yfiltro. La imagen de error precede a la recuperaciónDOM;enchosen390,el registro queda debajo del cuadro con filtros abiertos. No todos los campos/columnas/roles/accesibilidad/táctil. Un error de comillas del auxiliar de montaje ocurrió antes de crear sus salidas;las15 imágenes originales intactas yla correcciónUTF8 quedan registradas,sin repetir pruebas ni atribuirlo al producto.

IntegratedCustomers/Customers/repository/parsers reales con HTTP sintético ycontextoRouter existente. AuthDB/JWT/RLS/roles/membresía/multiempresa física/navegaciónNext integrada/modelo vivoNOT_RUN/API0. Primarios sin comandos,sin ausencia/quiescencia/reinicio/handler/full23.403del fixture no prueba aislamiento real. F736/B9 yresto de originales conservan causa yalcance.

Matriz342/33PARTIAL/309sinreconciliar/0READY sin promociones;PAR030 mantiene99,PAR046/086 sus fuentes individuales.2007/source86 y2043/source88 publicados PASS55,8min/52min;2109/source92 activo93887 y2139/source97 waiter26311 mantienenFIFO/pines yno acreditan101. CincoHIGH/W4 pendientes, IA comercial writesOFF,issue10OPEN,releaseNOT_ACCEPTED. Main,ramas principales/ajenas/congeladas,W3/W4/W5/recurso yproducción intactos;consumo principal requiere ACK exacto. Continuar otra unidad comercial útil independiente tras checkpoint, sin repetir verdes sin cambio.
"@'''
s=s[:a]+body+s[b:];(w/'close-w2x-customer-list-refresh-focus.ps1').write_text(s,encoding='utf-8-sig')
