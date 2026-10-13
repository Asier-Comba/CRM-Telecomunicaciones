# W2 owned consumer: drain before accepting fixture evidence

The native business consumer previously awaited the fixture child's `exit`
event and then parsed stdout. Node can still drain stdout after that event.
A controlled reproduction executes the parent's actual wait statement and
shows it resolving before observed close. This is an independent defect,
not an attribution of any earlier native or browser failure.

The consumer now collects bounded output until observed `close`, and requires
both exit and close code0 with no signal. Late overflow, missing/abnormal exit,
transport error and invalid UTF-8 reject a closed unavailable result. Limits
remain300000ms and1048576bytes. Stderr and original errors are never retained.
The existing closed phase classifier still receives bounded diagnostic output
on failure, without granting successful evidence or serializing private bytes.

Three controlled-event tests verify delayed output, overflow after exit and
invalid termination/transport. These are synthetic tests; the new source still
requires actual resource and business85/86 jobs. W5 constructor, restart,
ownership, image, SQL, permissions and resource cleanup remain unchanged.
No complete23, business absence/quiescence or commercial handler is proved.
AI writes OFF, release NOT_ACCEPTED, fiveHIGH unresolved, provider calls0.
