# W2 → W3 assistant UI contract

Integration baseline: W1 488647d, W2 PR30. Types: src/features/assistant/w3-ui-contract.ts. This contract is a presentation handoff, not approval to enable AI or execute commands.

Threads: list/search/new/rename/delete remain temporary mounted-session interactions. W3 must provide authenticated durable identity, pagination, creation/update/delete receipts and revocation handling before normal activation. Issue10 remains open. Do not persist raw contacts, fiscal fields, prompts or private responses in browser storage.

Requests carry threadId, messageId, requestId, text and bounded selectedContext references. A reference has exactly kind/id for customer, contract, service, line, opportunity or invoice. No workspace, actor, role, token, contact/fiscal PII or model instructions. Selection is a hint: the server resolves the live user and active membership and independently authorizes every reference.

Messages support text, table, metric, entity card, partiality, navigation and proposed-action blocks. Every fact-bearing metric/entity must reference sources. Sources carry a display label, asOf and complete/partial/unavailable coverage; missing evidence is never a zero. Tables use bounded primitive cells and allowlisted columns. Render text as text; no arbitrary HTML or href supplied by a model. Navigation maps validated kind/id through the application's routes.

Streaming: message_start → zero or more progress/block/sources events → one terminal result or safe error. Each event must match its request/message identity. W3 must add closed runtime validation, frame/byte/count/time bounds and source authorization before attaching a live stream. Replacing the active thread, cancelling or a newer request prevents late events from modifying the current message. Cancel stops reads; it is never proof that a submitted write rolled back. Retry reads uses a new requestId and the same user text; command retry retains its command_id and immutable reviewed payload.

Proposals are executed=false and requiresConfirmation=true with proposalId and expiry. The UI displays proposal, sources, scope/partiality and affected records for review. Confirmation requires a fresh authorized server lookup. The model never writes directly or fabricates a receipt. Progress distinguishes reading/reviewing/awaiting_confirmation/executing. Only a verified normal-command receipt can show a saved result; an unavailable/denied/cancelled read cannot imply a mutation.

Invoice context entry exists from Customer360. It currently opens the disabled preparation shell without invoking a provider. Required flow: source text/audio → normalized proposal → billing invoice.propose returns requires_review=true/saved=false → user reviews → save draft → separate explicit issue confirmation. Neither transcription nor proposal allocates an invoice number or shows “Factura creada”.

Synthetic preview keeps its deterministic read-only response presenter. Integrated-local assistant presents the thread/context/composer shell with sending and action confirmation disabled pending W3 and durable history acceptance. No model selection, provider call, semantic implementation or W1 security changes are introduced here.

Acceptance before activation: real Auth/member revocation; bounded validated stream; stale events ignored after cancel/thread change; safe sources and missing coverage; receipt verified after confirmation; no raw PII in storage/URL/telemetry; accessible desktop/mobile controls; durable thread ownership; independent W4 review. LOCAL_INTEGRATION_SAFE, STAGE_READY and PROD_READY remain distinct.
