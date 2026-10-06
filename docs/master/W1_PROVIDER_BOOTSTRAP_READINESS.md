# Backend provider and bootstrap prerequisites

Machine contracts: `contracts/provider-requirements.json` and `contracts/backend-bootstrap-requirements.json`. They contain names and requirements only. No credentials, live connections, configured-health claims or AI tool registrations are created.

Human business email, Supabase Auth transactional email and CRM customer outbound email have distinct registered identities. Auth SMTP belongs in Supabase Auth settings; CRM outbound requires its own authenticated adapter and durable send behavior. Sender-domain verification and SPF/DKIM/DMARC are prerequisites. Configuring Auth SMTP never configures CRM send.

Enter secret values directly into the appropriate Supabase/deployment/GitHub environment secret store. For example `OPENAI_API_KEY` belongs in the server deployment secret store; `SMTP_PASSWORD` belongs in Supabase Auth's SMTP configuration. Never paste values into chat. No API response, browser bundle, audit or log may contain them.

n8n accepts the registered integration/workflow intent only; no browser-submitted URL executes a workflow. AI configuration is a W3-owned model-policy/reference seam; W1 registers no AI writes. Telecom sync remains provider-neutral and offline. Environment syntax does not establish provider health.

Fresh reconstruction uses repository config, all forward migrations, explicit privilege manifest, private buckets and environment contracts. Synthetic seeds are opt-in and disposable only. Production encrypted processing remains fail-closed until a registered KMS/provider, scoped worker and canonical domain adapters exist. W4/W5 own production bootstrap/release approval. Normal product backend freeze has not yet been declared.
