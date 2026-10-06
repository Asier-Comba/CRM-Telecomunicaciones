# Masked telecom context on line.list

Candidate after0c67c3a; exact published-source native/Supabase acceptance pending. The execution workspace went offline; this coherent projection was reconstructed from canonical GitHub files and retained edits. Prior local combined checkpoints passed298 Node and64 embedded migrations, but that is not exact acceptance of this independently published63-migration module. No attention code is included yet.

Existing line.list keeps its route/role/tenant authorization, customer/contract/service/operator/status/source filters, UUID ascending cursor and page cap. Updated LineRowV1 adds:
- service_kind: parent's closed commercial kind.
- masked_msisdn: active protected number's four-bullet/last-three mask, otherwise null.
- sim_id/sim_kind/sim_status: current open SIM association, assigned/active physical/esim, otherwise all null.
- masked_iccid/masked_eid: association's immutable captured identity masks; physical EID null.
- portability_id/portability_status: latest observed workflow by created_at,id, including retained terminal truth.
- open_commitment_count: applicable contract-wide or parent-service administratively open commitments, including expired rows needing administrative review.
- next_commitment_ends_on: earliest applicable open end at/after Madrid today, otherwise null; derived at read time.

No raw identifier, lookup, substring search, PIN/PUK, provider secret or address is introduced. Deactivation clears CURRENT association fields while sim.history preserves identity/history. Replacement changes the current SIM reference without overwriting old identity. A read never triggers provider/line success.

Migration20261006133000 replaces only the existing collection projection and unchanged ACL, plus updates the obsolete line-table comment to reference the protected domains. No data or published migration is rewritten. Runtime rejects nonclosed fields, full raw identifiers, incoherent nullable SIM/portability state and invalid masks.

Committed tests independently observe physical assignment/activation, eSIM replacement, deactivation/history, terminal portability, permanence counts and valid-JWT revocation. Earlier18 collection operations remain regression targets. The source becomes accepted only after exact native fresh/restore and real cookie-backed platform tests pass. Default product flag remains off, no frontend changes, no AI registration or writes.
