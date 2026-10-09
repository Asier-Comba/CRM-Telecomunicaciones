# W3 — Actual read grounding with a declared synthetic planner

Owner: W3 integration acceptance, consuming existing W1 closed readers and the W2 ordinary identity helper. Base PR38 source `e6ca5dc7875d5552d12ef2da72039608e74890e7`, whose new composition gate is still running at preparation. The previous exact composition64cc passed107/107; this source requires its own evidence.

## Gap and scope

Existing application-turn tests use deterministic reader ports; actual Supabase history tests reserve/finish synthetic historical turns without executing the W3 read/grounding pipeline. Neither alone demonstrates the existing planner/executor/composer/history combination over current-cookie reads. This unit adds that integration to the existing disposable CI stack, after the original real history browser and before releasing its development server. It changes no product app, provider factory, capability, RPC, permission, migration, AI flag, SDK dependency or W5 infrastructure.

The only deterministic adapter is a fixed closed planner fixture, explicitly `evidenceMode:synthetic` and `liveModelEvidence:false`. It does not interpret Spanish or claim model quality. Actual Auth verifies the fixture user; fresh user-JWT PostgREST reads verify profile/workspace/membership version and workspace epoch before/after awaits. Actual cookie calls use the registered `/api/product/v1/queries` collection route and `/api/telecom/reads/v1` aggregate route, with unchanged30s HTTP and10s data-read budgets. ConversationServiceV2 invokes the actual history RPC through the fixture user JWT. No service-role credential or SQL is offered to a planner or reader.

Three synthetic customers, two operators and three contracts are seeded in the existing disposable two-workspace fixture. Authority is never derived from model arguments. Fixture-only references are reauthorized through existing operator.get and customerCollectionIdentity; they are not a production handle issuer or entity-resolution implementation. SQL is confined to fixture setup, revocation/restore and read-only observers. This does not register a model-selected SQL or HTTP tool.

## Required actual scenarios

- Authorized customer rows and source read time, with exactly the two own operator-filtered fixtures and no foreign row.
- Real one-row keyset page retains partiality in its source and block.
- Multiple results prevent an invented dependent selection and emit no factual blocks.
- Exact own ordinary identity permits a real Customer360 count/as_of response.
- Foreign ordinary identity fails before the dependent summary; raw model UUID arguments are rejected before any reader.
- Membership revocation after a successful read discards already-read facts and prevents final emission; the same cookie is actually denied on the next HTTP read. The fixture is restored in finally and the stale reserved read is cancelled through the real RPC.
- Seven actual reserved reads produce seven user/six generic assistant history entries (cancelled turns publish no answer under the existing SQL contract). Current facts, source blocks and provider telemetry do not enter history. Full row snapshots of all newly seeded business fixtures remain unchanged.

Reporting adds only `assistant_read_grounding` with a closed PASS status. Failure reports use a fixed `W3_READ_GROUNDING_<PHASE>` tag; no raw errors, JWTs, URLs, IDs, model payload or rows are printed. All107 original W2 journeys and history assertions remain. No response mocks, retries, sleeps or budget increases are added.

## Local verification and unfulfilled gates

Windows syntax of both scripts and changed-file ESLint: PASS. The isolated checkout has no node_modules; its adjacent installed ESLint runtime/config emits React auto-detection and pages-directory setup warnings, without suppressed code warnings/errors. Existing meaningful application-turn grounding/cancellation/late-CAS/calendar tests:4/4 PASS. Direct guarded module checks: three non-CI/foreign-origin configurations refuse before any fixture/RPC port call. These are deterministic/local checks, not actual DB acceptance.

Fresh CI lint/types/full tests/build and complete actual Supabase/Auth/PostgREST/Storage/history/grounding/107 UI acceptance remain PENDING. Windows full-stack execution is resource-blocked (~2.4GiB free); Docker remains stopped. Full dependency audit5HIGH remains enforced by #29. Physical AI business durability NOT_TESTED and independent W4 approval remain pending #10; business writes stay disabled. Semantic live evaluations, production reference issuance and interactive streaming UI are unfinished. No main, production, hosted account, provider call or W4/W5 infrastructure change.

