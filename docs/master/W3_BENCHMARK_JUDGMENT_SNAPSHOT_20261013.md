# W3 benchmark judgment integrity

The benchmark previously read each judgment property during validation and then
again when copying it. A variable accessor or Proxy could supply false scores at
one read and record true scores at another, inflating the resulting pass rate.

The runner now admits exactly four enumerable own boolean data descriptors on
an ordinary record and stores their values once in a frozen judgment. Accessor
scores are rejected without execution; substituted Proxy reads are not used.
Judge failure retains already measured usage and cost instead of erasing spend.

Two negative tests reproduce the parent behavior with a synthetic reference
adapter. After correction, the focused benchmark suite and complete assistant
suite pass. This demonstrates evaluator integrity only: no provider request,
real-model quality, price verification, budget reservation or paid dispatch is
performed. The live evaluator remains blocked until its existing budget and
secure runtime requirements are met. AI writes OFF, release NOT_ACCEPTED.
