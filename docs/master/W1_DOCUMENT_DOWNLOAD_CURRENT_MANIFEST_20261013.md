# Current authorization and descriptor before binary delivery

Controlled tests on parentFD7949 reproduced three negative boundaries: a scope
revoked during Storage wait still received bytes; a changed workspace/current
descriptor was not rechecked before delivery; and returned bytes aliased the
Storage buffer after length/hash validation. One unchanged-download positive
passes. These controlled dependencies do not establish an actual Auth/Storage
incident. The initial four-test run also asserted a new RPC count in the positive
fixture; that over-specific positive assertion was removed, and both outputs
are retained separately rather than reported as four security defects.

DocumentContentServiceV1.download copies received bytes after the existing size
check, validates their existing SHA when supplied, then rereads the same existing
manifest RPC and privileged current workspace/role admission. Missing/refused
current access or descriptor returns the existing closed error. Changed private
path/object/MIME/size/hash returns conflict. No stale bytes are emitted. Normal
owner/admin downloads remain successful and perform one Storage fetch.

This adds one ordinary manifest RPC per successful binary download. It does not
issue tickets, change upload behavior, permissions, SQL, migrations, locators,
public response contracts or current ticket/target checks. No production/private
document is accessed. Existing backend content/transport tests remain required.

Nine focused tests and global types/changed-file lint validate the local source.
New full quality/browser/native/Supabase controls are required on its own SHA;
parent results cannot transfer. Actual Auth/Storage late-revocation race is not
measured by controlled tests. RAG real Auth-Storage/opt-in/index/model acceptance
remains pending; this is a prerequisite consumer correction, not operational RAG.
W4 must review the exact source independently. W5 ownership is unchanged.
IA writes OFF, release NOT_ACCEPTED and five HIGH remain unresolved.
