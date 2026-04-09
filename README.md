# llm-psychometrics

A CLI tool that evaluates AI language models against standardized psychometric tests via [OpenRouter](https://openrouter.ai/). Measures personality traits across multiple rounds and reports results with confidence scores.

![Demo](docs/demo.gif)

## Features

- **Three psychometric tests**: Big Five (IPIP-50), Enneagram (OEPS v1), MBTI (OEJTS 1.2)
- **Interactive wizard**: select models, tests, and configuration through a terminal UI
- **Parallel evaluation**: run multiple models and tests concurrently
- **Multi-round assessment**: run tests multiple times to measure consistency
- **Confidence scoring**: quantifies how stable results are across rounds
- **Contradiction detection**: flags significant variation between rounds
- **Cost estimation**: shows estimated cost range before running, tracks actual spend
- **Report export**: write results to a text file
- **CLI automation**: skip interactive steps with command-line flags

## Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- An [OpenRouter](https://openrouter.ai/) API key

## Installation

```bash
git clone <repo-url>
cd llm-psychometrics
npm install
```

Create a `.env.local` file with your API key:

```
OPENROUTER_API_KEY=your-api-key-here
```

## Usage

### Interactive mode

```bash
npm start
```

This launches a step-by-step wizard:

1. Validates your API key and loads available models
2. Select which models to evaluate (multi-select with search filter)
3. Select which tests to run (all three checked by default)
4. Choose number of evaluation rounds per test
5. Review cost estimate and confirm
6. Watch progress as evaluations run in parallel
7. View the full report with scores, confidence, and contradictions

### CLI flags

Skip interactive steps by providing arguments directly:

```bash
npx tsx src/index.tsx --models openai/gpt-4o,anthropic/claude-sonnet-4 --tests big-five,mbti --rounds 5
```

| Flag | Description |
|------|-------------|
| `--models <id,...>` | Comma-separated model IDs (skips model selection) |
| `--tests <id,...>` | Comma-separated test IDs: `big-five`, `enneagram`, `mbti` |
| `--rounds <n>` | Number of evaluation rounds per test |
| `--parallel-agents <n>` | Max models evaluated in parallel (default: 3) |
| `--parallel-tests <n>` | Max tests per model in parallel (default: 3) |
| `--list-models` | List all available models from OpenRouter |
| `--list-tests` | List all available tests |
| `--help` | Show help message |

### Post-run options

After evaluation completes, the report screen offers:

- **(r) Rerun** — re-execute the same configuration immediately
- **(n) New run** — return to cost estimate to adjust and re-confirm
- **(w) Write to file** — export the report as a text file
- **(q) Quit**

A rerun command hint is shown so you can reproduce the exact evaluation later.

## Psychometric Tests

Test instruments are sourced from [Open Psychometrics](https://openpsychometrics.org/) and the [IPIP](https://ipip.ori.org/).

### Big Five (IPIP-50)

50-item inventory measuring five personality factors: Extraversion, Agreeableness, Conscientiousness, Emotional Stability, and Openness. Each factor is scored on a 10-50 scale. Items use a 5-point Likert scale (Very Inaccurate to Very Accurate) with positive and negative keying.

### Enneagram (OEPS v1)

36-item assessment covering the nine Enneagram personality types. Each type has 4 items rated on a 5-point agree/disagree scale. The type with the highest sum score is the result.

### MBTI (OEJTS 1.2)

32 bipolar item pairs measuring four dimensions: Introversion/Extraversion, Sensing/Intuition, Feeling/Thinking, and Judging/Perceiving. Each pair is rated on a 5-point scale between two opposing descriptions. Dimensions are scored using weighted formulas with a threshold at 24.

The OEJTS 1.2 is licensed under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/).

## How it works

1. **Prompting**: Each test is presented as a single prompt asking the model to rate items about itself. No system prompt is used — the model responds from its own built-in persona.
2. **Response parsing**: The model returns JSON ratings. The parser handles various response formats with fallbacks and retries on failure.
3. **Scoring**: Responses are scored using each test's published formulas (reverse-keying, weighted sums, thresholds).
4. **Confidence**: When multiple rounds are run, confidence is the minimum of score stability (normalized standard deviation) and classification consistency (% of rounds agreeing on the final result).
5. **Cost tracking**: Token usage from each API response is multiplied by the model's pricing to compute actual cost.

## License

MIT
