# Unit35 — settled stop recovery clears its stale error

Own follow-up to34, not a new Oier delta. Published285348a6 remains frozen while
CI runs; no cancel/push over active source. Tests3dde4aa8 add one recovery-state
assertion to the existing causal stop-refusal case. Own before35:3FAIL at390/768/
1440, listening alreadyfalse but the preceding failure message still displayed.

Code64b0dfc5866f532e0c33cfd88bb27cce8658e53e adds only setMessage('') in
onend's existing current-session guard. Its old callbacks are retired first;
an old end cannot clear a newer session's state. Actual error keeps its message,
because onerror retires onend. Manual correction/abort/refusal cleanup and text
fallback are retained. No parser, calculation, money, DTO, SQL or permission change.

Own after35:45/45 complete billing interaction cases390/768/1440 PASS,0retry/
skip; targeted lint and separate TypeScriptPASS. Evidence selection-before35 and
selection-after35 under own work/qa-selection29. Overlaps32/34, not additional45.
No model, microphone, commands, AuthDB or hosted acceptance from these fixtures.

Final remote successor source/tree and own CI must be reported in issue67.285
metrics stay285 evidence, never inherited silently. W5's four selected blobs and
87SQL unchanged; prior green platform suites need no local routine rerun for a
single client-state change. Automatic final-source CI retains all normal gates.
Original39458747653 cause/effectUNKNOWN, no original replay; current controlled
invoice trials have their own observations. Budget0EUR, IAwritesOFF, releaseNOT_ACCEPTED.
