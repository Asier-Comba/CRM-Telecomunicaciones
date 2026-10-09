# Recovery archive boundary continuation

WORK: W5. Base: PR80 source002ef26941c4d1aef136c75c57358bbe07cbc1c7. PR80 remains a frozen checkpoint; this candidate is a separate preparatory correction, not adoption.

Version1 encrypted archives now require a closed envelope/header, canonical bounded byte encodings, the encoder's complete authenticated format and exact nonce/tag lengths. Duplicate/empty bucket identities and invalid DB/object encodings fail before Storage provider calls. Valid existing encoder archives and legitimate empty Storage objects retain their meaning. The encoder's key identifier must be a string. No key, algorithm, software source binding, migration, product, assistant, image pin or provider policy is replaced.

Three new synthetic boundary controls failed against PR80 before the correction and pass afterwards. They prove complete round trips, malformed-format rejection and no provider call for ambiguous input. Existing backup, manifest and n8n controls pass in the targeted10-control local run. The actual empty-rebuild recovery drill additionally requires three closed format/inventory negative controls against its own encrypted synthetic archive. Exact-source native recovery and product CI are pending publication, never inherited from PR80.

Private diagnostics contain no key/archive/customer values and are not uploaded. Errors remain closed. No scanner suppression, risk waiver, hosted RPO, offsite proof, existing-volume upgrade or external provider effect. Vendor/dependency/history gates and truly independent review remain required; issues10/12/22/29 stay open and AI writes OFF.

NEXT3: collect exact-source CI and retain failures; independent review of the corrected archive boundary; consume newer W2 only after its own complete acceptance.
