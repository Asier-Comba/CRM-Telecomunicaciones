# W2 issuer presentation and browser diagnostic checkpoint

Parent: 250adfef067134ea85f666fcd814d1071923a766. Supabase local acceptance run 37325418835: 801 W1 backend checks PASS; 33 prior product browser groups PASS; five newly added portfolio/fiscal groups TIMEOUT. Teardown and browser private-value boundary PASS. The new cases are not accepted and do not increase the verified baseline of 74/90 operations or 53/67 writes.

This checkpoint replaces the preview issuer in the integrated invoice editor with the authorized fiscal profile (blank when absent), and refreshes fiscal configuration before closing a successful issuer/customer fiscal editor. It adds safe literal action indices for each failing browser group, without logging request input, personal data, provider errors or credentials. Captures cover ten screen families and critical customer, task and invoice dialogs at desktop/tablet/mobile sizes. Draft captures do not save or issue invoices.

Validation for this checkpoint remains pending fresh CI. Parent lint, types, 245 Node tests and build PASS; full npm audit retains five inherited high findings (Issue 29). No release, production, human screenshot QA or whole-product parity acceptance is claimed.

The contract customer selector now declares its explicit accessible label: its wrapping label previously included the text of every customer option, so an exact user-facing label lookup could not resolve it. Subsequent portfolio checks reload the page after failure and lose the preceding search context; the first failure must be resolved before their own state transitions can be assessed.
