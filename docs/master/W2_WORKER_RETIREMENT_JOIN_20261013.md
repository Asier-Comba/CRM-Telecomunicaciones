# W2: preserve the owned connection retirement

The worker connection driver previously cleared its close callback before
awaiting the owned session close. A concurrent `closeWorker` could consequently
resolve while that retirement was pending. If retirement rejected, a subsequent
close could also resolve and lose the failed cleanup observation.

Retirement now retains one promise. Every close joins that same promise, and its
rejection remains a closed `DURABLE_NATIVE_WORKER_CONNECTION_UNAVAILABLE` failure.
The callback is invoked once. Private error material is not returned.

Two controlled session-adapter tests reproduce both defects on the parent and
verify waiting, retained rejection and single invocation after the correction.
These are synthetic tests, not independent PostgreSQL disappearance evidence.
The existing physical connection and owner cleanup controls remain required on
the new source. No resource constructor, restart, SQL, permission, timeout or
W5 source changes are introduced. Full 23-scenario durability remains NOT_RUN;
commercial AI writes remain OFF and release remains NOT_ACCEPTED.
