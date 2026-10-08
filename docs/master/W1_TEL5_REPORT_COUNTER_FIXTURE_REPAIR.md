# Customer360 real-stack fixture expectation repair

7222708a332146278ba317d0bc7536604eb9193f is not functionally accepted. Native112255245054/PGlite112255245236/browser112255246117 passed, but actual Supabase112255245579 failed CHECK_REPORT_EXACT_CUSTOMER360_COUNTS.

The fixture expected six coded activities from customer/contact/work creation. It omitted the contract, service and three line creation commands, which also use canonical product_v1_finish_command and append coded activity. The correct isolated account count is eleven (1 customer +2 contacts +1 contract +1 service +3 lines +3 work creates). Case creation/internal notes add no activity body. The reader remains unchanged; the expectation is corrected forward in the acceptance fixture.

The full ten-read family remains pending until the repaired source passes actual Supabase. No failure is attributed to Issue29. No published migration, product behavior, privacy boundary or assertion is relaxed. Exact count equality remains required. Previously accepted source remains b654b1dd02bf9f8a8213fda5a75eac476559c5cf with188 operations and2479 real checks.
