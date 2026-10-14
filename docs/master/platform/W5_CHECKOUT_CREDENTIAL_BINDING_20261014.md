# Credenciales de checkout vinculadas a cada paso

W5CLAIM6166241359. El guard antiguo usa grep-hEc sobre múltiples workflows, devuelve un número por archivo y compara cadenas multilínea mediante aritmética Bash. La ejecución inicial devolvió0 y«Guardrailselftestspassed» aun después de syntaxerror. Además, contar globalmente no prueba que el false pertenezca al checkout: un paso ajeno podía compensar un checkout inseguro.

El comprobador nuevo enlaza cada uses:actions/checkout@SHA con su propio paso y with. Exige exactamente una entrada persist-credentials:false y un SHA inmutable. Rechaza entradas ausentes/true/expresiones/duplicadas/indentación ajena, false en env/run/comentario/otrostep y formas ambiguas. Soporta el bloque YAML canónico y los mapas inline simples ya empleados por enterprise-platform/platform-promotion; no intenta interpretar YAML arbitrario. Formas complejas deben escribirse como bloque explícito, sin excepción de credenciales.

Primer intento propio:6PASS1FAIL por no soportar mapas inline existentes; se preserva y corrige ese caso sin cambiar workflows ni permitir credenciales persistentes. Final7controlesPASS;9workflows/24checkouts satisfacen el guard. ESLint y test-guardrails.shPASS sin error aritmético. El negativo con conteos globales iguales y un checkout desprotegido falla ahora. Pruebas con dosarchivos mantienen detección del fallo en cadaarchivo.

Se elimina la comparación aritmética defectuosa y se llama al comprobador desde el guard existente. No se relaja la política W4, no se activa DependencyReview deshabilitada ni se aprueba seguridad/release. W4 debe revisar esta implementación. El cambio se prepara en rama propia desde32862fa y se consolida en PR150 únicamente después de que toda suCI actual sea terminal, sincancel/rerun.
