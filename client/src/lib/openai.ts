import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { type MetaPromptInput } from "@shared/schema";
import type { ModelConfig } from "@/components/settings/model-settings-section";

function getClient(config: ModelConfig) {
  if (!config.apiKey) {
    throw new Error("API key is required. Please set it in the model settings.");
  }

  switch (config.provider) {
    case "openai":
      return new OpenAI({
        apiKey: config.apiKey,
        dangerouslyAllowBrowser: true,
      });
    case "anthropic":
      return new Anthropic({
        apiKey: config.apiKey,
      });
    case "groq":
      return new OpenAI({
        apiKey: config.apiKey,
        baseURL: "https://api.groq.com/v1",
        dangerouslyAllowBrowser: true,
      });
    default:
      throw new Error(`Unsupported provider: ${config.provider}`);
  }
}

function formatMessagesForProvider(prompt: string, config: ModelConfig) {
  if (config.provider === "anthropic") {
    return [{
      role: "user",
      content: config.systemPrompt 
        ? `${config.systemPrompt}\n\n${prompt}`
        : prompt
    }];
  } else {
    const messages = [];
    if (config.systemPrompt) {
      messages.push({
        role: "system" as const,
        content: config.systemPrompt,
      });
    }
    messages.push({
      role: "user" as const,
      content: prompt,
    });
    return messages;
  }
}

async function makeProviderRequest(
  client: OpenAI | Anthropic,
  messages: any[],
  config: ModelConfig,
  requireJson: boolean = false
) {
  try {
    if (config.provider === "anthropic") {
      const response = await (client as Anthropic).messages.create({
        model: config.model,
        messages,
        max_tokens: config.maxTokens,
        temperature: config.temperature,
      });

      if (!response.content || !Array.isArray(response.content) || response.content.length === 0) {
        throw new Error("Invalid response format from Anthropic API");
      }

      const firstContent = response.content[0];
      if (!('text' in firstContent)) {
        throw new Error("Missing text content in Anthropic response");
      }

      return firstContent.text;
    } else {
      const response = await (client as OpenAI).chat.completions.create({
        model: config.model,
        messages,
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        ...(requireJson ? { response_format: { type: "json_object" } } : {}),
      });
      return response.choices[0].message.content || "";
    }
  } catch (error: any) {
    console.error(`API Error (${config.provider}):`, error);
    throw new Error(error.message || `Failed to make ${config.provider} API request`);
  }
}

export async function generateMetaPrompt(
  input: MetaPromptInput,
  config: ModelConfig,
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
    const messages = formatMessagesForProvider(prompt, config);
    return await makeProviderRequest(client, messages, config);
  } catch (error: any) {
    console.error("Meta prompt generation error:", error);
    throw new Error(error.message || "Failed to generate meta prompt");
  }
}

export async function generateVariations(
  metaPrompt: string,
  count: number = 3,
  config: ModelConfig,
): Promise<string[]> {
  const jsonFormat = config.provider === "anthropic"
    ? 'Format your response as a JSON string with this exact structure: { "variations": ["variation1", "variation2", "variation3"] }'
    : 'Return a JSON object with exactly this structure: { "variations": ["variation1", "variation2", "variation3"] }';

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

${jsonFormat}`;

  try {
    const client = getClient(config);
    const messages = formatMessagesForProvider(prompt, config);
    const content = await makeProviderRequest(client, messages, config, true);

    const result = JSON.parse(content);
    if (!Array.isArray(result.variations)) {
      throw new Error("Invalid response format - variations is not an array");
    }
    return result.variations;
  } catch (error) {
    console.error("Variation generation error:", error);
    return [];
  }
}

export async function evaluatePrompt(
  prompt: string,
  testCase: string,
  criteria: Record<string, number>,
  config: ModelConfig,
): Promise<Record<string, number>> {
  const jsonFormat = config.provider === "anthropic"
    ? 'Format your response as a JSON object where keys are criteria names and values are scores between 0 and 1.'
    : 'Return a JSON object where keys are criteria names and values are scores between 0 and 1.';

  const evaluationPrompt = `Evaluate the following prompt against the test case using the given criteria:

Prompt:
${prompt}

Test Case:
${testCase}

Criteria:
${Object.keys(criteria).join(", ")}

${jsonFormat}`;

  try {
    const client = getClient(config);
    const messages = formatMessagesForProvider(evaluationPrompt, config);
    const content = await makeProviderRequest(client, messages, config, true);
    return JSON.parse(content);
  } catch (error) {
    console.error("Evaluation error:", error);
    return {};
  }
}

export async function generateTestCases(
  baseInput: string,
  metaPrompt: string,
  variations: string[],
  config: ModelConfig,
): Promise<Array<{
  input: string;
  criteria: Record<string, number>;
}>> {
  const jsonFormat = config.provider === "anthropic"
    ? 'Format your response as a JSON string with this structure: { "testCases": [{ "input": "test scenario", "criteria": { "criterionName": 0.8 } }] }'
    : 'Return a JSON object with this structure: { "testCases": [{ "input": "test scenario", "criteria": { "criterionName": 0.8 } }] }';

  const prompt = `Given this context:
Base Input: "${baseInput}"
Meta Prompt: "${metaPrompt}"
Generated Variations:
${variations.map((v, i) => `${i + 1}. ${v}`).join("\n")}

Generate a set of test cases that will effectively evaluate these prompt variations.
For each test case:
1. Create a challenging input scenario
2. Define evaluation criteria with weights (0-1) based on what's important for this specific use case

${jsonFormat}`;

  try {
    const client = getClient(config);
    const messages = formatMessagesForProvider(prompt, config);
    const content = await makeProviderRequest(client, messages, config, true);

    const result = JSON.parse(content);
    return result.testCases || [];
  } catch (error) {
    console.error("Test case generation error:", error);
    return [];
  }
}