Verified current [getUser](https://supabase.com/docs/reference/javascript/auth-getuser) and [select](https://supabase.com/docs/reference/javascript/select) documentation plus the changelog against the existing locked SDK; no SDK or engine upgrade. The [Postgres minor release notice](https://supabase.com/changelog/postgres-15-19-17-11-breaking-changes) concerns extension/index/legacy-cipher/custom-operator upgrade handling, owned separately by W5/W4; this test does not upgrade an engine or infer their approval.

Next three: collect this exact source's actual grounding and full107 gate; diagnose any closed phase failure without substituting mocks or dropping assertions; review/combine accepted consumers and repeat full exact-source composition, keeping live semantic/UI/security gates explicit.
# First actual execution and bounded history diagnostic

Initial head `4005232beaa7532ffcf5e21b59aa48188baf07fd`, Supabase run 37863185969/job 113603569480, failed in the preceding history browser route callback: `CHECK_ASSISTANT_HISTORY_BROWSER_COMMIT_BEFORE_DELIVERY_LOSS`. The grounding helper was **NOT_REACHED**, not PASS. The callback threw before its delivery abort and outside the awaited harness path, so this initial execution does not provide a complete report/teardown receipt. Do not infer its HTTP status or root cause.

The diagnostic follow-up records only the HTTP status (or closed `NO_RESPONSE` value), aborts delivery in `finally`, and checks the required 200 in the awaited test path before any retry. It retains the same command identity, one persisted row, CAS and all original assertions. It changes no product or grounding behavior and registers no model/provider. A refused first command cannot become a PASS.

The base #38 at `e6ca5dc7875d5552d12ef2da72039608e74890e7` has now completed **104/107**, with two billing and one mobile shell timeout; Auth/history passed. Its previous composition `64cc55f9d88e314f0c740a3b1829ff61571c5c3d` passed 107/107. Do not transfer that success to the new source. W2 is diagnosing this separately.

Diagnostic head `92f453cc8d1d57b8580dac8aeefd8612535f1338`, run37864199489/job113606918806, executed `67e4435f3fe46a1f4df5b4ed2e73af606802eadf`: FAIL `http_acceptance/BOUNDED_ACCEPTANCE_FAILURE`, teardownPASS. Grounding and W2 NOT_REACHED. Its existing lost-delivery UI expectation failed before the HTTP check; no status/root cause was recovered. W2 #50@f92f91c also failed in the original route callback before reaching its new billing tests.

Next diagnostic awaits upstream completion within the existing page30s budget, checks the mandatory200 before the unchanged UI5s expectation, and captures a fixed phase on failure. Tags include only fixed phase/kind and closed HTTP status. No extra retry, mocked response or weaker commit assertion. Whole acceptance and grounding remain PENDING on this follow-up.

Head62802e5 actual37864719383/job113608593679, executed `a6664b2b1520b256a132a6333e9a2e005dbd0ded`, FAIL `http_acceptance/BOUNDED_ACCEPTANCE_FAILURE`, teardownPASS. Six ordinary history captures exist and no failed-history-phase capture, so this does not reproduce the earlier creation refusal. Importing the new helper with the workflow's plain `node` was reproduced locally: `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`, parameter property in the **unchanged** ConversationServiceV2. The prior local guard check used `--experimental-transform-types` and could not validate the workflow's plain invocation.

Use that same repository-established flag (already in `test:assistant` and `eval:assistant:v2`) for the disposable acceptance invocation. Plain Node import FAIL and transformed import/three prerequisite refusals with zero port calls PASS locally. No kernel rewrite or provider/library upgrade. [Node24 official TypeScript documentation](https://nodejs.org/docs/latest-v24.x/api/typescript.html) distinguishes strip-only unsupported parameter properties and the transformation flag. This fixes the reproduced import defect; actual grounding is still PENDING. The original history creation refusal remains unexplained and is not declared fixed.
