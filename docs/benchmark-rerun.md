# Benchmark Rerun

- Records: 64
- Accuracy vs embedded ground truth: 100.0%
- Measured throughput: 2749.99 cases/second
- Auto-approved: 51
- Human review: 3
- Refused: 10

## Method

Accuracy is computed by comparing deterministic case outcomes with embedded ground-truth labels. Throughput is measured with wall-clock time around the deterministic processing run. Exceptions are retained rather than removed from the denominator.

## Exceptions

- case_0001: Settlement evidence is missing or cannot be resolved.
- case_0012: Settlement evidence is missing or cannot be resolved.
- case_0014: Settlement evidence is missing or cannot be resolved.
- case_0018: Deterministic risk signals require a human control owner.
- case_0023: Settlement evidence is missing or cannot be resolved.
