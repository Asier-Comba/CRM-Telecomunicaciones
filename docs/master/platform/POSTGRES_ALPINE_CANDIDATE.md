# W5 second PostgreSQL image candidate

This isolated branch starts at vendor candidate d332937384b9e40e4430fb052426aab339864cbe (PR71). It does not consume PR70 product composition or apply any existing-volume upgrade. The previous bookworm result remains rejected and source-specific.

The official PostgreSQL 16.15-alpine3.24 manifest and Linux amd64 child/config were fetched anonymously from Docker Hub and verified against SHA256 of the actual manifest bytes. Coordinates are recorded in POSTGRES_ALPINE_CANDIDATE_MANIFESTS.json. This retains PostgreSQL major16 while changing the distribution; a tag or registry verification is not security acceptance.

Native disposable acceptance now additionally checks SHOW server_version against the pinned minor before importing any inactive synthetic workflow. Existing process/database restart, encrypted readback, wrong-key rejection, empty database/config restore, login and teardown remain required. Installed Docker image identity must also equal Trivy's scanned identity and the independently pinned configuration digest.

No scanner exclusions, severity waivers, secret suppressions, package overrides or company adoption are introduced. Both vendor scans still run independently. Unchanged n8n2.42.6 remains blocked by its exact prior scan; PostgreSQL results from bookworm cannot be attributed to Alpine. Fresh CI must establish this source's lifecycle and both scan outcomes. No workflows execute, no external sends occur, and no existing deployment or volume is touched.

Next: record exact-source native and image results; reject any remaining high/critical or secret finding; request independent W4 review only when the complete pair satisfies the gates. Hosted operation, offsite backup, real 15-minute RPO and existing-volume upgrade compatibility remain unproven.
