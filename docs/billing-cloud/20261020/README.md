# Oier — parser and current proposal fixes

Owner authorization: [issue67 / 6278415584](https://github.com/Asier-Comba/CRM-Telecomunicaciones/issues/67#issuecomment-6278415584).
Claim: [6278546047](https://github.com/Asier-Comba/CRM-Telecomunicaciones/issues/67#issuecomment-6278546047).

This exclusive checkout/branch starts at PR156 `888ecaae57e9021ca0cb25d4da0657c1f6ac9b40`. No Asier checkout, branch, deployment or shared contract is changed. Integration requires Asier's explicit review/ACK.

The parser preserves `instalación de fibra`, accepts a concept followed by a comma, and interprets `quince días` as fifteen days. Invoice proposals retain the review gate and never save or issue automatically. An epoch invalidates late success/error responses after customer selection changes, removal, component disposal or a newer proposal request.

Further causal fixes preserve the current invoice/manual draft against late proposals, keep written provenance when dictation produces no words, and clear the previous customer's text and speech handlers on customer changes. Monetary clauses no longer become concepts: `Factura por 300 euros por soporte` yields `soporte`; an amount without a concept remains incomplete. Numeric service descriptions such as `24 horas de soporte` remain valid.

Latest measured product source: `7b54d09dad42cfeff92ea9a00cc1e73be620e42c`. Its own checks: 87 composed browser cases plus 88 existing billing regressions (175 unique), original parser 24/24, concept bank 10/10, billing logic 53/53, full lint, TypeScript and build exit 0. These measurements do not promote another SHA or establish release acceptance.

UNIT13 additionally retires proposals when the user opens fiscal details, an invoice summary or a payment confirmation. Its 12 original failures are preserved; all 12 now pass with a fresh-proposal positive control. No commercial command is sent in that bank. A new full Windows checkout of the measured source passed with spaces in the path and `core.longpaths=false`.

PR160 remains on `f519e60236f88a031f2625e382114b72e8a95030` while its own remote checks run. UNIT13 is in the isolated recovery ref until those checks terminate. Do not overwrite active checks or merge without Asier's exact ACK. The independent W4 all-ref audit on F519 remains blocked with 23 findings; the five dependency HIGH findings remain separate and open. Windows CI on F519 is now successful. Supabase success on source2E is historical and is not transferred to F519 or this source.

Raw screenshots, traces and diagnostics are preserved byte-for-byte in `evidence/artifacts-v1.zip`, `artifacts-v2.zip` and `dialog-original-artifacts.zip`. `ARTIFACT_PATH_MAP.json` maps the composed banks to archive entries and hashes; the original dialog archive retains its original relative names and has a separate byte-verification record. Machine reports remain separate. Bundling keeps Windows paths short and the three product source files reviewable; failures remain visible in the checkpoint and original reports.

Original failures remain available at [the prior checkpoint](https://github.com/Asier-Comba/CRM-Telecomunicaciones/blob/fa65f2c2dfb2b894996f3fd006bd4c13b2540c30/docs/billing-cloud/20261019/RECOVERY_CHECKPOINT.json): parser 21/3, browser prompt 27/3, proposal context 3/12. These are historical measurements, not results of this candidate.

The new reports identify their exact measured source. Browser tests use real product components, repository code and validators with controlled loopback HTTP; speech is simulated. They do not establish hosted Auth/RLS, persistence, a real microphone or model quality. Netlify Edge Access remains assigned to W5; no bypass. No reset/reapply of the 87 hosted migrations.

Release remains `NOT_ACCEPTED`, commercial AI writes `OFF`, live model `NOT_RUN`; W4 independent review, five HIGH findings and Storage P0 remain open. F736 and CASE_NOTE_CURSOR are not claimed corrected.

See `CHECKPOINT.json` for final results, active work and recovery instructions.

Unidad14: fuente comercial9e3ed4f. Se conservan6FAIL originales de cliente nombrado distinto/ambiguo. En la revisión:187casos únicos de navegador(99+88),24parser,10concepto,53lógica y lint/TypeScript/build exit0. El parser recibe todos los resultados de búsqueda ya autorizados; una identidad distinta o ambigua requiere corregir la selección/texto antes de invoice.propose. Visual revisada en advertencias390/1440, no aceptación global. Evidencia raw y151entradas ZIP verificadas; sin heredar Windows/Supabase de otros SHAs. PR160 continúaF519 mientras Supabase39337759538 esté activo; recuperación por alias propio, integración requiere ACK de Asier. Continúa UNIT15 Cartera en otra rama exclusiva sin duplicar facturación.
