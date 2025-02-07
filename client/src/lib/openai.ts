import OpenAI from "openai";
import Anthropic from '@anthropic-ai/sdk';
import { type MetaPromptInput } from "@shared/schema";
import type { ModelConfig } from "@/components/settings/model-settings-section";

// Helper function to get the right client based on provider
function getClient(config: ModelConfig) {
  if (!config.apiKey) {
    throw new Error("API key is required. Please set it in the model settings.");
  }

  switch (config.provider) {
    case "openai":
      return new OpenAI({
        apiKey: config.apiKey,
        dangerouslyAllowBrowser: true
      });
    case "anthropic":
      return new Anthropic({
        apiKey: config.apiKey,
      });
    case "groq":
      // Groq uses OpenAI's API format
      return new OpenAI({
        apiKey: config.apiKey,
        baseURL: "https://api.groq.com/v1",
        dangerouslyAllowBrowser: true
      });
    default:
      throw new Error(`Unsupported provider: ${config.provider}`);
  }
}

// Helper function to format messages based on provider
function formatMessages(prompt: string, config: ModelConfig) {
  switch (config.provider) {
    case "anthropic":
      return [{
        role: "user",
        content: prompt
      }];
    default:
      return [{
        role: "user",
        content: prompt
      }];
  }
}

// Handler for API errors
function handleApiError(error: any) {
  if (error.error?.type === "tokens" || error.error?.code === "rate_limit_exceeded") {
    throw new Error(`Rate limit exceeded. Please wait a moment and try again.`);
  }
  throw error;
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

  try {
    const client = getClient(config);
    const messages = formatMessages(prompt, config);

    if (config.provider === "anthropic") {
      const response = await (client as Anthropic).messages.create({
        model: config.model,
        messages,
        max_tokens: config.maxTokens,
        temperature: config.temperature,
      });
      return response.content[0].text;
    } else {
      const response = await (client as OpenAI).chat.completions.create({
        model: config.model,
        messages,
        temperature: config.temperature,
        max_tokens: config.maxTokens
      });
      return response.choices[0].message.content || "";
    }
  } catch (error) {
    handleApiError(error);
  }
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

Return ONLY a JSON object with this exact structure:
{
  "variations": [
    "First complete variation text here",
    "Second complete variation text here",
    "Third complete variation text here"
  ]
}
Important: Each item in the variations array must be a complete string, not an object.`;

  const client = getClient(config);
  try {
    let content: string;

    if (config.provider === "anthropic") {
      const response = await (client as Anthropic).messages.create({
        model: config.model,
        messages: formatMessages(prompt, config),
        max_tokens: Math.max(config.maxTokens, 2048),
        temperature: config.temperature,
      });
      content = response.content[0].text;
    } else {
      const response = await (client as OpenAI).chat.completions.create({
        model: config.model,
        messages: formatMessages(prompt, config),
        temperature: config.temperature,
        max_tokens: Math.max(config.maxTokens, 2048),
        response_format: { type: "json_object" }
      });
      content = response.choices[0].message.content || "";
    }

    try {
      const result = JSON.parse(content);
      if (!Array.isArray(result.variations)) {
        console.error("Invalid response format - variations is not an array");
        return [];
      }
      return result.variations.map(v => typeof v === 'string' ? v : JSON.stringify(v));
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
  try {
    let content: string;

    if (config.provider === "anthropic") {
      const response = await (client as Anthropic).messages.create({
        model: config.model,
        messages: formatMessages(evaluationPrompt, config),
        max_tokens: config.maxTokens,
        temperature: config.temperature,
      });
      content = response.content[0].text;
    } else {
      const response = await (client as OpenAI).chat.completions.create({
        model: config.model,
        messages: formatMessages(evaluationPrompt, config),
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        response_format: { type: "json_object" }
      });
      content = response.choices[0].message.content || "";
    }

    return JSON.parse(content);
  } catch (error) {
    handleApiError(error);
    return {};
  }
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
    let content: string;

    if (config.provider === "anthropic") {
      const response = await (client as Anthropic).messages.create({
        model: config.model,
        messages: formatMessages(prompt, config),
        max_tokens: config.maxTokens,
        temperature: config.temperature,
      });
      content = response.content[0].text;
    } else {
      const response = await (client as OpenAI).chat.completions.create({
        model: config.model,
        messages: formatMessages(prompt, config),
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        response_format: { type: "json_object" }
      });
      content = response.choices[0].message.content || "";
    }

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