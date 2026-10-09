# Product AI v2 checkpoint B — candidate

Base W2 c632f0a; W1 inventory182283f/accepted e9d8bcf read live. PR9 remains Draft; Issue10 OPEN. New branch does not merge obsolete assistant product/schema history.

Implemented server-only OpenAI Responses factory with provider-neutral createTurn/streamTurn/cancel/usage, fixed provider endpoint, store:false, closed structured output, byte cap, timeout, cancellation, safe failure codes and refusal handling. Model defaults gpt-6.1-sol, configurable OPENAI_MODEL. OPENAI_API_KEY absent => not_configured. OPENAI_PROJECT_ID optional; AI_PROVIDER=openai only registered. No live call performed; transport tests are synthetic. Official current Responses structured-output/streaming/model docs checked 2026-10-06.

30 modern safe local read capability candidates derive directly from current W2-consumed W1 collection/report contracts. Executable parser and adapter boundary use existing authorized W2 server services and exact DTO parsers, with fresh actor/workspace/epoch/role checks around awaits. DAG max8nodes, closed filter pairs, raw IDs forbidden, offered server handles only, dependency selection only from complete single matching entity. Unsupported220-operation inventory remains DENIED (JSON Schema false); inventory is not registration. Newer location/equipment contracts require W2 consumption and minimized adapters before enablement.

Invoice intent flow uses exact decimal minor units/quantity thousandths/rate basis points and existing invoice.propose. Missing customer/tax/currency/series/date clarifies. Backend totals verified. No invoice number from model; review saved:false; issuing requires a separate confirmation. No draft persistence/write currently enabled.

Current limitations: no application route/provider UI wiring yet; no new thread migration, physical durable adapter/dispatcher or native races. New local read adapters are candidate libraries, not an enabled production feature. Semantic turn and UI v2 composer are implemented, with source-backed plain-text tables and immutable runtime evidence. No remote UI/live model/browser end-to-end claim. Stage/prod and effects disabled. External sends unavailable.

Next checkpoint: wire typed planner and response blocks to gated current-cookie routes; implement thread persistence and durable DB adapter with forward-only migrations plus native races; W4 independent acceptance remains required.
