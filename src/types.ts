export type TestId = "big-five" | "enneagram" | "mbti";

export interface ORModel {
  id: string;
  name: string;
  context_length: number;
  pricing: { prompt: string; completion: string };
}

export interface RoundResult {
  round: number;
  rawResponses: number[];
  promptTokens: number;
  completionTokens: number;
  cost: number;
}

export interface ScoredRound {
  round: number;
  scores: Record<string, number>;
  classification: string;
}

export interface Contradiction {
  factor: string;
  rounds: [number, number];
  scores: [number, number];
  severity: "mild" | "significant";
}

export interface EvaluationResult {
  modelId: string;
  modelName: string;
  testId: TestId;
  rounds: ScoredRound[];
  averageScores: Record<string, number>;
  classification: string;
  contradictions: Contradiction[];
  confidence: number | null; // 0-100%, null if only 1 round
  totalCost: number;
}

export interface ProgressUpdate {
  modelId: string;
  testId: TestId;
  round: number;
  total: number;
  status: "running" | "complete" | "error";
  error?: string;
}

export type AppStep =
  | "api-check"
  | "model-select"
  | "test-select"
  | "rounds-input"
  | "cost-warning"
  | "running"
  | "report";

export interface CliOptions {
  parallelAgents: number;
  parallelTests: number;
  models: string[] | null;
  tests: TestId[] | null;
  rounds: number | null;
}

export interface RunConfig {
  modelIds: string[];
  testIds: TestId[];
  rounds: number;
  parallelAgents: number;
  parallelTests: number;
}

export function buildRerunCommand(config: RunConfig): string {
  const parts = ["npx tsx src/index.tsx"];
  parts.push(`--models ${config.modelIds.join(",")}`);
  parts.push(`--tests ${config.testIds.join(",")}`);
  parts.push(`--rounds ${config.rounds}`);
  if (config.parallelAgents !== 3) {
    parts.push(`--parallel-agents ${config.parallelAgents}`);
  }
  if (config.parallelTests !== 3) {
    parts.push(`--parallel-tests ${config.parallelTests}`);
  }
  return parts.join(" ");
}

export interface TestDefinition {
  id: TestId;
  name: string;
  description: string;
  buildPrompt: () => string;
  score: (responses: number[]) => { scores: Record<string, number>; classification: string };
  expectedResponseCount: number;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  scoreRange: { min: number; max: number }; // per-factor score range for confidence calc
}
