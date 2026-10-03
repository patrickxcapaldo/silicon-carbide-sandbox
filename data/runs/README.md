# Article Run Records

Commit one exported JSON run record here for each article result that should be reproducible. Use a descriptive filename, for example:

```text
orbital-thermal-limits-2026-10-03-spacecraft-case.json
```

Records identify the Sandbox version and source commit, module release and contract versions, requested and resolved inputs, full-precision outputs, status, diagnostics, and declared assumptions. Add relevant assumption registry IDs and revisions to `assumptionRegistryRevisions` when the article relies on those data. Do not edit a record after publication; commit a corrected record and cite it as a new revision instead.

Before committing an article record, export it from a clean tagged build (`sourceDirty` must be `false`). Run records may be committed after their source tag, so download the JSON from its GitHub permalink first. Then check out the `sourceCommit` in the record, run `npm ci`, and run `npm run replay -- /path/to/downloaded-record.json` from the repository root. The replay command verifies that both the recorded Sandbox version and exact source commit match the checkout.