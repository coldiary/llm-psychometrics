import type { ORModel } from "../types.js";

const BASE_URL = "https://openrouter.ai/api/v1";

export async function fetchModels(apiKey: string): Promise<ORModel[]> {
  const res = await fetch(`${BASE_URL}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch models: ${res.status} ${res.statusText}`);
  }
  const json = (await res.json()) as {
    data: Array<{
      id: string;
      name: string;
      context_length: number;
      pricing: { prompt: string; completion: string };
      architecture?: { output_modalities?: string[] };
    }>;
  };
  return json.data
    .filter((m) => {
      const modalities = m.architecture?.output_modalities ?? [];
      return modalities.includes("text");
    })
    .filter((m) => m.context_length >= 4096)
    .map((m) => ({
      id: m.id,
      name: m.name,
      context_length: m.context_length,
      pricing: m.pricing,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

interface CompletionResponse {
  content: string;
  promptTokens: number;
  completionTokens: number;
}

export async function chatCompletion(
  apiKey: string,
  modelId: string,
  prompt: string,
  retries = 2,
): Promise<CompletionResponse> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      }),
    });

    if (res.status === 429 && attempt < retries) {
      const delay = Math.pow(2, attempt + 1) * 1000;
      await new Promise((r) => setTimeout(r, delay));
      continue;
    }

    if (!res.ok) {
      throw new Error(
        `OpenRouter API error: ${res.status} ${res.statusText}`,
      );
    }

    const json = (await res.json()) as {
      choices: Array<{ message: { content: string } }>;
      usage?: { prompt_tokens: number; completion_tokens: number };
    };

    return {
      content: json.choices[0]?.message?.content ?? "",
      promptTokens: json.usage?.prompt_tokens ?? 0,
      completionTokens: json.usage?.completion_tokens ?? 0,
    };
  }
  throw new Error("Max retries exceeded");
}

export function calculateCost(
  model: ORModel,
  promptTokens: number,
  completionTokens: number,
): number {
  return (
    promptTokens * parseFloat(model.pricing.prompt) +
    completionTokens * parseFloat(model.pricing.completion)
  );
}

export function estimateCost(
  model: ORModel,
  estimatedInputTokens: number,
  estimatedOutputTokens: number,
): number {
  return calculateCost(model, estimatedInputTokens, estimatedOutputTokens);
}

export function parseJsonResponse(
  content: string,
  expectedCount: number,
): number[] | null {
  const tryParse = (str: string): number[] | null => {
    try {
      const obj = JSON.parse(str);
      const arr = obj.responses ?? obj.answers ?? obj.ratings ?? obj;
      if (Array.isArray(arr) && arr.length === expectedCount) {
        return arr.map((v: unknown) => {
          const n = Number(v);
          return Math.min(5, Math.max(1, Math.round(n)));
        });
      }
    } catch {}
    return null;
  };

  // Try direct parse
  let result = tryParse(content);
  if (result) return result;

  // Try extracting from code blocks
  const codeBlockMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    result = tryParse(codeBlockMatch[1]);
    if (result) return result;
  }

  // Try finding JSON object in text
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    result = tryParse(jsonMatch[0]);
    if (result) return result;
  }

  // Try finding JSON array in text
  const arrayMatch = content.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    result = tryParse(`{"responses":${arrayMatch[0]}}`);
    if (result) return result;
  }

  return null;
}
