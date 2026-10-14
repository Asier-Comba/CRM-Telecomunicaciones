# Documents: preserve an uncertain upload step

W2-X CLAIM6158706182, eligible own base9c361c9ce7e32ba202f0c6e24aacd371c5026e04. Own branch codex/w2x-document-upload-uncertain-20261014. Product UI and consumer QA only; no backend, Storage, RLS, primitive or W5 resource changes.

## Reproduction and change

DocumentUpload retains a File, request/finalize UUIDs and receipts only while mounted. Closing after a lost preparation reply unmounted the drawer and discarded those references. The original actual-browser reproduction fails because the ordinary close callback removes the dialog after the simulated preparation effect. A new preparation could create another pending document; no actual DB duplication is claimed from this synthetic proof.

Reuse Drawer.closeDisabled for busy or uncertain steps and guard its close callback. Explain that the current step must be retried before closing. Existing step, UUID, byte transfer and receipt logic stays unchanged. Normal closing after confirmed steps remains available, including the existing deliberate pending-upload cleanup workflow. No cross-navigation/restart durability claim.

## Evidence

Nine Chromium scenarios, preparation/byte upload/finalization at390/768/1440: first effect simulated then reply aborted; X/Escape and input replacement protected; exact command or exact bytes replayed; one preparation/finalization, complete flow and normal closing. Actual components/repository/parsers with controlled HTTP; no Auth or Storage acceptance inferred. TypeScript, lint and normal build66 pass; preparation recovery visually reviewed at three widths.

Prepared additional disposable check document_upload_three_uncertain_steps_same_intent_single_document_object. It uses normal authenticated UI and private-content transport, route.fetch before intentional reply loss, identical command/bytes replay, one active version2 document and one Storage object per upload, one command/audit per preparation/finalization, normal list readback and exactly three added documents. NOT_RUN until the composed source's own physical control runs. Existing controls and limits are preserved.

## Handoff

Current PR153 source37a5 has its own full checks in progress. Publish this independent branch and checkpoint; compose through the existing PR only after every current check is terminal, with new-SHA controls and exact fixture composition. Principal38/142 and W3/W5 are unchanged, no owner ACK inferred. Five HIGH, writesOFF, live modelNOT_RUN, issue10OPEN and releaseNOT_ACCEPTED remain. Next: measure physical private-content replay on its exact source and retain any failure before another product unit.
