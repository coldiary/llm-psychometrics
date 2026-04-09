import React, { useState } from "react";
import { Text, Box, Newline, useInput, useApp } from "ink";
import { writeFileSync } from "fs";
import type { EvaluationResult, TestId, RunConfig } from "../types.js";
import { buildRerunCommand } from "../types.js";

interface Props {
  results: EvaluationResult[];
  runConfig: RunConfig;
  onRerun: () => void;
  onNewRun: () => void;
}

const TEST_LABELS: Record<TestId, string> = {
  "big-five": "Big Five (IPIP-50)",
  enneagram: "Enneagram (OEPS v1)",
  mbti: "MBTI (OEJTS 1.2)",
};

function rep(char: string, count: number): string {
  return char.repeat(Math.max(0, Math.round(count)));
}

function levelColor(level: string): string {
  return level === "High" ? "green" : level === "Low" ? "red" : "yellow";
}

function bigFiveLevel(score: number): string {
  return score >= 38 ? "High" : score >= 22 ? "Avg" : "Low";
}

function BigFiveReport({ result }: { result: EvaluationResult }) {
  const factors = [
    "Extraversion",
    "Agreeableness",
    "Conscientiousness",
    "Emotional Stability",
    "Openness",
  ];
  return (
    <Box flexDirection="column" marginLeft={2} marginTop={1}>
      {factors.map((factor) => {
        const score = result.averageScores[factor] ?? 0;
        const level = bigFiveLevel(score);
        const pct = Math.round(((score - 10) / 40) * 100);
        const barWidth = 25;
        const filled = Math.round((pct / 100) * barWidth);
        const bar = rep("━", filled);
        const empty = rep("─", barWidth - filled);
        return (
          <Box key={factor}>
            <Box width={22}>
              <Text>{factor}</Text>
            </Box>
            <Text dimColor>{"["}</Text>
            <Text color={levelColor(level)}>{bar}</Text>
            <Text dimColor>{empty}{"]"}</Text>
            <Text> {score.toFixed(1)}</Text>
            <Text dimColor>/50 </Text>
            <Text bold color={levelColor(level)}>{level}</Text>
          </Box>
        );
      })}
    </Box>
  );
}

