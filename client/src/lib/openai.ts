import OpenAI from "openai";
import type { MetaPromptInput } from "@shared/schema";
import type { Provider } from "@/types";

// Updated evaluation criteria
export const DEFAULT_EVALUATION_CRITERIA = [
  { 
    id: "relevance", 
    name: "Relevance", 
    description: "How well does the output align with the original user prompt?" 
  },
  { 
    id: "coherence", 
    name: "Coherence", 
    description: "Is the response logically structured and fluent?" 
  },
  { 
    id: "creativity", 
    name: "Creativity", 
    description: "Does the response show uniqueness and innovation?" 
  },
  { 
    id: "accuracy", 
    name: "Accuracy", 
    description: "For fact-based prompts, does the output contain correct information?" 
  },
  { 
    id: "conciseness", 
    name: "Conciseness", 
    description: "Is the response to the point without unnecessary verbosity?" 
  }
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
    temperature: 0.3, // Lower temperature for more consistent outputs
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

  const prompt = `You will generate exactly ${count} variations of the following prompt. Return ONLY a JSON response in the exact format: {"variations": ["variation1", "variation2", "variation3"]}

Original Meta Prompt:
${metaPrompt}

Guidelines for each variation:
1. Maintain the core functionality but vary the emphasis and approach
2. Each variation should be unique and well-structured
3. Keep the essential constraints while exploring different angles
4. Aim for at least 250 words per variation

Remember: Return only a JSON object with a "variations" array containing exactly ${count} strings.`;

  const response = await openai.chat.completions.create({
    model: DEFAULT_MODEL_CONFIG.model,
    messages: [
      {
        role: "system",
        content: "You are a JSON-focused prompt engineer. Always respond with valid JSON objects containing a 'variations' array."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0.3, // Lower temperature for consistent JSON
    max_tokens: DEFAULT_MODEL_CONFIG.maxTokens,
    response_format: { type: "json_object" }
  });

  try {
    const content = response.choices[0].message.content || "{}";
    const result = JSON.parse(content);
    if (!Array.isArray(result.variations) || result.variations.length !== count) {
      throw new Error("Invalid response format");
    }
    return result.variations;
  } catch (error) {
    console.error("Failed to parse variations:", error);
    throw new Error("Failed to generate variations");
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

  // Generate 5 test responses for each variation
  for (let i = 0; i < variations.length; i++) {
    const prompt = `Evaluate the following prompt variation carefully.

Original Request: "${originalRequest}"

Prompt Variation:
${variations[i]}

Evaluate this variation using the following criteria on a scale of 1-10:
${DEFAULT_EVALUATION_CRITERIA.map(c => `- ${c.name}: ${c.description}`).join('\n')}

Return a JSON object in this exact format:
{
  "evaluations": [
    {
      "criterionId": "criterion-id",
      "score": [score between 0.0-1.0, divide your 1-10 score by 10],
      "explanation": "Brief explanation of the score"
    }
  ]
}

Provide detailed explanations for each score, considering:
1. How well the prompt achieves its intended purpose
2. Potential improvements or shortcomings
3. Specific strengths in each criterion`;

    const response = await openai.chat.completions.create({
      model: DEFAULT_MODEL_CONFIG.model,
      messages: [
        {
          role: "system",
          content: "You are an expert prompt evaluator. Provide thorough, unbiased assessments of prompt quality across multiple criteria."
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
      const content = response.choices[0].message.content || "{}";
      const result = JSON.parse(content);
      if (!Array.isArray(result.evaluations)) {
        throw new Error("Invalid evaluation format");
      }
      results.push({
        variationIndex: i,
        scores: result.evaluations
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