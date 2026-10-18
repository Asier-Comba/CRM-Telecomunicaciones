# Número protegido de línea: cierre y recuperación de paneles anidados

CLAIM 6254960081; ampliación documentada en issue67. Rama `codex/w2x-line-number-recovery-close-20261018`, desde `1fd0d94da7687881d073c24b6edd550d2e4a2cdd`.

## Fallos conservados y causa

El causal inicial dejó **2FAIL/1PASS en30,6s**: X habilitada durante incertidumbre y X sin efecto tras denegación/cancelación. La cancelación normal pasaba. Se conservan log,exit,banco y3observaciones; un comando/un efecto sintético en incertidumbre,un comando/cero efectos en denegación y cero comandos/efectos en revisión.

La primera corrección del cierre del hijo se ejecutó en el banco completo de186. Resultado original **183PASS/3FAIL en6,2min**, exit1 conservado. En los3anchos de incertidumbre,las guardias de X/Cancelar ya estaban bloqueadas,pero Escape retiraba confirmación,hijo ypadre. Se conserva íntegra esa ejecución y sus auxiliares,además de la fuente y el banco exactos. No es un fallo de fixture ni se convierte en186PASS.

Tras terminar el control,sin cancelarlo,se restauró temporalmente el producto exacto87 para una comparación complementaria. Escape dejó **1FAIL**:tres paneles antes,cero después. Tab dejó **1PASS**:los tres permanecen. Duración25,3s,un comando/un efecto sintético y sin errores de página en cada caso. Se registró un evento cancel dirigido a la confirmación. Las muestras defaultPrevented se tomaron en captura/microtarea y no acreditan el estado final de propagación;no se usan para aceptar la causa. La lectura del código y el contraste muestran que la composición del padre permitía cerrar mientras numberEntry seguía abierto. No se atribuye este mecanismo aF736/B9 u otros fallos.

El primer intento del banco complementario no cargó @playwright/test por estar fuera del repositorio:NOT_RUN. Se conservan log,exit y banco original. Se corrigió solo la importación a la misma instalaciónCLI15 y se usó otro outputDir;no se cambiaron producto o aserciones para esa comparación.

## Cambio y controles propios

El hijo consume closeBlocked existente para closeDisabled y su callback,conservando el vaciado de raw al cierre permitido. El padre añade numberEntry a su condición de cierre y a la guardia del callback. Así,cancelar el diálogo superior no puede retirar toda la operación anidada. No se cambia Drawer,ConfirmDialog,hook,locked,servicios,parsers,órdenes oSQL;no hay estado nuevo ni primitiva nueva. La reversión exacta de ambos fragmentos devuelve87.

El banco añade3casos EscapeReview a los9 originales. En ellos,el primer Escape cancela solo la revisión,el segundo cierra solo el hijo y el padre permanece;reabrir muestra el valor vacío. Las guardias reconstruyen el banco original y mantienen las aserciones anteriores,incluida la permanencia tras Escape durante incertidumbre.

**189 passed (5.4m) propios de la fuente corregida:**12casos pertinentes y177regresiones. Es una ejecución nueva uniforme,no hereda los183verdes del intento fallido. Incertidumbre conserva valor y orden,con un efecto sintético;denegación permite cerrar/reabrir vacío,nueva confirmación y nuevo command_id,cero efectos antes y uno después. Revisión normal yEscapeReview no envían orden. Tras confirmar,el padre sigue abierto,el selector no se elige automáticamente y el nuevo identificador se ofrece enmascarado. No se crea una portabilidad ni se consulta identifier.get. Tras salir,el valor completo no queda en texto oinputs renderizados. Solo teléfono sintético reservado. Build66,lint,scan,diff,cola ybundle propios antes de publicar;funcionalesNOT_RUN_EXISTING_CONTROL_POLICY_CONSUMPTION.

El refresco del hijo es síncrono. No se inventa una recuperación interna por503;la consulta del selector corresponde al padre y su aceptación completa queda pendiente.

## Evidencia visual y límites

Doce capturas revisadas a390/768/1440:incertidumbre,revisión,EscapeReview ydenegación. El formulario bajo la confirmación aparece desenfocado;estado y valor retenido se comprueban también por DOM. Limpieza y conservación del padre se comprueban al cerrar/reabrir y confirmar. El footer móvil queda parcialmente fuera del viewport. La nueva opción enmascarada pertenece al selector cerrado y se comprueba por DOM,no como menú visible desplegado. Máscaras,filas ycantidades son declaradas. No es prueba de borrado de memoria,cifrado,almacenamiento protegido oautoridad real.

HTTP/DTO y efectos sintéticos con componentes,repositorio yparsers reales. AuthDB/JWT/RLS/SQL/Nextintegrado/modelo vivo:NOT_RUN;API0. Sin ausencia/quiescencia nativa,reinicio,handler o full23. Los cinco campos no medidos siguen sin medir.

Global1968/source84 ywaiter2007/source86 conservan pines;ninguno contiene87/88 ni acredita esta corrección. Coalescer el siguiente full2043/118 y verificar su colección real antes de solicitarlo desde la fuente propia publicada. No duplicar,cancelar oheredar resultados. Matriz342/31PARTIAL/311sinreconciliar/0READY;cinco HIGH y W4 pendientes,IA writes OFF,issue10 OPEN,release NOT_ACCEPTED. F736/B9 y evidencias anteriores conservan su alcance. Consumo principal pendiente de ACK exacto;main,PR38/142/153 yfuentesW3/W4/W5 intactas.

- line-number-recovery-uncertain-768.png — SHA256 ee06a57d6da3542a1379ad1872e7ad4c2dc1c8d16130705fdf67eadffc243ad9
- line-number-recovery-escape_review-768.png — SHA256 1b76e6ca865e25bb25556c8a89f947eeca687dca7df79eed9ead0993b174f023
- line-number-recovery-review-390.png — SHA256 c38b9459f476f20bfe3e8fa1f2bf453d42f1daaeda9301a8b9974dd867151681
- line-number-recovery-escape_review-390.png — SHA256 c03b8d2ef15d47d147cf3c14fabf3fbe00aff63ed2d6ffeece0067b31295277b
- line-number-recovery-review-768.png — SHA256 e3da422ca205594801a6cc1f39ce453f9f3bb7c9365adb5e79d3ecc38f16185f
- line-number-recovery-denied-768.png — SHA256 20dc1aeeae696cd938bcf31df859f3389df5321a2f1a2ba3f5641a3189fb814d
- line-number-recovery-denied-390.png — SHA256 f1fa3880100cf84ecccb194f5bf19634c53d9cadc15aef276f5c74f906496182
- line-number-recovery-review-1440.png — SHA256 c06e4c7d2bc99069ffee84efaa62067c7ff43697aacb01446c1bb4b01f315817
- line-number-recovery-uncertain-1440.png — SHA256 029f8689e9c2e3fa7869a912811699b510309f17ed7effbb5282a035d2a56c42
- line-number-recovery-denied-1440.png — SHA256 47ba9e4aa9edafe1b5be505cf6bd5d1ed210bbebf248a131c234dfb4f77d5db0
- line-number-recovery-uncertain-390.png — SHA256 08e535c239663368228d1c1b0b7c7240bf25ac9ad9c4a98a478d6db538aa7315
- line-number-recovery-escape_review-1440.png — SHA256 2ffef00ccfac41c1c71602720dfc5598ab7c908218361c07887b40467dcdefbe
