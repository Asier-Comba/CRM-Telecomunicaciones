# PAR-107 — Emisión explícita: reconciliación individual parcial

Fuente examinada fdc00b9542aa471bac6a60e3bf067669d6640608; árbol 3341a69ea236e47d6ce9fc1cb479bb67c1994b61; ejecutado f14958d262d0105a7ebd4b16dd00dc4615f0005a.
Supabase 38459142273/job115509472614; safe11847101090; producto11846831208.

El requisito original existe y se reconcilia exclusivamente con esta fuente.
La confirmación humana y la emisión persistida se observan en el browser owner;
la pérdida deliberada de lectura posterior se recupera sin repetir el comando
ni alterar número, versión o total. Las pruebas reales obligatorias del backend
rechazan CAS sobre versión emitida y papelera de factura emitida. No se presenta
denegación de creación de borrador como prueba de permisos de emisión.

La candidata posterior añade cuatro negativos reales a la aceptación Auth:
member, viewer, propietario de otra empresa y workspace ajeno intentan emitir
el borrador con comandos nuevos. Se exige403/42501 y snapshot completo idéntico
antes y después; el owner autorizado debe poder emitir a continuación con la
primera secuencia esperada. Estos controles son código preparado, todavía
NOT_RUN hasta completar Supabase en su propio nuevo SHA. No se suman al PASS
histórico de FDC ni se promociona SECURITY_ACCEPTED.

Se revisó el detalle emitido a1440/768/390. Número A/2026/000008 y total30,25EUR
confirmados por servidor. A1440 la copia privada aún se está consultando; a768
y390 figura conservada. Los KPI cambian entre imágenes por lecturas en curso:
no se aceptan sus totales ni la completitud de toda la pantalla por esta fila.
La captura inicial de Customer360 aún consultaba su resumen; el asistente
general mostraba preparación y consultas deshabilitadas. No se acredita aquí
un recorrido Cliente→Factura→Asistente completo.

Pendientes: matriz de permisos específica de emisión y revocación actual,
cancelación antes de confirmar sin escritura, confirmación repetida/reload,
diálogo y teclado/foco/Escape a las tres anchuras, revisión W4. Todos los cinco
estadios registrados son PARTIAL; SECURITY_ACCEPTED sigue NOT_RECONCILED,
RELEASE_READY false. Las otras341 filas no reciben promociones. No se hereda PASS
a78D o descendientes. IA writes OFF, modelo vivo NOT_RUN, release NOT_ACCEPTED.

Imágenes realmente examinadas, del ZIP sintético autorizado:

- billing-confirmed-current-invoice-1440.png: SHA256 3af9fbe4c55dbcfa47e2aa48beedcdecf36bd5beab8d5a36f33e1f3ee67a8227

- billing-confirmed-current-invoice-768.png: SHA256 7e72afc846f0be782f9ae587dde741ea90450fc321cc3e2737a6d5e6a7e8b48c

- billing-confirmed-current-invoice-390.png: SHA256 0a3e27dd08c363aefdba5a599b01945656c42820df5ee6bbddfee57b49402809
