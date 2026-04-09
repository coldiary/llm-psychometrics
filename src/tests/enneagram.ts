import type { TestDefinition } from "../types.js";

interface Item {
  id: number;
  text: string;
  type: number; // 1-9
}

const items: Item[] = [
  { id: 1, text: "I am a perfectionist", type: 1 },
  { id: 2, text: "My relationships with others are what my life is about", type: 2 },
  { id: 3, text: "I put work first", type: 3 },
  { id: 4, text: "I daydream about being in love", type: 4 },
  { id: 5, text: "I have a hard time showing emotions", type: 5 },
  { id: 6, text: "Fear of being taken advantage of keeps me from being more trusting", type: 6 },
  { id: 7, text: "I must always be having new experiences", type: 7 },
  { id: 8, text: "I naturally emerge as a leader", type: 8 },
  { id: 9, text: "When other people are arguing, I leave the room", type: 9 },
  { id: 10, text: "I strive for efficiency", type: 1 },
  { id: 11, text: "I have difficulty saying no", type: 2 },
  { id: 12, text: "I like to stand out", type: 3 },
  { id: 13, text: "I really enjoy feeling bittersweet", type: 4 },
  { id: 14, text: "I spend hours alone with my hobbies", type: 5 },
  { id: 15, text: "I get input from others before I make a decision", type: 6 },
  { id: 16, text: "I can keep a conversation going with anyone about anything", type: 7 },
  { id: 17, text: "I like a conversation where no one agrees", type: 8 },
  { id: 18, text: "I keep my thoughts to myself, to prevent trouble", type: 9 },
  { id: 19, text: "I often have to redo other people's work", type: 1 },
  { id: 20, text: "I get lots of satisfaction from helping others achieve their goals", type: 2 },
  { id: 21, text: "It is good to wake up to a full day of planned activities", type: 3 },
  { id: 22, text: "I cry", type: 4 },
  { id: 23, text: "I spend most of my time trying to understand things", type: 5 },
  { id: 24, text: "I conform", type: 6 },
  { id: 25, text: "I am uninhibited", type: 7 },
  { id: 26, text: "I want people to tell me the truth, not spare my feelings", type: 8 },
  { id: 27, text: "I am very accepting and flexible", type: 9 },
  { id: 28, text: "I keep my belongings in order", type: 1 },
  { id: 29, text: "I put family first", type: 2 },
  { id: 30, text: "Money is important to my happiness", type: 3 },
  { id: 31, text: "I side with the rebels over the establishment", type: 4 },
  { id: 32, text: "I like mental challenges", type: 5 },
  { id: 33, text: "I am loyal", type: 6 },
  { id: 34, text: "I always try to break the tension with a good joke", type: 7 },
  { id: 35, text: "I prefer it when leaders are decisive", type: 8 },
  { id: 36, text: "I avoid confrontation", type: 9 },
];

const TYPE_NAMES: Record<number, string> = {
  1: "Type 1 - The Reformer",
  2: "Type 2 - The Helper",
  3: "Type 3 - The Achiever",
  4: "Type 4 - The Individualist",
  5: "Type 5 - The Investigator",
  6: "Type 6 - The Loyalist",
  7: "Type 7 - The Enthusiast",
  8: "Type 8 - The Challenger",
  9: "Type 9 - The Peacemaker",
};

function buildPrompt(): string {
  const lines = items.map((item) => `${item.id}. "${item.text}"`);
  return `Rate each of the following statements based on how much you agree they describe you.

Use this scale:
1 = Disagree
2 = Slightly Disagree
3 = Neutral
4 = Slightly Agree
5 = Agree

${lines.join("\n")}

Respond ONLY with a JSON object in this exact format:
{"responses": [rating_1, rating_2, ..., rating_36]}`;
}

function score(responses: number[]): { scores: Record<string, number>; classification: string } {
  const scores: Record<string, number> = {};
  for (let t = 1; t <= 9; t++) {
    const typeItems = items.filter((item) => item.type === t);
    scores[TYPE_NAMES[t]] = typeItems.reduce(
      (sum, item) => sum + responses[item.id - 1],
      0,
    );
  }

  const sorted = Object.entries(scores).sort(([, a], [, b]) => b - a);
  const classification = sorted[0][0];

  return { scores, classification };
}

export const enneagramTest: TestDefinition = {
  id: "enneagram",
  name: "Enneagram (OEPS v1)",
  description: "36-item Enneagram of Personality Scales",
  buildPrompt,
  score,
  expectedResponseCount: 36,
  estimatedInputTokens: 600,
  estimatedOutputTokens: 150,
  scoreRange: { min: 4, max: 20 },
};
