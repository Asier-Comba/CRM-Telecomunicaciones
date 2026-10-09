# W2 — Complete telecom inventory cards on tablet

Owner: W2 product presentation and existing real browser consumer only.

## Demonstrated problem and change

Reviewed actual artifact11591082787 customer360-case/sim/portability-768 frames: each inventory starts its wide table at768. SIM origin, case internal-note count/update date, and portability trailing lifecycle/reason/source fields require internal horizontal scrolling. The page itself has no horizontal overflow and fields are not lost; the full row is harder to read on tablet. This is a scoped readability defect, not a privacy or backend failure.

CustomerDomainPages reuses its existing full-field cards through tablet for SIM/eSIM and cases (table from1280), preserving the already accepted contract behavior. The longer portability inventory uses cards below1536, including1440 desktop; its table remains available on wider screens. Other domains, fields, authorized queries, filters, cursor pagination, links, masks and write paths are unchanged. The same responsive views apply to global and customer inventories, using the existing optional customer column.

## Consumers and evidence

The existing customer360_loaded_telecom_desktop_tablet_mobile journey still compares visible row UUIDs against the actual ordinary-cookie list response at every domain load. Its existing captures now also require the whole first visible SIM/case card at768/390 and portability card at1440/768/390 to be in view. Every field label/value block, including previously clipped trailing fields, must be fully in view; the dd count must match the domain field count. The original line captures,107 case names, budgets, all old screenshots and privacy/CAS/replay assertions remain. Evidence uses actual data, not a substitute rendered fixture.

Local changed-file lint, syntax and types PASS; full exact-source integration/build/quality and real-image review PENDING. Base54@671cb86 passed its own107/Auth/history/context/grounding/teardown gates; no green is inherited. Canonical38@6b31dea is testing separately. No local heavy stack starts (approximately2.65GiB free); disposable CI is not a persistent installation.

## Limits

This change does not prove every possible viewport or global inventory field combination. Wide desktop tables continue to support horizontal scrolling. No API/RPC/schema/dependency/AI kernel or W4/W5 infrastructure change. Full audit remains fiveHIGH FAIL under #29; #10/independent W4 approval block AI writes. PUBLIC critical risk/PRIVATE recommendation retained without visibility change. VPS/production/providers untouched.

Next three: collect exact source107 and quality; review the seven strict card captures; consume only accepted source into canonical composition with its fresh complete gate.
