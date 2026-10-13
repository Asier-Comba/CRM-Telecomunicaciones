# Billing period presentation

Owner: W2. Branch: `codex/w2-billing-period-presentation`.
Base: `ba34197e21bc5394e0c575bb770e33a7278fcce2`, stacked on Customer360 PR39.

The real Supabase capture at W2 source fdb020e / run37848141848 shows readable
currency summaries but raw ISO dates in the financial period caption. This change
uses the existing productDate formatter for the server's as_of/from/to values.
Calendar dates preserve their day; no local clock replaces the server's facts.
Open-ended captions retain their existing labels. Query bounds, totals, currency
separation, financial rules, permissions and invoice commands are unchanged.

The existing financial comparison browser group now observes the actual UI's
cookie response rather than issuing a separate equivalent request. It requires
the complete visible caption computed independently from that response, while
retaining the exact four financial categories, native-currency amounts, overdue
subset explanation and customer/workspace scope. All107 existing groups remain.
No mock, timeout increase, retry or skipped assertion is introduced.

Full exact-source acceptance is pending. Source/compilation alone does not prove
the browser, and older successful sibling groups do not accept a failed suite.
The portability recovery and W3 compatibility gates remain independent. Issue29
continues to fail the full audit with five HIGH entries; no override/downgrade.
Assistant writes remain disabled under Issue10 and pending independent W4 review.

## Local executor and infrastructure handoff

The official Windows Supabase CLI2.119.0, matching CI's pinned version, was
installed in this task's work/tools directory. Its ZIP SHA256 is
db4a6ec26d182408ca605efc0d0d938720bd2d8d39541e79c7d69043897affb9; the independently
verified official checksum manifest SHA256 is
1043eda1b84fb56fbcdff13496edc4804eb1027ff6387e8490562cb9cde89109.
The executable reports2.119.0. No global PATH change, login, hosted link, init,
stack start or account/provider operation occurred. Binaries/credentials are not
committed. Docker Desktop is installed per user and its engine is stopped; WSL2
and HypervisorPresent are confirmed. About3.0–3.3GiB remains available.

The [official local workflow](https://supabase.com/docs/guides/local-development/cli-workflows)
calls for at least7GB allocated to Docker. Starting the complete stack plus app
and browser with the observed headroom is blocked by the resource gate. No
personal process or Docker preference is changed. Real acceptance runs in the
existing disposable Linux CI; the requested persistent local installation is
unfinished. W5's existing enterprise scripts and74-migration future union remain
in W5's ownership, coordinated on PR34; no infrastructure was duplicated.

Next three: verify the entire real suite at this source; inspect the localized
period at1440/768/390; compose accepted W2 product changes with W3 and recheck
history/Auth/permissions. PUBLIC repository risk and missing master snapshots
00–19 remain recorded in the portability checkpoint.
