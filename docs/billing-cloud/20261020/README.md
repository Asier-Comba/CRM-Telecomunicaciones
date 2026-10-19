# Oier — parser and current proposal fixes

Owner authorization: [issue67 / 6278415584](https://github.com/Asier-Comba/CRM-Telecomunicaciones/issues/67#issuecomment-6278415584).
Claim: [6278546047](https://github.com/Asier-Comba/CRM-Telecomunicaciones/issues/67#issuecomment-6278546047).

This exclusive checkout/branch starts at PR156 `888ecaae57e9021ca0cb25d4da0657c1f6ac9b40`. No Asier checkout, branch, deployment or shared contract is changed. Integration requires Asier's explicit review/ACK.

The parser preserves `instalación de fibra`, accepts a concept followed by a comma, and interprets `quince días` as fifteen days. Invoice proposals retain the review gate and never save or issue automatically. An epoch invalidates late success/error responses after customer selection changes, removal, component disposal or a newer proposal request.

Original failures remain available at [the prior checkpoint](https://github.com/Asier-Comba/CRM-Telecomunicaciones/blob/fa65f2c2dfb2b894996f3fd006bd4c13b2540c30/docs/billing-cloud/20261019/RECOVERY_CHECKPOINT.json): parser 21/3, browser prompt 27/3, proposal context 3/12. These are historical measurements, not results of this candidate.

The new reports identify their exact measured source. Browser tests use real product components, repository code and validators with controlled loopback HTTP; speech is simulated. They do not establish hosted Auth/RLS, persistence, a real microphone or model quality. Netlify Edge Access remains assigned to W5; no bypass. No reset/reapply of the 87 hosted migrations.

Release remains `NOT_ACCEPTED`, commercial AI writes `OFF`, live model `NOT_RUN`; W4 independent review, five HIGH findings and Storage P0 remain open. F736 and CASE_NOTE_CURSOR are not claimed corrected.

See `CHECKPOINT.json` for final results, active work and recovery instructions.
