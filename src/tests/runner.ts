import {
  chatCompletion,
  calculateCost,
  parseJsonResponse,
} from "../api/openrouter.js";
import { bigFiveTest } from "./big-five.js";
import { enneagramTest } from "./enneagram.js";
import { mbtiTest } from "./mbti.js";
import type {
  ORModel,
  TestId,
  TestDefinition,
  EvaluationResult,
  ScoredRound,
  Contradiction,
  ProgressUpdate,
} from "../types.js";

const TEST_MAP: Record<TestId, TestDefinition> = {
  "big-five": bigFiveTest,
  enneagram: enneagramTest,
  mbti: mbtiTest,
};

class Semaphore {
  private queue: Array<() => void> = [];
  private running = 0;

  constructor(private max: number) {}

  async acquire(): Promise<void> {
    if (this.running < this.max) {
      this.running++;
      return;
    }
    return new Promise<void>((resolve) => {
      this.queue.push(() => {
        this.running++;
        resolve();
      });
    });
  }

  release(): void {
    this.running--;
    const next = this.queue.shift();
    if (next) next();
  }
}

function computeConfidence(
  rounds: ScoredRound[],
  scoreRange: { min: number; max: number },
): number | null {
  if (rounds.length < 2) return null;

  const factors = Object.keys(rounds[0].scores);
  const range = scoreRange.max - scoreRange.min;

  // Score stability: how much do raw scores vary relative to the scale range
  const normalizedStdDevs = factors.map((factor) => {
    const values = rounds.map((r) => r.scores[factor]);
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const variance =
      values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
    const stdDev = Math.sqrt(variance);
    return stdDev / range;
  });

  const avgNormalizedStdDev =
    normalizedStdDevs.reduce((s, v) => s + v, 0) / normalizedStdDevs.length;
  const scoreConfidence = Math.max(0, Math.min(100, (1 - avgNormalizedStdDev * 2) * 100));

  // Classification consistency: what % of rounds agree on the majority classification
  const counts: Record<string, number> = {};
  for (const r of rounds) {
    counts[r.classification] = (counts[r.classification] ?? 0) + 1;
  }
  const majorityCount = Math.max(...Object.values(counts));
  const classificationConfidence = (majorityCount / rounds.length) * 100;

  // Take the minimum — unstable classifications should tank confidence
  // even when raw scores barely move
  return Math.round(Math.min(scoreConfidence, classificationConfidence));
}

function detectContradictions(
  rounds: ScoredRound[],
  testId: TestId,
): Contradiction[] {
  const contradictions: Contradiction[] = [];
  if (rounds.length < 2) return contradictions;

  for (let i = 0; i < rounds.length; i++) {
    for (let j = i + 1; j < rounds.length; j++) {
      const a = rounds[i];
      const b = rounds[j];

      if (testId === "big-five") {
        for (const factor of Object.keys(a.scores)) {
          const diff = Math.abs(a.scores[factor] - b.scores[factor]);
          if (diff > 8) {
            contradictions.push({
              factor,
              rounds: [i + 1, j + 1],
              scores: [a.scores[factor], b.scores[factor]],
              severity: diff > 12 ? "significant" : "mild",
            });
          }
        }
      } else if (testId === "enneagram") {
        if (a.classification !== b.classification) {
          const aTop = a.classification;
          const bScoresSorted = Object.entries(b.scores).sort(
            ([, x], [, y]) => y - x,
          );
          const bRank = bScoresSorted.findIndex(([k]) => k === aTop);
          contradictions.push({
            factor: "Top Type",
            rounds: [i + 1, j + 1],
            scores: [0, 0],
            severity: bRank <= 1 ? "mild" : "significant",
          });
        }
      } else if (testId === "mbti") {
        if (a.classification !== b.classification) {
          let flips = 0;
          for (let c = 0; c < 4; c++) {
            if (a.classification[c] !== b.classification[c]) flips++;
          }
          contradictions.push({
            factor: `Type (${a.classification} vs ${b.classification})`,
            rounds: [i + 1, j + 1],
            scores: [0, 0],
            severity: flips >= 2 ? "significant" : "mild",
          });
        }
      }
    }
  }

  return contradictions;
}

async function runTestForModel(
  apiKey: string,
  model: ORModel,
  testId: TestId,
  rounds: number,
  onProgress: (update: ProgressUpdate) => void,
): Promise<EvaluationResult> {
  const test = TEST_MAP[testId];
  const prompt = test.buildPrompt();
  const scoredRounds: ScoredRound[] = [];
  let totalCost = 0;

  for (let r = 0; r < rounds; r++) {
    onProgress({
      modelId: model.id,
      testId,
      round: r + 1,
      total: rounds,
      status: "running",
    });

    try {
      const response = await chatCompletion(apiKey, model.id, prompt);
      const parsed = parseJsonResponse(
        response.content,
        test.expectedResponseCount,
      );

      if (!parsed) {
        onProgress({
          modelId: model.id,
          testId,
          round: r + 1,
          total: rounds,
          status: "error",
          error: "Failed to parse response",
        });
        continue;
      }

      const scored = test.score(parsed);
      scoredRounds.push({
        round: r + 1,
        scores: scored.scores,
        classification: scored.classification,
      });

      totalCost += calculateCost(
        model,
        response.promptTokens,
        response.completionTokens,
      );

      onProgress({
        modelId: model.id,
        testId,
        round: r + 1,
        total: rounds,
        status: "complete",
      });
    } catch (err) {
      onProgress({
        modelId: model.id,
        testId,
        round: r + 1,
        total: rounds,
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const averageScores: Record<string, number> = {};
  if (scoredRounds.length > 0) {
    const factors = Object.keys(scoredRounds[0].scores);
    for (const factor of factors) {
      const sum = scoredRounds.reduce((s, r) => s + r.scores[factor], 0);
      averageScores[factor] =
        Math.round((sum / scoredRounds.length) * 100) / 100;
    }
  }

  const classificationCounts: Record<string, number> = {};
  for (const sr of scoredRounds) {
    classificationCounts[sr.classification] =
      (classificationCounts[sr.classification] ?? 0) + 1;
  }
  const classification =
    Object.entries(classificationCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ??
    "N/A";

  return {
    modelId: model.id,
    modelName: model.name,
    testId,
    rounds: scoredRounds,
    averageScores,
    classification,
    contradictions: detectContradictions(scoredRounds, testId),
    confidence: computeConfidence(scoredRounds, test.scoreRange),
    totalCost,
  };
}

export async function runAllEvaluations(
  apiKey: string,
  models: ORModel[],
  testIds: TestId[],
  rounds: number,
  onProgress: (update: ProgressUpdate) => void,
  parallelAgents: number = 3,
  parallelTests: number = 3,
): Promise<EvaluationResult[]> {
  const agentSemaphore = new Semaphore(parallelAgents);

  const allResults: EvaluationResult[][] = await Promise.all(
    models.map(async (model) => {
      await agentSemaphore.acquire();
      try {
        const testSemaphore = new Semaphore(parallelTests);
        const modelResults = await Promise.all(
          testIds.map(async (testId) => {
            await testSemaphore.acquire();
            try {
              return await runTestForModel(
                apiKey,
                model,
                testId,
                rounds,
                onProgress,
              );
            } finally {
              testSemaphore.release();
            }
          }),
        );
        return modelResults;
      } finally {
        agentSemaphore.release();
      }
    }),
  );

  return allResults.flat();
}
