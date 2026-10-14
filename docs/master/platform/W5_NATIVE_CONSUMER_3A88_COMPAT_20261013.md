# Compatibilidad canónica del recurso corregido con el consumidor W2

Base propia congelada: producto3a8864378a130258a0ba727c3c79b486c9695c52,85 migraciones. Merge normal de PR146/b171e5e82431858e141833a7d03930660f044ef6. Gitdiff verifica que src, scripts/security, supabase/migrations, tests/bootstrap y tests/assistant son idénticos a3A88. Se reutilizan exclusivamente bootstrap, consumidor, driver y escenario actuales de W2; W5 no modifica lógica de negocio ni fabrica otro recurso.

Esta unidad mide el consumidor canónico85 con el factory corregido: postmaster definitivo, operación comprometida, reinicio del mismo clúster, autoridad fresca, ledger/audit originales y teardown. Necesita CI física propia; no hereda el PASS de3A88,PR146 oPR147.

La unión empresarial PR147 tiene86 migraciones y su consumidor W2 falló antes de aplicar SQL por el requisito fijo85. Ese FAIL, la migración propia adicional y REQUEST6146872077 siguen intactos. Esta rama parte del snapshot canónico85; no elimina migraciones de PR147 ni sustituye su aceptación empresarial. Una prueba de compatibilidad85 no resuelve la integración86.

No cubre23 escenarios,ausencia de efecto,quiescencia o handler comercial real; conserva los límites NOT_RUN del consumidor. Supabase/UI de esta fuente requieren ejecución propia si se usan para aceptación del producto. Auditoría5HIGH y revisiónW4 siguen separadas, IA writesOFF, modeloNOT_RUN, releaseNOT_ACCEPTED. Cero llamadas y reservasOpenAI.
