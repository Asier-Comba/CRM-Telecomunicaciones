# Perfil fiscal: formato del país antes de enviar

Claim [6309723790](https://github.com/Asier-Comba/CRM-Telecomunicaciones/issues/67#issuecomment-6309723790). Rama exclusiva `codex/oier-fiscal-country34-20261021`, desde **48e4c64e157e1a66e1fd2d8b6694247c870f2a15**. Propuesta independiente de Oier33; no contiene ni sobrescribe su corrección de filtros.

El contrato ya exige dos letras ASCII mayúsculas. El formulario permitía80caracteres y `es` producía «Revisa los datos introducidos» antes del POST. Ahora sólo ese campo transforma letras ASCII minúsculas, limita la longitud a2 y muestra la validación nativa del formato antes de enviar. No hay conversión Unicode a alias, catálogo nuevo de países, regla fiscal, cambio de parser, SQL o permisos.

Tests **8b293fbda99fd24a652b3974beacc3ad035a437e**: seis FAIL causales, emisor/cliente en390/768/1440, esperado1POST/observado0; contexto original confirma campo`es` y alerta de validación. Fix **11d5db028ada4e8cec2ab96e0adb4221da4ab2d5**: **37/37 PASS**, seis nuevos y31relacionados; sin retries/skips/flaky ni cambios de tiempos. Incluye recuperación fiscal de resultado incierto y recibo inválido/denegado. Se excluyen explícitamente las operaciones invoice.* de esos dos bancos porque no cambian.

Cada caso nuevo prueba perfil canónico`ES` por el repository/parser real, exactamente un POST HTTP **sintético denegado403**, datos restantes idénticos, `E` y`ß` inválidos sin más envíos y `fr`→`FR` válido. La alerta roja de las seis capturas revisadas es esa denegación deliberada. **No se afirma guardado, readback fiscal persistido, Auth/RLS, Storage o cloud.** Las demás regresiones usan su simulación anterior de recibos; tampoco ejecutan SQL.

[Manifest con antes/después, hashes y controles globales](country34/acceptance.safe.json). El código probado es11d5db02; el commit posterior sólo agrega evidencia. Handoff de dos archivos funcionales aAsier, sin PR duplicada. Componer ambos bloques de pruebas con33, conservando su fixture de trimestre y las nuevas aserciones fiscales; no importar ramas enteras o perder funciones. La sucesora requiere sus propios controles.

Presupuesto0EUR, NetlifyFree/deploy intactos; IA comercial writesOFF/StorageOFF, cincoHIGH/historial/vendor/W4/backup abiertos. Voz físicaNOT_VERIFIED, issue10OPEN; **RELEASE_NOT_ACCEPTED**.
