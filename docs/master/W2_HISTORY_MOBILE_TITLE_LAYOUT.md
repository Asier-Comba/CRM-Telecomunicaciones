# W2 — Persisted history mobile title layout

Owner: W2 presentation. Base: PR #42, source `92ea85c718cb685fa1de140eda7e1e37a85b904e`.

Real Supabase run `37855856474`, executed merge `0d6ed4ab70d77d58e7a777be631a34299f3d59ab`, passed 107/107 and actual cookie history/CAS/pagination/revocation. Tree `d6a7ccc3ea7d76ab7934142ed191377e6ad7fa0e` equals the base source. Reviewed synthetic artifact `11584363276` at 390 px shows the rename label wrapping and its input compressed by adjacent Save/Archive buttons. Passing the existing overflow assertion did not establish a usable input width.

The rename label now takes a full flex row below the existing `sm` breakpoint. Its input spans the available width, with Save/Archive on the next row. At `sm` and above it resumes the existing flexible row. Semantic labels, keyboard order, controls, CAS, pending states, cookie API, history and permissions are unchanged. No added dependency or rewritten component.

Candidate validation: changed-file lint and typecheck must pass; fresh actual history captures at 390/768/1440 and whole product/history acceptance remain required. No new implementation-mirroring test is added for this reversible presentation change. The previous 107/107 belongs to the base source and is not assigned to this new candidate.

The base's exact remote quality passes lint/types,410 bootstrap+481 assistant tests and production build; full audit fails five HIGH under issue #29. The separate Windows prerequisite exit fix is PR #43. AI queries remain unavailable without their separate provider/context gates; business writes stay disabled pending issue #10 and independent W4 approval. Full local Supabase remains resource-blocked.

Next: inspect this candidate's actual mobile input and tablet/desktop captures; compose accepted presentation/history with the reviewed stability fixes; re-run the complete exact-source acceptance without inheriting an older green.
