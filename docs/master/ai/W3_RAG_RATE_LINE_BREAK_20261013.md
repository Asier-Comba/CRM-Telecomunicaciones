# Rate pairs across document line breaks

Two parent negatives reproduce a valid `600\nMbps` source being missed and a query with that line break incorrectly matching `6 Mbps` plus an unrelated `600` page count. The existing integer/rate pair constraint now accepts CR, LF and CRLF as whitespace between the number and the supported unit, equally in the question and each admitted fragment.

Original citation text, offsets, page and digest stay unchanged. Bit versus byte rates, decimal/thousand/embedded-ID exclusion, magnitude/unit conversion refusal, three-citation maximum, same-document coverage and final authority/version/approval checks remain intact. It does not join separate pages into a rate pair or infer service-level relationships.

Local validation:798 assistant tests, global types and lint with zero warnings. Line-break source/extraction adapters are synthetic. No claim of actual Auth/Storage, approved document ingestion/index, or live model evaluation. New own controls require1358 (560+798)/360/native audit2+receipt2/Sup107/valid-PDF/five50_29_21/cleanup4; results cannot be inherited from69F. Root a65's 12 Supabase failures take priority; this correction is preserved as a separate checkpoint.

W4 security/five HIGH/full23/W5 resource business-consumer/provider/durable quotas remain pending. AI writes OFF; release NOT_ACCEPTED.
