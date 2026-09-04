import { writeFile } from "node:fs/promises";
import { generateSampleData, processRecords } from "../shared/reconpilot";

const sample = generateSampleData();
const result = processRecords(sample.transactions, sample.settlements);
const report = `# Benchmark Rerun\n\n- Records: ${result.benchmark.total}\n- Accuracy vs embedded ground truth: ${(result.benchmark.accuracy * 100).toFixed(1)}%\n- Measured throughput: ${result.benchmark.throughput.toFixed(2)} cases/second\n- Auto-approved: ${result.benchmark.autoApprove}\n- Human review: ${result.benchmark.humanReview}\n- Refused: ${result.benchmark.refused}\n\n## Method\n\nAccuracy is computed by comparing deterministic case outcomes with embedded ground-truth labels. Throughput is measured with wall-clock time around the deterministic processing run. Exceptions are retained rather than removed from the denominator.\n\n## Exceptions\n\n${result.benchmark.exceptions.map((entry) => `- ${entry}`).join("\n")}\n`;
await writeFile("docs/benchmark-rerun.md", report);
console.log(report);
