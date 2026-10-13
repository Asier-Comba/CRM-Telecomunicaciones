# RAG integer rate and unit must occur together

The selected-document lexical search previously combined an unrelated `600` with `Mbps` elsewhere in the same fragment. It could therefore match a600Mbps query against6Mbps plus600 pages, or swap the units of two rates. Two parent negatives reproduce both failures.

Retrieval now additionally requires every supported integer/rate pair in the question to occur together in the source, accepting compact or spaced Kbps/Mbps/Gbps while preserving b/B. It excludes embedded identifiers and decimal/thousands fragments; it performs no magnitude, scale or decimal conversion. Original term ceiling, lexical ranking, three-citation limit, literal text/page/offset/SHA, authority/version/approval/withdrawal and ten-second budget are unchanged. This is a pair constraint, not service-level semantic inference or a generated answer.

Local validation:793 assistant tests,18 retrieval/deadline tests, global types/lint, parent2 negatives and the existing real two-page PDF bridge. Authority/download seams are synthetic; actual parser runs separately. No bank/registry/read/UI/driver/grounding change is introduced. New own controls require1353 (560+793)/360/native audit2+receipt2/Sup107/valid-PDF/five50_29_21/cleanup4 on this source; no prior PASS is inherited.

RootA047 independently tests the already consumed eligible628; its results remain separate. Original1BC manifest-frame500,916 startup quota and prior failures remain preserved. No live model, indexing, embedding, provider call or commercial AI write is enabled. W4 security/five HIGH and W5 restart/full23 remain open; release NOT_ACCEPTED.
