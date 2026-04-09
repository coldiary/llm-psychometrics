import type { TestDefinition } from "../types.js";

interface Item {
  id: number;
  left: string;
  right: string;
  dimension: "IE" | "SN" | "FT" | "JP";
  operation: "+" | "-";
}

// From OEJTS 1.2 scoring formulas:
// IE = 30 - Q3 - Q7 - Q11 + Q15 - Q19 + Q23 + Q27 - Q31
// SN = 12 + Q4 + Q8 + Q12 + Q16 + Q20 - Q24 - Q28 + Q32
// FT = 30 - Q2 + Q6 + Q10 - Q14 - Q18 + Q22 - Q26 - Q30
// JP = 18 + Q1 + Q5 - Q9 + Q13 - Q17 + Q21 - Q25 + Q29

const items: Item[] = [
  { id: 1, left: "Makes lists", right: "Relies on memory", dimension: "JP", operation: "+" },
  { id: 2, left: "Sceptical", right: "Wants to believe", dimension: "FT", operation: "-" },
  { id: 3, left: "Bored by time alone", right: "Needs time alone", dimension: "IE", operation: "-" },
  { id: 4, left: "Accepts things as they are", right: "Unsatisfied with the way things are", dimension: "SN", operation: "+" },
  { id: 5, left: "Keeps a clean room", right: "Just puts stuff wherever", dimension: "JP", operation: "+" },
  { id: 6, left: "Thinks 'robotic' is an insult", right: "Strives to have a mechanical mind", dimension: "FT", operation: "+" },
  { id: 7, left: "Energetic", right: "Mellow", dimension: "IE", operation: "-" },
  { id: 8, left: "Prefers multiple choice tests", right: "Prefers essay answers", dimension: "SN", operation: "+" },
  { id: 9, left: "Chaotic", right: "Organized", dimension: "JP", operation: "-" },
  { id: 10, left: "Easily hurt", right: "Thick-skinned", dimension: "FT", operation: "+" },
  { id: 11, left: "Works best in groups", right: "Works best alone", dimension: "IE", operation: "-" },
  { id: 12, left: "Focused on the present", right: "Focused on the future", dimension: "SN", operation: "+" },
  { id: 13, left: "Plans far ahead", right: "Plans at the last minute", dimension: "JP", operation: "+" },
  { id: 14, left: "Wants people's respect", right: "Wants their love", dimension: "FT", operation: "-" },
  { id: 15, left: "Gets worn out by parties", right: "Gets fired up by parties", dimension: "IE", operation: "+" },
  { id: 16, left: "Fits in", right: "Stands out", dimension: "SN", operation: "+" },
  { id: 17, left: "Keeps options open", right: "Commits", dimension: "JP", operation: "-" },
  { id: 18, left: "Wants to be good at fixing things", right: "Wants to be good at fixing people", dimension: "FT", operation: "-" },
  { id: 19, left: "Talks more", right: "Listens more", dimension: "IE", operation: "-" },
  { id: 20, left: "When describing an event, tells people what happened", right: "When describing an event, tells people what it meant", dimension: "SN", operation: "+" },
  { id: 21, left: "Gets work done right away", right: "Procrastinates", dimension: "JP", operation: "+" },
  { id: 22, left: "Follows the heart", right: "Follows the head", dimension: "FT", operation: "+" },
  { id: 23, left: "Stays at home", right: "Goes out on the town", dimension: "IE", operation: "+" },
  { id: 24, left: "Wants the big picture", right: "Wants the details", dimension: "SN", operation: "-" },
  { id: 25, left: "Improvises", right: "Prepares", dimension: "JP", operation: "-" },
  { id: 26, left: "Bases morality on justice", right: "Bases morality on compassion", dimension: "FT", operation: "-" },
  { id: 27, left: "Finds it difficult to yell very loudly", right: "Yelling to others when they are far away comes naturally", dimension: "IE", operation: "+" },
  { id: 28, left: "Theoretical", right: "Empirical", dimension: "SN", operation: "-" },
  { id: 29, left: "Works hard", right: "Plays hard", dimension: "JP", operation: "+" },
  { id: 30, left: "Uncomfortable with emotions", right: "Values emotions", dimension: "FT", operation: "-" },
  { id: 31, left: "Likes to perform in front of other people", right: "Avoids public speaking", dimension: "IE", operation: "-" },
  { id: 32, left: "Likes to know 'who?', 'what?', 'when?'", right: "Likes to know 'why?'", dimension: "SN", operation: "+" },
];

const BASELINES: Record<string, number> = { IE: 30, SN: 12, FT: 30, JP: 18 };

function buildPrompt(): string {
  const lines = items.map(
    (item) =>
      `${item.id}. A: "${item.left}" vs B: "${item.right}"`,
  );
  return `For each pair of descriptions below, rate where you fall on a scale from 1 to 5.

1 = Strongly identify with A
2 = Slightly more like A
3 = Neutral / equally both
4 = Slightly more like B
5 = Strongly identify with B

${lines.join("\n")}

Respond ONLY with a JSON object in this exact format:
{"responses": [rating_1, rating_2, ..., rating_32]}`;
}

function score(responses: number[]): { scores: Record<string, number>; classification: string } {
  const dimensionScores: Record<string, number> = {
    IE: BASELINES.IE,
    SN: BASELINES.SN,
    FT: BASELINES.FT,
    JP: BASELINES.JP,
  };

  for (const item of items) {
    const value = responses[item.id - 1];
    if (item.operation === "+") {
      dimensionScores[item.dimension] += value;
    } else {
      dimensionScores[item.dimension] -= value;
    }
  }

  const classification = [
    dimensionScores.IE > 24 ? "E" : "I",
    dimensionScores.SN > 24 ? "N" : "S",
    dimensionScores.FT > 24 ? "T" : "F",
    dimensionScores.JP > 24 ? "P" : "J",
  ].join("");

  const scores: Record<string, number> = {
    "Introversion-Extraversion": dimensionScores.IE,
    "Sensing-Intuition": dimensionScores.SN,
    "Feeling-Thinking": dimensionScores.FT,
    "Judging-Perceiving": dimensionScores.JP,
  };

  return { scores, classification };
}

export const mbtiTest: TestDefinition = {
  id: "mbti",
  name: "MBTI (OEJTS 1.2)",
  description: "32-item Open Extended Jungian Type Scales",
  buildPrompt,
  score,
  expectedResponseCount: 32,
  estimatedInputTokens: 900,
  estimatedOutputTokens: 200,
  scoreRange: { min: 0, max: 48 },
};
