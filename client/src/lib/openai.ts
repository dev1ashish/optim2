import OpenAI from "openai";
import { type MetaPromptInput } from "@shared/schema";
import type { ModelConfig } from "@/components/settings/model-settings";

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Required for browser environment
});

// Helper function to get the right client based on provider
function getClient(config: ModelConfig) {
  switch (config.provider) {
    case "openai":
      return openai;
    // Add other providers here when implementing
    default:
      return openai;
  }
}

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
export async function generateMetaPrompt(
  input: MetaPromptInput,
  config: ModelConfig
): Promise<string> {
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

  const client = getClient(config);
  const response = await client.chat.completions.create({
    model: config.model,
    messages: [{ role: "user", content: prompt }],
    temperature: config.temperature,
    max_tokens: config.maxTokens
  });

  return response.choices[0].message.content || "";
}

export async function generateVariations(
  metaPrompt: string,
  count: number = 3,
  config: ModelConfig
): Promise<string[]> {
  const prompt = `Generate ${count} detailed variations of the following meta prompt:

${metaPrompt}

For each variation:
1. Maintain the core functionality but vary the emphasis and approach
2. Include clear sections for:
   - Role and Persona
   - Communication Style
   - Task Handling Guidelines
   - Response Format
   - Constraints and Safety Measures
3. Each variation should be comprehensive and self-contained
4. Aim for at least 250 words per variation

Return ONLY a JSON object with the following structure:
{
  "variations": [
    "variation1",
    "variation2",
    "variation3"
  ]
}`;

  const client = getClient(config);
  try {
    const response = await client.chat.completions.create({
      model: config.model,
      messages: [{ role: "user", content: prompt }],
      temperature: config.temperature,
      max_tokens: Math.max(config.maxTokens, 2048), // Ensure enough tokens for detailed responses
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) {
      console.error("No content in response");
      return [];
    }

    try {
      const result = JSON.parse(content);
      return Array.isArray(result.variations) ? result.variations : [];
    } catch (error) {
      console.error("JSON Parse Error:", error);
      return [];
    }
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
}

export async function evaluatePrompt(
  prompt: string,
  testCase: string,
  criteria: Record<string, number>,
  config: ModelConfig
): Promise<Record<string, number>> {
  const evaluationPrompt = `Evaluate the following prompt against the test case using the given criteria:

Prompt:
${prompt}

Test Case:
${testCase}

Criteria:
${Object.keys(criteria).join(", ")}

Rate each criterion from 0 to 1 and return as JSON.`;

  const client = getClient(config);
  const response = await client.chat.completions.create({
    model: config.model,
    messages: [{ role: "user", content: evaluationPrompt }],
    temperature: config.temperature,
    max_tokens: config.maxTokens,
    response_format: { type: "json_object" }
  });

  return JSON.parse(response.choices[0].message.content || "{}");
}

export async function generateTestCases(
  baseInput: string,
  metaPrompt: string,
  variations: string[],
  config: ModelConfig
): Promise<{
  input: string;
  criteria: Record<string, number>;
}[]> {
  const prompt = `Given this context:
Base Input: "${baseInput}"
Meta Prompt: "${metaPrompt}"
Generated Variations:
${variations.map((v, i) => `${i + 1}. ${v}`).join('\n')}

Generate a set of test cases that will effectively evaluate these prompt variations.
For each test case:
1. Create a challenging input scenario
2. Define evaluation criteria with weights (0-1) based on what's important for this specific use case

Return ONLY a JSON object with this structure:
{
  "testCases": [
    {
      "input": "test scenario here",
      "criteria": {
        "criterionName": 0.8,
        "anotherCriterion": 0.6
      }
    }
  ]
}`;

  const client = getClient(config);
  try {
    const response = await client.chat.completions.create({
      model: config.model,
      messages: [{ role: "user", content: prompt }],
      temperature: config.temperature,
      max_tokens: config.maxTokens,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) {
      return [];
    }

    const result = JSON.parse(content);
    return result.testCases || [];
  } catch (error) {
    console.error("Test Case Generation Error:", error);
    return [];
  }
}