function EnneagramReport({ result }: { result: EvaluationResult }) {
  const sorted = Object.entries(result.averageScores).sort(
    ([, a], [, b]) => b - a,
  );
  const topScore = sorted[0]?.[1] ?? 1;

  return (
    <Box flexDirection="column" marginLeft={2} marginTop={1}>
      {sorted.map(([type, score], i) => {
        const isTop = i === 0;
        const barWidth = 15;
        const filled = Math.round((score / topScore) * barWidth);
        const bar = rep("━", filled);
        const empty = rep("─", barWidth - filled);
        const shortType = type.replace(/ - .*/, "");
        const typeName = type.replace(/Type \d - /, "");
        return (
          <Box key={type}>
            <Box width={8}>
              <Text bold={isTop} color={isTop ? "green" : undefined}>
                {shortType}
              </Text>
            </Box>
            <Text dimColor>{"["}</Text>
            <Text color={isTop ? "green" : "white"}>{bar}</Text>
            <Text dimColor>{empty}{"]"}</Text>
            <Text bold={isTop}> {score.toFixed(1)}</Text>
            <Text dimColor>/20 </Text>
            <Text dimColor={!isTop} color={isTop ? "green" : undefined}>
              {typeName}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
}

function MBTIReport({ result }: { result: EvaluationResult }) {
  const dimensions = [
    { key: "Introversion-Extraversion", labels: ["I", "E"] as const, center: 24 },
    { key: "Sensing-Intuition", labels: ["S", "N"] as const, center: 24 },
    { key: "Feeling-Thinking", labels: ["F", "T"] as const, center: 24 },
    { key: "Judging-Perceiving", labels: ["J", "P"] as const, center: 24 },
  ];
  const barHalf = 12;

  return (
    <Box flexDirection="column" marginLeft={2} marginTop={1}>
      {dimensions.map((dim) => {
        const score = result.averageScores[dim.key] ?? 0;
        const letter = score > dim.center ? dim.labels[1] : dim.labels[0];
        const normalized = (score - dim.center) / (48 - dim.center);
        const clamped = Math.max(-1, Math.min(1, normalized));

        const leftFilled = clamped < 0 ? Math.round(Math.abs(clamped) * barHalf) : 0;
        const rightFilled = clamped > 0 ? Math.round(clamped * barHalf) : 0;

        const leftEmpty = rep("─", barHalf - leftFilled);
        const leftFill = rep("━", leftFilled);
        const rightFill = rep("━", rightFilled);
        const rightEmpty = rep("─", barHalf - rightFilled);

        const leftColor = clamped < 0 ? "cyan" : undefined;
        const rightColor = clamped > 0 ? "cyan" : undefined;

        return (
          <Box key={dim.key}>
            <Box width={3}>
              <Text bold={clamped < 0} color={leftColor}>{dim.labels[0]}</Text>
            </Box>
            <Text dimColor>{leftEmpty}</Text>
            <Text color="cyan">{leftFill}</Text>
            <Text dimColor>│</Text>
            <Text color="cyan">{rightFill}</Text>
            <Text dimColor>{rightEmpty}</Text>
            <Box width={3}>
              <Text bold={clamped > 0} color={rightColor}> {dim.labels[1]}</Text>
            </Box>
            <Text bold color="cyan"> [{letter}]</Text>
            <Text dimColor> {score.toFixed(1)}</Text>
          </Box>
        );
      })}
    </Box>
  );
}

function ContradictionsSection({ result }: { result: EvaluationResult }) {
  if (result.contradictions.length === 0) return null;
  return (
    <Box flexDirection="column" marginLeft={2} marginTop={1}>
      <Text color="yellow" bold>Contradictions detected:</Text>
      {result.contradictions.map((c, i) => (
        <Text key={i} color={c.severity === "significant" ? "red" : "yellow"}>
          [{c.severity}] {c.factor} — rounds {c.rounds[0]} vs {c.rounds[1]}
          {c.scores[0] !== 0 ? ` (${c.scores[0]} vs ${c.scores[1]})` : ""}
        </Text>
      ))}
    </Box>
  );
}

function RoundDetails({ result }: { result: EvaluationResult }) {
  if (result.rounds.length <= 1) return null;
  return (
    <Box flexDirection="column" marginLeft={2} marginTop={1}>
      <Text dimColor>Round-by-round classifications:</Text>
      {result.rounds.map((r) => (
        <Text key={r.round} dimColor>
          Round {r.round}: {r.classification}
        </Text>
      ))}
    </Box>
  );
}

function generatePlainTextReport(results: EvaluationResult[], runConfig: RunConfig): string {
  const lines: string[] = [];
  const sep = "=".repeat(50);
  lines.push(sep);
  lines.push("       Psychometric Evaluation Report");
  lines.push(sep);
  lines.push(`       ${new Date().toISOString()}`);
  lines.push("");

  const byModel = new Map<string, EvaluationResult[]>();
  for (const r of results) {
    const existing = byModel.get(r.modelId) ?? [];
    existing.push(r);
    byModel.set(r.modelId, existing);
  }

  for (const [, modelResults] of byModel) {
    lines.push(`-- ${modelResults[0].modelName} --`);
    lines.push("");

    for (const result of modelResults) {
      lines.push(`  ${TEST_LABELS[result.testId]}`);
      const confStr =
        result.confidence !== null ? ` (confidence: ${result.confidence}%)` : "";
      lines.push(`  Classification: ${result.classification}${confStr}`);

      if (result.testId === "big-five") {
        for (const factor of ["Extraversion", "Agreeableness", "Conscientiousness", "Emotional Stability", "Openness"]) {
          const score = result.averageScores[factor] ?? 0;
          const level = score >= 38 ? "High" : score >= 22 ? "Average" : "Low";
          lines.push(`    ${factor.padEnd(22)} ${score.toFixed(1)}/50 (${level})`);
        }
      } else if (result.testId === "enneagram") {
        const sorted = Object.entries(result.averageScores).sort(([, a], [, b]) => b - a);
        for (const [type, score] of sorted) {
          lines.push(`    ${type.padEnd(32)} ${score.toFixed(1)}/20`);
        }
      } else if (result.testId === "mbti") {
        const dims = [
          { key: "Introversion-Extraversion", labels: ["I", "E"], center: 24 },
          { key: "Sensing-Intuition", labels: ["S", "N"], center: 24 },
          { key: "Feeling-Thinking", labels: ["F", "T"], center: 24 },
          { key: "Judging-Perceiving", labels: ["J", "P"], center: 24 },
        ];
        for (const dim of dims) {
          const score = result.averageScores[dim.key] ?? 0;
          const letter = score > dim.center ? dim.labels[1] : dim.labels[0];
          lines.push(`    ${dim.key.padEnd(28)} [${letter}] (${score.toFixed(1)})`);
        }
      }

      if (result.contradictions.length > 0) {
        lines.push("    Contradictions:");
        for (const c of result.contradictions) {
          const scoreStr = c.scores[0] !== 0 ? ` (${c.scores[0]} vs ${c.scores[1]})` : "";
          lines.push(`      [${c.severity}] ${c.factor} — rounds ${c.rounds[0]} vs ${c.rounds[1]}${scoreStr}`);
        }
      }

      if (result.rounds.length > 1) {
        lines.push("    Round-by-round:");
        for (const r of result.rounds) {
          lines.push(`      Round ${r.round}: ${r.classification}`);
        }
      }

      lines.push(`    Cost: $${result.totalCost.toFixed(4)}`);
      lines.push("");
    }
  }

  const totalCost = results.reduce((sum, r) => sum + r.totalCost, 0);
  lines.push("-".repeat(50));
  lines.push(`Total cost: $${totalCost.toFixed(4)}`);
  lines.push("");
  lines.push("Rerun command:");
  lines.push(buildRerunCommand(runConfig));

  return lines.join("\n");
}

export function Report({ results, runConfig, onRerun, onNewRun }: Props) {
  const { exit } = useApp();
  const [savedFile, setSavedFile] = useState<string | null>(null);

  useInput((input) => {
    const key = input.toLowerCase();
    if (key === "q") {
      exit();
    } else if (key === "r") {
      onRerun();
    } else if (key === "n") {
      onNewRun();
    } else if (key === "w" && !savedFile) {
      const now = new Date();
      const ts = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const filename = `llm-psychometrics-${ts}.txt`;
      const content = generatePlainTextReport(results, runConfig);
      writeFileSync(filename, content, "utf-8");
      setSavedFile(filename);
    }
  });

  const byModel = new Map<string, EvaluationResult[]>();
  for (const r of results) {
    const existing = byModel.get(r.modelId) ?? [];
    existing.push(r);
    byModel.set(r.modelId, existing);
  }

  const totalCost = results.reduce((sum, r) => sum + r.totalCost, 0);

  return (
    <Box flexDirection="column">
      <Text bold color="cyan">
        {"═".repeat(39)}
      </Text>
      <Text bold color="cyan">
        {"       "}Psychometric Evaluation Report
      </Text>
      <Text bold color="cyan">
        {"═".repeat(39)}
      </Text>

      {[...byModel.entries()].map(([modelId, modelResults]) => (
        <Box key={modelId} flexDirection="column" marginTop={1}>
          <Text bold color="magenta">
            {"┌─"} {modelResults[0].modelName}
          </Text>
          {modelResults.map((result) => (
            <Box key={result.testId} flexDirection="column" marginTop={1}>
              <Text bold>
                {"  "}
                {TEST_LABELS[result.testId]}
              </Text>
              <Text>
                {"  "}Classification:{" "}
                <Text bold color="green">
                  {result.classification}
                </Text>
                {result.confidence !== null && (
                  <Text color={result.confidence >= 80 ? "green" : result.confidence >= 50 ? "yellow" : "red"}>
                    {" "}(confidence: {result.confidence}%)
                  </Text>
                )}
              </Text>
              {result.testId === "big-five" && (
                <BigFiveReport result={result} />
              )}
              {result.testId === "enneagram" && (
                <EnneagramReport result={result} />
              )}
              {result.testId === "mbti" && <MBTIReport result={result} />}
              <ContradictionsSection result={result} />
              <RoundDetails result={result} />
              <Text dimColor>
                {"  "}Cost: ${result.totalCost.toFixed(4)}
              </Text>
            </Box>
          ))}
          <Text color="magenta">{"└" + "─".repeat(29)}</Text>
        </Box>
      ))}

      <Box marginTop={1} flexDirection="column">
        <Text bold color="cyan">
          {"─".repeat(39)}
        </Text>
        <Text bold>
          Total cost: <Text color="yellow">${totalCost.toFixed(4)}</Text>
        </Text>
      </Box>

      {savedFile && (
        <Box marginTop={1}>
          <Text color="green">Report saved to {savedFile}</Text>
        </Box>
      )}

      <Box marginTop={1} flexDirection="column">
        <Text dimColor>Hint - use this command to rerun this evaluation:</Text>
        <Text color="cyan">{buildRerunCommand(runConfig)}</Text>
      </Box>
      <Newline />
      <Box flexDirection="column">
        <Text bold>
          (r) Rerun  (n) New run  {!savedFile && "(w) Write to file  "}(q) Quit
        </Text>
      </Box>
    </Box>
  );
}
