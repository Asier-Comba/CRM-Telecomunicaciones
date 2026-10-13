# W2 grants86 caller portability — request 6150211191

The source loader already admits canonical85 and an exact owner directory86.
Its explicit delivered-grants mode intentionally rejects an extension already
present. Two callers nevertheless assumed canonical85: the first closure test
used the actual checkout as its 85-file fixture, and the grants86 workflow always
requested fixture delivery. Both failed on W5's legitimate directory86 union.

The canonical-versus-delivered comparison now uses an isolated canonical fixture
copied from the pinned files. A separate test validates the actual checkout and
both supported directory profiles. No test is skipped.

The workflow requests `require_grants_86`. The consumer validates the complete
actual directory through the existing loader first. With canonical85 it adds the
exact delivered fixture; with an exact owner directory86 it uses that extension
once. All names, hashes, byte admission and immutable captured SQL remain checked.
Explicit duplicate delivery, modified SQL, unknown files and modes still fail.
The canonical consumer's default directory profile is unchanged.

An isolated actual directory86 reproduces the original caller failure and passes
all six closure tests with the fix. Canonical85 also passes all six. These are
file-admission tests, not PostgreSQL, Auth/DB or independent restart evidence.
The new source must pass its own physical jobs before qualification. No W5
resource or owner branch is modified. Full23 remains NOT_RUN, AI writes OFF,
and release NOT_ACCEPTED; five HIGH remain unresolved.
