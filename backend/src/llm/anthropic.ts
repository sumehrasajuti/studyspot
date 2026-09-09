import dotenv from "dotenv";
dotenv.config();

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

/**
 * Sends a single-turn prompt to Claude and returns the raw text response.
 * Kept deliberately minimal - no streaming, no tool use, since search-query
 * parsing and short summaries don't need it.
 */
export async function askClaude(systemPrompt: string, userMessage: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set in .env");
  }

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Anthropic API error (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  const textBlock = data.content?.find((block: { type: string }) => block.type === "text");
  return textBlock?.text ?? "";
}

/** Strips markdown code fences if the model wraps its JSON response in them. */
export function extractJson(rawText: string): string {
  return rawText.replace(/```json|```/g, "").trim();
}
