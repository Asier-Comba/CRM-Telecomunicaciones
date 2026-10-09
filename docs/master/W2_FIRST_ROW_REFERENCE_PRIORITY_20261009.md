# Current reference priority within collection pages

Base: PR38 source `158682461863fc16609db44d18de14389a947841`.

The current page loader grouped all customer references before all operators and sold plan versions. With 20 distinct customers, unrelated later customer reads could occupy all four workers while the first row's operator and sold version still displayed their loading labels. Progressive publication alone did not remove this ordering delay.

The queue now follows the received page's row and field order. Deduplication includes the reference kind, so an equal UUID for a customer, operator and plan version still requires three separate current reads. The four-worker limit, bounded identity reads, closed repository/parser boundaries, unavailable labels, immutable publications and page disposal remain enforced. No command, cross-page cache, retry or timeout extension is introduced.

## Local verification

The new regression fails on the base with a pending first-row operator and passes after the change. It uses the actual integrated repository, normal query endpoint contract and closed customer/operator/plan DTOs. Later customers remain explicitly held; the first-row customer/operator/version complete. Twenty distinct customers plus repeated operator/version require exactly22 reference reads. Existing progress, disposal, revoked-page and telecom boundary tests also pass:22 tests total, lint passes for both changed code/test files.

An isolated HTTP browser comparison renders the actual `CustomerDomainPages`, scoped labels, integrated repository, closed input/result parsers, React, status components, Tailwind and Geist. At1440/768/390, each variant renders20 visible rows (40 DOM rows including the hidden alternative layout). Before releasing later customer responses, the base has a named first customer but pending operator/version; the change names all three. After release, every row is checked with ordinary scrolling. Each case uses23 reads including the collection page, zero commands, zero browser errors and no document overflow:138 reads across six comparisons. A large exact minor amount and retired sold version remain displayed without substituting a current plan. The fixture explicitly declares UTF-8.

The local fixture supplies a fixed synthetic provider. It does not exercise Auth, real JWT, PostgreSQL, Storage or the full application shell, and does not establish the107-test acceptance of either this unit or its base. Review the new unit's own CI, own Supabase run and fresh screenshots before composing it into PR38. The base's pending acceptance is not transferred to this unit. Dependency issue29, physical durable implementation/independent W4 approval and business AI disabled state remain open.


## Recovery after original abrupt document-route failure

Original PR108 source 33d27ff6280f3014d8ab31dd0eb6fb7fc9931b7a, executed 10e6b981d080d4187f5f8de2f4ac4c3bcfbb8875, tree 125274ae8f4baa698f30ede7c8d0fa7954988f34: own CI438+485/lint/types/build66/native73/296/preview12 passed within scope, audit5HIGH failed. Its own Supabase run37995229138/job114039443447 failed after53 individual completion events on an unobserved route.fetch connection-reset rejection; final safe report was absent and teardown was not confirmed. Exact socket-reset root cause is not established. Partial screenshots are not accepted107/55 evidence. The original failure remains frozen; no same-source retry or inherited PASS is declared.

This recovery ordinarily merges independently accepted W1 PR110 source 7ab25740ea1a3a0f01bf9d1f6e12a833ac97b5d4, executed c12cbeea559b77944212c3ad585d5a3031ef182c, identical tree 3b1ca363ad7d378e3d11541947219f7aa8acdff4. That unit earned its own107/107,55 actually reviewed fresh frames,441+485/lint/types/build66/native73/296/preview18 including six actual Playwright transport cases, safe report and teardown. Audit5HIGH remains FAIL. Its observer owns callback failures, drains pending work and blocks retries after failure without exposing raw request headers. It does not establish the root cause of the original connection reset or increase budgets/retry commands.

The row-priority implementation and regression blobs remain byte-identical to the original unit. All five accepted W1 unit blobs are preserved. This new combined tree needs its own complete CI, Supabase107 and55 fresh visually reviewed frames before consumption by canonical38; neither original33d nor accepted7ab evidence is transferred. Canonical158 remains unchanged until independently accepted composition. Physical durable adapter/W4/#22/live/commercial/local readiness remain open; business AI effects OFF.
