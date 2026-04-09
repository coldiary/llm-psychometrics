#!/usr/bin/env node
import dotenv from "dotenv";
dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ quiet: true });
import React from "react";
import { render } from "ink";
import { App } from "./app.js";
import { fetchModels } from "./api/openrouter.js";
import { bigFiveTest } from "./tests/big-five.js";
import { enneagramTest } from "./tests/enneagram.js";
import { mbtiTest } from "./tests/mbti.js";
import type { CliOptions, TestId } from "./types.js";

const VALID_TESTS = new Set<string>(["big-five", "enneagram", "mbti"]);
const ALL_TESTS = [bigFiveTest, enneagramTest, mbtiTest];

function printHelp() {
  console.log(`
llm-psychometrics - Evaluate AI models against psychometric tests

Usage:
  npx tsx src/index.tsx [options]

Options:
  --models <id,...>          Comma-separated list of model IDs to evaluate
                             (skips interactive model selection)
  --tests <id,...>           Comma-separated list of tests to run
                             Valid: big-five, enneagram, mbti
                             (skips interactive test selection)
  --rounds <n>               Number of evaluation rounds per test
                             (skips interactive rounds input)
  --parallel-agents <n>      Max models evaluated in parallel (default: 3)
  --parallel-tests <n>       Max tests per model in parallel (default: 3)
  --list-models              List all available models from OpenRouter
  --list-tests               List all available psychometric tests
  --help                     Show this help message

Environment:
  OPENROUTER_API_KEY         Required. OpenRouter API key.
                             Can be set in .env or .env.local

Examples:
  npx tsx src/index.tsx
  npx tsx src/index.tsx --models openai/gpt-4o,anthropic/claude-3.5-sonnet --rounds 5
  npx tsx src/index.tsx --tests big-five,mbti --rounds 3 --parallel-agents 5
`);
}

async function listModels(): Promise<void> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error("Error: OPENROUTER_API_KEY environment variable is not set.");
    process.exit(1);
  }
  const models = await fetchModels(apiKey);
  for (const m of models) {
    console.log(`${m.id.padEnd(50)} ${m.name}`);
  }
}

function listTests(): void {
  for (const t of ALL_TESTS) {
    console.log(`${t.id.padEnd(15)} ${t.name} - ${t.description}`);
  }
}

async function parseArgs(): Promise<CliOptions | null> {
  const args = process.argv.slice(2);
  let parallelAgents = 3;
  let parallelTests = 3;
  let models: string[] | null = null;
  let tests: TestId[] | null = null;
  let rounds: number | null = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    if (arg === "--help" || arg === "-h") {
      printHelp();
      return null;
    } else if (arg === "--list-models") {
      await listModels();
      return null;
    } else if (arg === "--list-tests") {
      listTests();
      return null;
    } else if (arg === "--parallel-agents" && next) {
      parallelAgents = Math.max(1, parseInt(next, 10) || 3);
      i++;
    } else if (arg === "--parallel-tests" && next) {
      parallelTests = Math.max(1, parseInt(next, 10) || 3);
      i++;
    } else if (arg === "--models" && next) {
      models = next.split(",").map((s) => s.trim()).filter(Boolean);
      i++;
    } else if (arg === "--tests" && next) {
      const parsed = next.split(",").map((s) => s.trim()).filter(Boolean);
      const invalid = parsed.filter((t) => !VALID_TESTS.has(t));
      if (invalid.length > 0) {
        console.error(`Invalid test(s): ${invalid.join(", ")}`);
        console.error(`Valid tests: big-five, enneagram, mbti`);
        process.exit(1);
      }
      tests = parsed as TestId[];
      i++;
    } else if (arg === "--rounds" && next) {
      const n = parseInt(next, 10);
      if (isNaN(n) || n < 1 || n > 50) {
        console.error("Rounds must be an integer between 1 and 50");
        process.exit(1);
      }
      rounds = n;
      i++;
    }
  }

  return { parallelAgents, parallelTests, models, tests, rounds };
}

const options = await parseArgs();
if (options) {
  render(React.createElement(App, { options }));
}
