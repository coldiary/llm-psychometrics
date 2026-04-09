import React from "react";
import { Text, Box, useInput } from "ink";
import { estimateCost } from "../api/openrouter.js";
import { bigFiveTest } from "../tests/big-five.js";
import { enneagramTest } from "../tests/enneagram.js";
import { mbtiTest } from "../tests/mbti.js";
import type { ORModel, TestId, TestDefinition, AppStep } from "../types.js";

const TEST_MAP: Record<TestId, TestDefinition> = {
  "big-five": bigFiveTest,
  enneagram: enneagramTest,
  mbti: mbtiTest,
};

interface Props {
  models: ORModel[];
  tests: TestId[];
  rounds: number;
  onConfirm: () => void;
  onCancel: () => void;
  onGoTo: (step: AppStep) => void;
}

export function CostWarning({ models, tests, rounds, onConfirm, onCancel, onGoTo }: Props) {
  const totalCalls = models.length * tests.length * rounds;

  let totalLow = 0;
  let totalHigh = 0;
  const breakdown: Array<{ model: string; low: number; high: number }> = [];

  for (const model of models) {
    let modelLow = 0;
    let modelHigh = 0;
    for (const testId of tests) {
      const test = TEST_MAP[testId];
      const low = estimateCost(
        model,
        test.estimatedInputTokens,
        test.estimatedOutputTokens,
      );
      modelLow += low * rounds;
      modelHigh += low * 2 * rounds;
    }
    totalLow += modelLow;
    totalHigh += modelHigh;
    breakdown.push({ model: model.name, low: modelLow, high: modelHigh });
  }

  useInput((input) => {
    const key = input.toLowerCase();
    if (key === "y") {
      onConfirm();
    } else if (key === "n" || key === "q") {
      onCancel();
    } else if (key === "m") {
      onGoTo("model-select");
    } else if (key === "t") {
      onGoTo("test-select");
    } else if (key === "r") {
      onGoTo("rounds-input");
    }
  });

  return (
    <Box flexDirection="column">
      <Text bold color="yellow">Cost Estimate</Text>
      <Box flexDirection="column" marginTop={1}>
        <Text>Models: {models.length}</Text>
        <Text>Tests: {tests.length}</Text>
        <Text>Rounds per test: {rounds}</Text>
        <Text>Total API calls: {totalCalls}</Text>
      </Box>
      <Box flexDirection="column" marginTop={1}>
        {breakdown.map((b) => (
          <Text key={b.model}>
            <Text dimColor>{b.model}:</Text> ${b.low.toFixed(4)} – ${b.high.toFixed(4)}
          </Text>
        ))}
      </Box>
      <Box marginTop={1}>
        <Text bold>
          Estimated total cost: <Text color="yellow">${totalLow.toFixed(4)} – ${totalHigh.toFixed(4)}</Text>
        </Text>
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Text bold color="yellow">
          (y) Proceed  (n) Cancel
        </Text>
        <Text dimColor>
          (m) Change models  (t) Change tests  (r) Change rounds
        </Text>
      </Box>
    </Box>
  );
}
