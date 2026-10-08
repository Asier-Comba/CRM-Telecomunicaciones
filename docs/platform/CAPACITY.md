# Capacity and operating cost gates

Start with the documented single-VPS topology and separately managed Supabase.
Add a durable worker or persistent n8n only after its accepted contract requires
one. Select company plans against measured synthetic workload, retention and
regional failure-domain needs; repository defaults do not establish a throughput
or monthly price promise.

| Resource | Current boundary | Company staging acceptance |
| --- | --- | --- |
| App | One process/container; compose CPU/memory limits | Measure peak memory, restart behavior, request latency and health under the agreed concurrency |
| Temporary files | Bounded RAM tmp/cache; read-only root | Verify large accepted operations fit, cleanup occurs and no business durability depends on tmp |
| HTTP upload | Proxy 10 MiB body ceiling; product rules remain authoritative | Check the accepted product limit is no larger than proxy/provider limits; reject oversize payloads safely |
| Supabase connections | App uses HTTP APIs; migration/recovery identities are separate | Measure provider connection/pool utilization and reserve capacity for serialized migrations/recovery |
| Storage | Private canonical buckets; object policy and product intake rules | Measure accepted file size, object growth, egress and retention; test signed/download denial |
| Synthetic recovery | 128 MiB content bound and 10000-object inventory bound | Larger hosted archives need the chosen provider's streamed backup/restore adapter and a separate rehearsal |
| Rate limits | One-host proxy request limit; accepted product/server guards | Measure legitimate bursts and abuse; multiple hosts require an accepted shared limiter |
| n8n | Optional; inactive registered manual/no-op workflow only | Budget persistent PostgreSQL/config volumes, encrypted backups, constrained credentials and actual execution limits |
| AI | Optional; W3 runtime/worker not consumed | Approve model/project quotas and aggregate request/token/latency/error budgets before synthetic live evaluation |
| Logs/backups | Bounded container logs; explicit company retention/key/offsite policy | Measure ingest/archive/egress and prove freshness, restore, access control and deletion policy |

Alert thresholds in `infra/monitoring/alerts.json` are a provider-neutral contract.
Company operators must tune them from staging observations, assign owners and
prove alert delivery. Do not put tenant IDs, emails, names, prompts, document text
or arbitrary request bodies in metrics labels. Cost controls never justify
silencing backup, security, recovery or provider-failure evidence.
