import React, { useState, useEffect, useRef } from "react";
import { Text, Box } from "ink";
import Spinner from "ink-spinner";
import { runAllEvaluations } from "../tests/runner.js";
import type {
  ORModel,
  TestId,
  EvaluationResult,
  ProgressUpdate,
  RunConfig,
} from "../types.js";
import { buildRerunCommand } from "../types.js";

interface Props {
  apiKey: string;
  models: ORModel[];
  tests: TestId[];
  rounds: number;
  parallelAgents: number;
  parallelTests: number;
  runConfig: RunConfig;
  onComplete: (results: EvaluationResult[]) => void;
}

interface CellState {
  completed: number;
  total: number;
  status: "pending" | "running" | "complete" | "error";
  error?: string;
}

type ProgressState = Record<string, Record<string, CellState>>;

const TEST_LABELS: Record<TestId, string> = {
  "big-five": "Big Five",
  enneagram: "Enneagram",
  mbti: "MBTI",
};

export function EvaluationProgress({
  apiKey,
  models,
  tests,
  rounds,
  parallelAgents,
  parallelTests,
  runConfig,
  onComplete,
}: Props) {
  const [progress, setProgress] = useState<ProgressState>(() => {
    const state: ProgressState = {};
    for (const model of models) {
      state[model.id] = {};
      for (const testId of tests) {
        state[model.id][testId] = {
          completed: 0,
          total: rounds,
          status: "pending",
        };
      }
    }
    return state;
  });
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const handleProgress = (update: ProgressUpdate) => {
      setProgress((prev) => {
        const next = { ...prev };
        const cell = { ...next[update.modelId]?.[update.testId] };
        if (!cell) return prev;

        if (update.status === "complete") {
          cell.completed = update.round;
          cell.status =
            update.round === update.total ? "complete" : "running";
        } else if (update.status === "running") {
          cell.status = "running";
        } else if (update.status === "error") {
          cell.completed = update.round;
          cell.status =
            update.round === update.total ? "error" : "running";
          cell.error = update.error;
        }

        next[update.modelId] = { ...next[update.modelId], [update.testId]: cell };
        return next;
      });
    };

    runAllEvaluations(apiKey, models, tests, rounds, handleProgress, parallelAgents, parallelTests).then(
      onComplete,
    );
  }, []);

  const maxModelNameLen = Math.min(
    30,
    Math.max(...models.map((m) => m.name.length)),
  );

  return (
    <Box flexDirection="column">
      <Text bold color="cyan">Running Evaluations</Text>
      <Box marginTop={1} flexDirection="column">
        {/* Header */}
        <Box>
          <Box width={maxModelNameLen + 2}>
            <Text bold>Model</Text>
          </Box>
          {tests.map((t) => (
            <Box key={t} width={16}>
              <Text bold>{TEST_LABELS[t]}</Text>
            </Box>
          ))}
        </Box>
        {/* Rows */}
        {models.map((model) => (
          <Box key={model.id}>
            <Box width={maxModelNameLen + 2}>
              <Text>
                {model.name.length > maxModelNameLen
                  ? model.name.slice(0, maxModelNameLen - 1) + "…"
                  : model.name}
              </Text>
            </Box>
            {tests.map((testId) => {
              const cell = progress[model.id]?.[testId];
              if (!cell) return null;
              return (
                <Box key={testId} width={16}>
                  {cell.status === "pending" && (
                    <Text dimColor>waiting</Text>
                  )}
                  {cell.status === "running" && (
                    <Text color="yellow">
                      <Spinner type="dots" />{" "}
                      {cell.completed}/{cell.total}
                    </Text>
                  )}
                  {cell.status === "complete" && (
                    <Text color="green">
                      done {cell.completed}/{cell.total}
                    </Text>
                  )}
                  {cell.status === "error" && (
                    <Text color="red">
                      err {cell.completed}/{cell.total}
                    </Text>
                  )}
                </Box>
              );
            })}
          </Box>
        ))}
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Text dimColor>Hint - use this command to rerun this evaluation:</Text>
        <Text dimColor color="cyan">{buildRerunCommand(runConfig)}</Text>
      </Box>
    </Box>
  );
}
