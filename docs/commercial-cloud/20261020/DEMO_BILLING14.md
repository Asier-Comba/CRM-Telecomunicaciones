# Billing — preserve manual correction during dictation

CLAIM6295207633. Isolated proposal froma9e; no integration without Asier review.

Reproduction4fc43cbb: three failures at390/768/1440. While recognition remains
active, editing the textarea changes text/source, but its next onresult replaces
that correction with the old captured base and transcript. This is an actual
component behavior reproduced with controlled SpeechRecognition, not real voice.

The minimal consumer change retires transcript delivery before accepting manual
edits and aborts active recognition. Successful abort restores the text flow; a
browser refusal preserves text, explains the failure and keeps explicit stop
available. Ended recognition retires callbacks/reference. Unmount retires callbacks
even if abort throws. No automatic proposal, draft, issuance or payment is added.
The parser, contracts, transport, money, provider and SQL remain unchanged.

Intermediate53628c39 passed36cases; extended cleanup negative04ba20e6 then failed
three widths: a refused abort was called again during unmount after stop. Both
attempts are preserved. Final853d30cd has its own36prompt controls,12dialog-race
and9intent-race regressions PASS; zero retries/skips/flakies. Targeted lint and
default Next production build with TypeScript44pages PASS on that same source.
Manual450EUR correction produces the corrected reviewed concept/45000minor with
text provenance and no write. The original300EUR+IVA21%+15days example still passes.

[Source-bound evidence](billing14/acceptance.safe.json),
[PAR-133/PAR-134 scoped proposal](billing14/PAR_133_134_partial_evidence.json).
Canonical342 queue unchanged: these are partial row evidence, not full acceptance.
Three reviewed screenshots show only the top of the synthetic review drawer;
mobile concept/amount remain below the frame. No whole-editor visual acceptance.

Real microphone/permission/transcription, hosted authenticated QA, persistence,
security and live model NOT_RUN here. This fixes controlled consumer behavior;
it does not advertise real voice or model acceptance. Business AI writesOFF,
fiveHIGH visible, releaseNOT_ACCEPTED. W5's newly reported a9e deploy is separate
from this proposed patch; existing private CORE window remains required.
