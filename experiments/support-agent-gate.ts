import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import {
  RegressionError,
  type Evaluation,
  type ExperimentTaskParams,
  type RunnerContext,
} from "@langfuse/client";

const MODEL_ID = "claude-haiku-4-5-20251001";
const THRESHOLD = 1.0;
const PROMPT_NAME = "country-classifier";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PROMPT_FILE = resolve(REPO_ROOT, "prompts", `${PROMPT_NAME}.md`);

type CountryQuestion = { question: string; imagePath: string };

async function classifyCountry(input: CountryQuestion): Promise<string> {
  const [imageBytes, systemPrompt] = await Promise.all([
    readFile(resolve(REPO_ROOT, input.imagePath)),
    readFile(PROMPT_FILE, "utf-8"),
  ]);

  const { text } = await generateText({
    model: anthropic(MODEL_ID),
    system: systemPrompt.trim(),
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: input.question },
          { type: "file", data: imageBytes, mediaType: "image/png" },
        ],
      },
    ],
    experimental_telemetry: { isEnabled: true },
  });

  return text.trim();
}

async function classifyTask(item: ExperimentTaskParams): Promise<string> {
  return await classifyCountry(item.input as CountryQuestion);
}

async function exactMatch({
  output,
  expectedOutput,
}: {
  output: string;
  expectedOutput?: string;
}): Promise<Evaluation> {
  const passed = output.trim() === (expectedOutput ?? "").trim();
  return {
    name: "exact_match",
    value: passed ? 1 : 0,
    comment: passed ? "match" : `mismatch: got "${output}"`,
  };
}

async function containsExpected({
  output,
  expectedOutput,
}: {
  output: string;
  expectedOutput?: string;
}): Promise<Evaluation> {
  const expected = (expectedOutput ?? "").trim();
  const passed = expected.length > 0 && output.includes(expected);
  return {
    name: "contains_expected",
    value: passed ? 1 : 0,
  };
}

async function avgAccuracy({
  itemResults,
}: {
  itemResults: Array<{ evaluations: Evaluation[] }>;
}): Promise<Evaluation> {
  const scores = itemResults
    .flatMap((item) => item.evaluations)
    .filter((evaluation) => evaluation.name === "contains_expected")
    .map((evaluation) => Number(evaluation.value))
    .filter((score) => Number.isFinite(score));

  const avg =
    scores.length === 0
      ? 0
      : scores.reduce((sum, score) => sum + score, 0) / scores.length;

  return {
    name: "avg_accuracy",
    value: avg,
    comment: `Average accuracy: ${(avg * 100).toFixed(1)}% (n=${scores.length})`,
  };
}

export async function experiment(context: RunnerContext) {
  const result = await context.runExperiment({
    name: "PR gate: country-from-image",
    description: `Anthropic ${MODEL_ID} で画像→国名分類の精度を測定`,
    task: classifyTask,
    evaluators: [exactMatch, containsExpected],
    runEvaluators: [avgAccuracy],
  });

  const accuracy = result.runEvaluations.find(
    (evaluation) => evaluation.name === "avg_accuracy",
  )?.value;

  if (typeof accuracy !== "number" || accuracy < THRESHOLD) {
    throw new RegressionError({
      result,
      metric: "avg_accuracy",
      value: typeof accuracy === "number" ? accuracy : 0,
      threshold: THRESHOLD,
    });
  }

  return result;
}
