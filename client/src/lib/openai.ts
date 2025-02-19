import OpenAI from "openai";
import type { MetaPromptInput } from "@shared/schema";
import type { Provider } from "@/types";

// Updated evaluation criteria with weights
export const DEFAULT_EVALUATION_CRITERIA = [
  { 
    id: "relevance", 
    name: "Relevance", 
    description: "How precisely does the output align with the original user prompt?",
    defaultWeight: 1.0
  },
  { 
    id: "coherence", 
    name: "Coherence", 
    description: "Is the response logically structured with clear flow and transitions?",
    defaultWeight: 0.9
  },
  { 
    id: "creativity", 
    name: "Creativity", 
    description: "Does the response demonstrate innovative thinking and unique approaches?",
    defaultWeight: 0.8
  },
  { 
    id: "accuracy", 
    name: "Accuracy", 
    description: "Are all factual statements correct and verifiable?",
    defaultWeight: 1.0
  },
  { 
    id: "conciseness", 
    name: "Conciseness", 
    description: "Is the response optimally concise without sacrificing clarity?",
    defaultWeight: 0.7
  },
  {
    id: "diversity",
    name: "Response Diversity",
    description: "How varied and comprehensive are the different aspects covered?",
    defaultWeight: 0.8
  },
  {
    id: "bias",
    name: "Bias Detection",
    description: "Are there any unintended biases or assumptions in the response?",
    defaultWeight: 0.9
  },
  {
    id: "readability",
    name: "Readability",
    description: "How accessible and clear is the language for the target audience?",
    defaultWeight: 0.8
  }
];

// Task type detection for weight adjustment
function getTaskWeights(input: string) {
  const weights = { ...Object.fromEntries(DEFAULT_EVALUATION_CRITERIA.map(c => [c.id, c.defaultWeight])) };

  // Detect creative tasks
  if (input.toLowerCase().includes("creative") || 
      input.toLowerCase().includes("write") || 
      input.toLowerCase().includes("generate story")) {
    weights.creativity = 1.2;
    weights.diversity = 1.1;
    weights.accuracy = 0.8;
  }

  // Detect technical/factual tasks
  if (input.toLowerCase().includes("explain") || 
      input.toLowerCase().includes("technical") || 
      input.toLowerCase().includes("facts")) {
    weights.accuracy = 1.3;
    weights.coherence = 1.1;
    weights.creativity = 0.6;
  }

  return weights;
}

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
    temperature: 0.3,
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
5. Ensure each variation has a distinct approach and perspective

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
    temperature: 0.7,
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

  const weights = getTaskWeights(originalRequest);
  const results = [];

  for (let i = 0; i < variations.length; i++) {
    const prompt = `You are a strict and critical prompt evaluator. Your goal is to provide detailed, honest, and constructive criticism of the following prompt variation.

Original Request: "${originalRequest}"

Prompt Variation to Evaluate:
${variations[i]}

Evaluate this variation using these criteria on a scale of 1-10, where:
1-3: Poor, significant issues
4-6: Average, needs improvement
7-8: Good, minor issues
9-10: Excellent, exceptional quality

${DEFAULT_EVALUATION_CRITERIA.map(c => `- ${c.name} (Weight: ${weights[c.id]}): ${c.description}`).join('\n')}

Additional Analysis Required:
1. Diversity Check: Analyze the variation for coverage of different perspectives and approaches
2. Bias Detection: Identify any potential biases or problematic assumptions
3. Readability Analysis: Assess the clarity and accessibility of the language
4. Hallucination Risk: Evaluate the potential for generating false or misleading information

Return a JSON object in this exact format:
{
  "evaluations": [
    {
      "criterionId": "criterion-id",
      "score": [score between 0.0-1.0, divide your 1-10 score by 10],
      "explanation": "Detailed explanation of the score with specific examples and suggestions for improvement"
    }
  ]
}

Be extremely critical in your evaluation. Do not be lenient - if there are issues, they should be reflected in the scores.`;

    const response = await openai.chat.completions.create({
      model: DEFAULT_MODEL_CONFIG.model,
      messages: [
        {
          role: "system",
          content: "You are a highly critical prompt evaluator with expertise in NLP and prompt engineering. Your evaluations should be thorough, unbiased, and strict."
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

      // Apply weights to scores
      const weightedScores = result.evaluations.map((evaluation) => ({
        ...evaluation,
        score: evaluation.score * weights[evaluation.criterionId]
      }));

      results.push({
        variationIndex: i,
        scores: weightedScores
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