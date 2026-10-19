# Paquete de aceptación cloud — Oier

**CLOUD_PARTIAL.** Auditoría por fuentes fijadas; no aceptación del producto ni seguridadW4.

Fuente inicial PR156 `5332d9899eb1062a7db6b1800e9f0eda1151bac3`; observación posterior `2cbdc4b66315a52720c19c60e5d7ebe4e6adc996`; propuesta y deploy declarado W5/PR159 `bb16afe512be1cb04d6c86ecadb2064966a062aa`. Fecha de corte 2026-10-19T18:59:45.925355+00:00. CLAIM[6274698885](https://github.com/Asier-Comba/CRM-Telecomunicaciones/issues/67#issuecomment-6274698885). Las fuentes son candidatas, no composición aceptada. No herencia de PASS entre SHAs.

Entregables: [CLOUD_STATUS](CLOUD_STATUS.md), [CLOUD_GAP_MATRIX](CLOUD_GAP_MATRIX.md), [SUPABASE_CONTRACT_AUDIT](SUPABASE_CONTRACT_AUDIT.md), [COMMERCIAL_CLOUD_ACCEPTANCE](COMMERCIAL_CLOUD_ACCEPTANCE.md), [REPRODUCIBILITY_AND_BACKUP](REPRODUCIBILITY_AND_BACKUP.md), [CONSERVATION_FOLLOWUP](CONSERVATION_FOLLOWUP.md), [COORDINATION_HANDOFF](COORDINATION_HANDOFF.md). JSON adjuntos contienen342 filas, ocho grupos de lectura y18casos cloud preparados.

Reproducir el auditor sinservicios: `python tools/oier_cloud_audit/verify.py --repo . --source-ref 5332d9899eb1062a7db6b1800e9f0eda1151bac3 --compare-ref bb16afe512be1cb04d6c86ecadb2064966a062aa`. Necesita ambos objetosGit publicados; no los descarga automáticamente ni ejecuta scripts del producto. Negativos: `python -m unittest discover -s tools/oier_cloud_audit -p 'test_*.py' -v`. El workflow exclusivo ejecuta estos mismos controles encloud. No usar estas herramientas para probar vulnerabilidades, llamar APIs de pago o aprobarcloud por recuentos.

Todas las pruebas de aplicación hospedada estánNOT_RUN. AccesoSupabase propio denegado, preview401sinlogin; discrepancias de composición/CI y StorageP0 permanecen. Datos reales/secretos/logs crudos/procedimientos privados excluidos. Se recomienda repositorio privado; sin cambio de visibilidad. Evidencia remota del auditor se publica mediante handoff enissue67 con SHA exacto después delpush.
