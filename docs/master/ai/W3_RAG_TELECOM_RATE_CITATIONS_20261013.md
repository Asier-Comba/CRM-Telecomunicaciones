# Telecom rate queries retain exact document citations

The lexical retrieval boundary previously missed a selected PDF's `600 Mbps` text when asked for `600Mbps`. Lowercasing also made compact `600MBps` match `600Mbps`, erasing the bit/byte distinction. Two parent negatives reproduce these cases with controlled authority/download/extraction adapters; no actual data incident is claimed.

Tokenization now recognizes complete Kbps/Mbps/Gbps rate tokens, including their compact integer prefix. It splits only that supported token and preserves lower-case b versus upper-case B. Arbitrary embedded identifiers remain whole; it does not convert magnitude or unit scales. Exact source text, page, Unicode offsets and SHA citations are unchanged. Authority, approval, version, withdrawal, ten-second budget and three-citation bound remain unchanged.

Two added tests cover compact/separated rate forms, bit/byte case, different numbers/scales and opaque embedded identifiers. The existing local physical PDF bridge additionally requires compact `600Mbps` to produce the same page-one citation as `600 Mbps`, while rejecting `600MBps`, `601Mbps` and `600Gbps`. It reuses the protected ROOT parser; no parser copy or resource is created.

Local validation requires 787 assistant tests, 16 focused retrieval/deadline tests, global types/lint and the real two-page PDF bridge. The PDF parser actually runs locally; its authority/download adapters are synthetic. New own controls require 1,347 tests (560+787), 360 browser checks, driver-audit observations, native PostgreSQL and Supabase107/five50_29_21/cleanup4/valid-PDF transport on the exact committed source. Prior results are not inherited.

This is selected-document lexical matching, not numeric inference, unit conversion, an index, a generated answer or live-model evaluation. Approved review/index integration, W4 independent security, W5 owned restart, full23 and durable budgets remain pending. AI writes OFF; five HIGH alerts remain; release NOT_ACCEPTED.
