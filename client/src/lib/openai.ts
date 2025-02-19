import OpenAI from "openai";
import type { MetaPromptInput } from "@shared/schema";
import type { Provider } from "@/types";

// Default evaluation criteria
export const DEFAULT_EVALUATION_CRITERIA = [
  { id: "clarity", name: "Clarity", description: "How clear and understandable is the prompt?" },
  { id: "relevance", name: "Relevance", description: "How relevant is the prompt to the original request?" },
  { id: "accuracy", name: "Accuracy", description: "How accurate and precise are the instructions?" },
  { id: "completeness", name: "Completeness", description: "How comprehensive is the prompt in covering all aspects?" }
];

export interface ModelConfigItem {
  id: string;
  maxTokens: number;
}

const DEFAULT_MODEL_CONFIG = {
  provider: "openai" as const,
  model: "gpt-4o",
  temperature: 0.7,
  maxTokens: 4096,
  systemPrompt: "You are a professional AI prompt engineer, skilled at creating detailed and effective prompts."
};

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
export async function generateMetaPrompt(
  input: MetaPromptInput,
  apiKey: string
): Promise<string> {
  const openai = new OpenAI({ 
    apiKey,
    dangerouslyAllowBrowser: true
  });

  const prompt = `Given this request for an AI assistant: "${input.baseInput}"

Create a comprehensive meta-prompt that includes:
1. Extracted AI Role
2. Appropriate Tone & Style
3. Core Functionality
4. Necessary Constraints
5. Edge Cases to Handle

Format the response as a detailed prompt with clear sections for:
- Core Behavioral Guidelines
- Communication Style
- Response Structure
- Constraints & Safety
- Example Responses`;

  const response = await openai.chat.completions.create({
    model: DEFAULT_MODEL_CONFIG.model,
    messages: [
      {
        role: "system",
        content: DEFAULT_MODEL_CONFIG.systemPrompt
      },
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: DEFAULT_MODEL_CONFIG.temperature,
    max_tokens: DEFAULT_MODEL_CONFIG.maxTokens
  });

  return response.choices[0].message.content || "";
}

export async function generateVariations(
  metaPrompt: string,
  apiKey: string,
  count: number = 3
): Promise<string[]> {
  const openai = new OpenAI({ 
    apiKey,
    dangerouslyAllowBrowser: true
  });

  const prompt = `Generate exactly ${count} detailed variations of the following meta prompt:

${metaPrompt}

For each variation:
1. Maintain the core functionality but vary the emphasis and approach
2. Each variation should be unique and well-structured
3. Keep the essential constraints while exploring different angles
4. Aim for at least 250 words per variation

Return ONLY a JSON array containing exactly ${count} variations.`;

  const response = await openai.chat.completions.create({
    model: DEFAULT_MODEL_CONFIG.model,
    messages: [
      {
        role: "system",
        content: DEFAULT_MODEL_CONFIG.systemPrompt
      },
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: DEFAULT_MODEL_CONFIG.temperature,
    max_tokens: DEFAULT_MODEL_CONFIG.maxTokens,
    response_format: { type: "json_object" }
  });

  try {
    const content = response.choices[0].message.content || "[]";
    const result = JSON.parse(content);
    return Array.isArray(result.variations) ? result.variations : [];
  } catch (error) {
    console.error("Failed to parse variations:", error);
    return [];
  }
}

export interface EvaluationScore {
  criterionId: string;
  score: number;
  explanation: string;
}

export async function evaluateVariations(
  variations: string[],
  originalRequest: string,
  apiKey: string
): Promise<Array<{ variationIndex: number; scores: EvaluationScore[] }>> {
  const openai = new OpenAI({ 
    apiKey,
    dangerouslyAllowBrowser: true
  });

  const results = [];

  for (let i = 0; i < variations.length; i++) {
    const prompt = `Evaluate the following prompt variation against the original request.

Original Request: "${originalRequest}"

Prompt Variation:
${variations[i]}

Evaluate this variation using the following criteria:
${DEFAULT_EVALUATION_CRITERIA.map(c => `- ${c.name}: ${c.description}`).join('\n')}

Return a JSON array of scores, one for each criterion, in this format:
[
  {
    "criterionId": "criterion-id",
    "score": 0.0-1.0,
    "explanation": "Brief explanation of the score"
  }
]`;

    const response = await openai.chat.completions.create({
      model: DEFAULT_MODEL_CONFIG.model,
      messages: [
        {
          role: "system",
          content: "You are an objective evaluator of AI prompts. Provide detailed, fair assessments."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1000,
      response_format: { type: "json_object" }
    });

    try {
      const content = response.choices[0].message.content || "[]";
      const scores = JSON.parse(content);
      results.push({
        variationIndex: i,
        scores: scores.evaluations || []
      });
    } catch (error) {
      console.error(`Failed to evaluate variation ${i}:`, error);
      results.push({
        variationIndex: i,
        scores: DEFAULT_EVALUATION_CRITERIA.map(c => ({
          criterionId: c.id,
          score: 0,
          explanation: "Evaluation failed"
        }))
      });
    }
  }

  return results;
}