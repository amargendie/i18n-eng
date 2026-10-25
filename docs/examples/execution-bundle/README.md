# Example execution bundle (synthetic)

Illustrative `eh.bundle.v1` input for `node bin/eval.mjs record`.

```bash
# record first, then report (same runId as bundle.json)
node bin/eval.mjs record --case NEG-001 --input docs/examples/execution-bundle
node bin/eval.mjs report --run example-neg-001-2026-10-24
```

A machine `PASS` from this synthetic bundle is **illustrative only**—not an independently verified agent execution. Sanitize real traces before ingestion.
