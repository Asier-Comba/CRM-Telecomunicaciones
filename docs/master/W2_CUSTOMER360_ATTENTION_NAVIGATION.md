# Customer360 attention navigation

Owner: W2. Branch: `codex/w2-customer360-attention-navigation`.
Base: portability recovery source `fdb020eab14596d68ff9121660ab929626aff539`.

The customer overview duplicated the attention centre's routing logic and omitted
portability. Its "Abrir contexto" link consequently returned to the same customer
page instead of opening the selected portability. The overview now consumes the
existing `attentionHref` mapping. All other registered kinds retain their existing
destinations. The bounded, authorized attention query and its five-row limit are
unchanged; no new data, backend contract, write, permission or provider is added.

The existing real-Supabase portability rejection/history journey additionally
loads the actual customer attention page, requires the just-rejected portability
in that fixture's result, opens its context at desktop/tablet/mobile widths, and
checks the ordinary cookie detail response's exact ID and persisted rejected
state. Original cancellation, history count, masked values, completion CAS and
single-write/read-only recovery assertions remain. No mock, skipped assertion,
retry or increased timeout is introduced.

Acceptance is pending the exact published source's complete CI/Supabase run.
This source is a product candidate; it does not inherit acceptance from its base.
W3 composition is a separate consumer gate. Issue29 retains the full dependency
audit and its five HIGH findings. Issue10/W4 continue to block assistant writes.
The PUBLIC repository recommendation, missing master sources 00–19, Windows
staging limitations and local Docker resource gate remain as recorded in the
portability recovery checkpoint. W5 infrastructure and hosted activation remain
in W5's scope.

Next three: verify the entire retained browser suite on this source; review its
actual Customer360 screenshots at 1440/768/390; compose the accepted change with
W3 and recheck history/Auth/permissions before claiming integration closure.
