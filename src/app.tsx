import React, { useState } from "react";
import { useApp } from "ink";
import { ApiKeyCheck } from "./components/api-key-check.js";
import { ModelSelect } from "./components/model-select.js";
import { TestSelect } from "./components/test-select.js";
import { RoundsInput } from "./components/rounds-input.js";
import { CostWarning } from "./components/cost-warning.js";
import { EvaluationProgress } from "./components/evaluation-progress.js";
import { Report } from "./components/report.js";
import type { ORModel, TestId, EvaluationResult, AppStep, CliOptions, RunConfig } from "./types.js";

interface Props {
  options: CliOptions;
}

export function App({ options }: Props) {
  const { exit } = useApp();
  const [step, setStep] = useState<AppStep>("api-check");
  const [models, setModels] = useState<ORModel[]>([]);
  const [selectedModels, setSelectedModels] = useState<ORModel[]>([]);
  const [selectedTests, setSelectedTests] = useState<TestId[]>(
    options.tests ?? [],
  );
  const [rounds, setRounds] = useState(options.rounds ?? 3);
  const [results, setResults] = useState<EvaluationResult[]>([]);
  const [runKey, setRunKey] = useState(0);

  const apiKey = process.env.OPENROUTER_API_KEY ?? "";

  const resolveAfterModelsLoaded = (allModels: ORModel[]) => {
    setModels(allModels);

    if (options.models) {
      const cliModelIds = new Set(options.models);
      const matched = allModels.filter((m) => cliModelIds.has(m.id));
      if (matched.length === 0) {
        // Fall back to interactive selection if no matches
        setStep("model-select");
        return;
      }
      setSelectedModels(matched);

      if (options.tests) {
        if (options.rounds != null) {
          setStep("cost-warning");
        } else {
          setStep("rounds-input");
        }
      } else {
        setStep("test-select");
      }
    } else {
      setStep("model-select");
    }
  };

  switch (step) {
    case "api-check":
      return <ApiKeyCheck onSuccess={resolveAfterModelsLoaded} />;

    case "model-select":
      return (
        <ModelSelect
          models={models}
          onSubmit={(selected) => {
            setSelectedModels(selected);
            if (options.tests) {
              if (options.rounds != null) {
                setStep("cost-warning");
              } else {
                setStep("rounds-input");
              }
            } else {
              setStep("test-select");
            }
          }}
        />
      );

    case "test-select":
      return (
        <TestSelect
          onSubmit={(selected) => {
            setSelectedTests(selected);
            if (options.rounds != null) {
              setStep("cost-warning");
            } else {
              setStep("rounds-input");
            }
          }}
        />
      );

    case "rounds-input":
      return (
        <RoundsInput
          onSubmit={(n) => {
            setRounds(n);
            setStep("cost-warning");
          }}
        />
      );

    case "cost-warning":
      return (
        <CostWarning
          models={selectedModels}
          tests={selectedTests}
          rounds={rounds}
          onConfirm={() => {
            setRunKey((k) => k + 1);
            setStep("running");
          }}
          onCancel={() => exit()}
          onGoTo={(target) => setStep(target)}
        />
      );

    case "running": {
      const runConfig: RunConfig = {
        modelIds: selectedModels.map((m) => m.id),
        testIds: selectedTests,
        rounds,
        parallelAgents: options.parallelAgents,
        parallelTests: options.parallelTests,
      };
      return (
        <EvaluationProgress
          key={runKey}
          apiKey={apiKey}
          models={selectedModels}
          tests={selectedTests}
          rounds={rounds}
          parallelAgents={options.parallelAgents}
          parallelTests={options.parallelTests}
          runConfig={runConfig}
          onComplete={(evalResults) => {
            setResults(evalResults);
            setStep("report");
          }}
        />
      );
    }

    case "report": {
      const reportRunConfig: RunConfig = {
        modelIds: selectedModels.map((m) => m.id),
        testIds: selectedTests,
        rounds,
        parallelAgents: options.parallelAgents,
        parallelTests: options.parallelTests,
      };
      return (
        <Report
          results={results}
          runConfig={reportRunConfig}
          onRerun={() => {
            setRunKey((k) => k + 1);
            setStep("running");
          }}
          onNewRun={() => setStep("cost-warning")}
        />
      );
    }
  }
}
