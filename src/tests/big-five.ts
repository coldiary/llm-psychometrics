import type { TestDefinition } from "../types.js";

type Factor = "Extraversion" | "Agreeableness" | "Conscientiousness" | "Emotional Stability" | "Openness";

interface Item {
  id: number;
  text: string;
  factor: Factor;
  keying: "+" | "-";
}

const items: Item[] = [
  // Extraversion
  { id: 1, text: "Am the life of the party", factor: "Extraversion", keying: "+" },
  { id: 6, text: "Don't talk a lot", factor: "Extraversion", keying: "-" },
  { id: 11, text: "Feel comfortable around people", factor: "Extraversion", keying: "+" },
  { id: 16, text: "Keep in the background", factor: "Extraversion", keying: "-" },
  { id: 21, text: "Start conversations", factor: "Extraversion", keying: "+" },
  { id: 26, text: "Have little to say", factor: "Extraversion", keying: "-" },
  { id: 31, text: "Talk to a lot of different people at parties", factor: "Extraversion", keying: "+" },
  { id: 36, text: "Don't like to draw attention to myself", factor: "Extraversion", keying: "-" },
  { id: 41, text: "Don't mind being the center of attention", factor: "Extraversion", keying: "+" },
  { id: 46, text: "Am quiet around strangers", factor: "Extraversion", keying: "-" },
  // Agreeableness
  { id: 2, text: "Feel little concern for others", factor: "Agreeableness", keying: "-" },
  { id: 7, text: "Am interested in people", factor: "Agreeableness", keying: "+" },
  { id: 12, text: "Insult people", factor: "Agreeableness", keying: "-" },
  { id: 17, text: "Sympathize with others' feelings", factor: "Agreeableness", keying: "+" },
  { id: 22, text: "Am not interested in other people's problems", factor: "Agreeableness", keying: "-" },
  { id: 27, text: "Have a soft heart", factor: "Agreeableness", keying: "+" },
  { id: 32, text: "Am not really interested in others", factor: "Agreeableness", keying: "-" },
  { id: 37, text: "Take time out for others", factor: "Agreeableness", keying: "+" },
  { id: 42, text: "Feel others' emotions", factor: "Agreeableness", keying: "+" },
  { id: 47, text: "Make people feel at ease", factor: "Agreeableness", keying: "+" },
  // Conscientiousness
  { id: 3, text: "Am always prepared", factor: "Conscientiousness", keying: "+" },
  { id: 8, text: "Leave my belongings around", factor: "Conscientiousness", keying: "-" },
  { id: 13, text: "Pay attention to details", factor: "Conscientiousness", keying: "+" },
  { id: 18, text: "Make a mess of things", factor: "Conscientiousness", keying: "-" },
  { id: 23, text: "Get chores done right away", factor: "Conscientiousness", keying: "+" },
  { id: 28, text: "Often forget to put things back in their proper place", factor: "Conscientiousness", keying: "-" },
  { id: 33, text: "Like order", factor: "Conscientiousness", keying: "+" },
  { id: 38, text: "Shirk my duties", factor: "Conscientiousness", keying: "-" },
  { id: 43, text: "Follow a schedule", factor: "Conscientiousness", keying: "+" },
  { id: 48, text: "Am exacting in my work", factor: "Conscientiousness", keying: "+" },
  // Emotional Stability
  { id: 4, text: "Get stressed out easily", factor: "Emotional Stability", keying: "-" },
  { id: 9, text: "Am relaxed most of the time", factor: "Emotional Stability", keying: "+" },
  { id: 14, text: "Worry about things", factor: "Emotional Stability", keying: "-" },
  { id: 19, text: "Seldom feel blue", factor: "Emotional Stability", keying: "+" },
  { id: 24, text: "Am easily disturbed", factor: "Emotional Stability", keying: "-" },
  { id: 29, text: "Get upset easily", factor: "Emotional Stability", keying: "-" },
  { id: 34, text: "Change my mood a lot", factor: "Emotional Stability", keying: "-" },
  { id: 39, text: "Have frequent mood swings", factor: "Emotional Stability", keying: "-" },
  { id: 44, text: "Get irritated easily", factor: "Emotional Stability", keying: "-" },
  { id: 49, text: "Often feel blue", factor: "Emotional Stability", keying: "-" },
  // Openness
  { id: 5, text: "Have a rich vocabulary", factor: "Openness", keying: "+" },
  { id: 10, text: "Have difficulty understanding abstract ideas", factor: "Openness", keying: "-" },
  { id: 15, text: "Have a vivid imagination", factor: "Openness", keying: "+" },
  { id: 20, text: "Am not interested in abstract ideas", factor: "Openness", keying: "-" },
  { id: 25, text: "Have excellent ideas", factor: "Openness", keying: "+" },
  { id: 30, text: "Do not have a good imagination", factor: "Openness", keying: "-" },
  { id: 35, text: "Am quick to understand things", factor: "Openness", keying: "+" },
  { id: 40, text: "Use difficult words", factor: "Openness", keying: "+" },
  { id: 45, text: "Spend time reflecting on things", factor: "Openness", keying: "+" },
  { id: 50, text: "Am full of ideas", factor: "Openness", keying: "+" },
];

// Sort by item ID for prompt presentation
const sortedItems = [...items].sort((a, b) => a.id - b.id);

function buildPrompt(): string {
  const lines = sortedItems.map(
    (item, i) => `${i + 1}. "${item.text}"`,
  );
  return `Rate each of the following statements based on how accurately they describe you.

Use this scale:
1 = Very Inaccurate
2 = Moderately Inaccurate
3 = Neither Accurate nor Inaccurate
4 = Moderately Accurate
5 = Very Accurate

${lines.join("\n")}

Respond ONLY with a JSON object in this exact format:
{"responses": [rating_1, rating_2, ..., rating_50]}`;
}

function score(responses: number[]): { scores: Record<string, number>; classification: string } {
  const factors: Factor[] = ["Extraversion", "Agreeableness", "Conscientiousness", "Emotional Stability", "Openness"];
  const scores: Record<string, number> = {};

  for (const factor of factors) {
    const factorItems = sortedItems
      .map((item, index) => ({ ...item, response: responses[index] }))
      .filter((item) => item.factor === factor);

    let sum = 0;
    for (const item of factorItems) {
      sum += item.keying === "-" ? 6 - item.response : item.response;
    }
    scores[factor] = sum;
  }

  const classification = factors
    .map((f) => {
      const s = scores[f];
      const level = s >= 38 ? "High" : s >= 22 ? "Average" : "Low";
      return `${f}: ${level}`;
    })
    .join(", ");

  return { scores, classification };
}

export const bigFiveTest: TestDefinition = {
  id: "big-five",
  name: "Big Five (IPIP-50)",
  description: "50-item Big Five personality inventory",
  buildPrompt,
  score,
  expectedResponseCount: 50,
  estimatedInputTokens: 800,
  estimatedOutputTokens: 200,
  scoreRange: { min: 10, max: 50 },
};
