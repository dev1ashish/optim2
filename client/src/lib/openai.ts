import OpenAI from "openai";
import Anthropic from '@anthropic-ai/sdk';
import { type MetaPromptInput } from "@shared/schema";
import type { ModelConfig } from "@/components/settings/model-settings-section";
import type { Provider } from "@/types";

interface ModelConfigItem {
    id: string;
    maxTokens: number;
}

interface ProviderConfig {
    models: ModelConfigItem[];
}

const MODEL_CONFIGS = {
    openai: {
        models: [
            { id: "gpt-4o", maxTokens: 8192 },
            { id: "gpt-4o-mini", maxTokens: 4096 },
            { id: "gpt-4o-mini-realtime-preview", maxTokens: 4096 },
            { id: "gpt-4o-realtime-preview", maxTokens: 8192 },
            { id: "gpt-4o-audio-preview", maxTokens: 4096 }
        ]
    },
    anthropic: {
        models: [
            { id: "claude-3-5-sonnet-20241022", maxTokens: 8192 },
            { id: "claude-3-5-haiku-20241022", maxTokens: 4096 },
            { id: "claude-3-opus-20240229", maxTokens: 8192 },
            { id: "claude-3-sonnet-20240229", maxTokens: 8192 },
            { id: "claude-3-haiku-20240307", maxTokens: 4096 }
        ]
    },
    groq: {
        models: [
            { id: "llama-3-70b-8192", maxTokens: 8192 },
            { id: "llama-3-8b-8192", maxTokens: 4096 },
            { id: "llama2-70b-4096", maxTokens: 4096 },
            { id: "llama2-7b-8192", maxTokens: 4096 },
            { id: "mixtral-8x7b-32768", maxTokens: 32768 }
        ]
    }
} as const;

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
                dangerouslyAllowBrowser: true
            });
        case "groq":
            return new OpenAI({
                apiKey: config.apiKey,
                baseURL: "https://api.groq.com/v1",
                dangerouslyAllowBrowser: true
            });
        case "gemini":
            throw new Error("Gemini support coming soon");
        default:
            throw new Error(`Unsupported provider: ${config.provider}`);
    }
}

function formatMessages(prompt: string, config: ModelConfig) {
    const messages = [];

    if (config.systemPrompt) {
        if (config.provider === "anthropic") {
            messages.push({
                role: "assistant" as const,
                content: config.systemPrompt
            });
        } else {
            messages.push({
                role: "system" as const,
                content: config.systemPrompt
            });
        }
    }

    messages.push({
        role: "user" as const,
        content: prompt
    });

    return messages;
}

function handleApiError(error: any) {
    console.error("API Error:", error);

    if (error.error?.message?.includes("max_tokens")) {
        throw new Error(`Token limit exceeded for model. Please reduce the max tokens setting.`);
    }

    if (error.error?.type === "tokens" || error.error?.code === "rate_limit_exceeded") {
        throw new Error(`Rate limit exceeded. Please wait a moment and try again.`);
    }

    if (error.error?.message) {
        throw new Error(`API Error: ${error.error.message}`);
    }

    throw error;
}

export interface StreamMetrics {
    startTime: number;
    endTime?: number;
    tokenCount: number;
    estimatedCost: number;
}

export async function* streamResponse(
    prompt: string,
    testCase: string,
    config: ModelConfig,
    onMetrics?: (metrics: StreamMetrics) => void
): AsyncGenerator<{ chunk: string, metrics: StreamMetrics }> {
    const client = getClient(config);
    const metrics: StreamMetrics = {
        startTime: Date.now(),
        tokenCount: 0,
        estimatedCost: 0
    };

    try {
        const modifiedConfig = {
            ...config,
            systemPrompt: prompt
        };

        const modelConfig = MODEL_CONFIGS[config.provider as Provider].models.find(m => m.id === config.model);
        const maxTokens = modelConfig?.maxTokens || 4096;

        if (config.provider === "anthropic") {
            const stream = await (client as Anthropic).messages.create({
                model: config.model,
                max_tokens: Math.min(config.maxTokens, maxTokens),
                temperature: config.temperature,
                messages: formatMessages(testCase, modifiedConfig).map(msg => ({
                    role: msg.role === "system" ? "assistant" : msg.role,
                    content: msg.content
                })),
                stream: true
            });

            for await (const chunk of stream) {
                if (chunk.type === 'content_block_delta' && chunk.delta?.type === 'text') {
                    const text = chunk.delta.text;
                    metrics.tokenCount += text.split(/\s+/).length;
                    metrics.estimatedCost = metrics.tokenCount * 0.00003;
                    onMetrics?.(metrics);
                    yield { chunk: text, metrics };
                }
            }
        } else if (config.provider === "openai" || config.provider === "groq") {
            const stream = await (client as OpenAI).chat.completions.create({
                model: config.model,
                messages: formatMessages(testCase, modifiedConfig),
                temperature: config.temperature,
                max_tokens: Math.min(config.maxTokens, maxTokens),
                stream: true
            });

            for await (const chunk of stream) {
                const text = chunk.choices[0]?.delta?.content || "";
                if (text) {
                    metrics.tokenCount += text.split(/\s+/).length;
                    metrics.estimatedCost = metrics.tokenCount * (config.provider === "groq" ? 0.000001 : 0.00001);
                    onMetrics?.(metrics);
                    yield { chunk: text, metrics };
                }
            }
        } else {
            throw new Error(`Streaming not supported for provider: ${config.provider}`);
        }

        metrics.endTime = Date.now();
        onMetrics?.(metrics);
    } catch (error) {
        handleApiError(error);
    }
}

export async function compareModels(
    prompt: string,
    testCase: string,
    configs: ModelConfig[],
    onProgress: (modelIndex: number, chunk: string, metrics: StreamMetrics) => void
): Promise<void> {
    const streams = configs.map((config, index) => {
        const stream = streamResponse(prompt, testCase, config, (metrics) => {
            onProgress(index, "", metrics);
        });
        return { stream, index };
    });

    await Promise.all(
        streams.map(async ({ stream, index }) => {
            try {
                for await (const { chunk, metrics } of stream) {
                    onProgress(index, chunk, metrics);
                }
            } catch (error) {
                console.error(`Error in model comparison for index ${index}:`, error);
                onProgress(index, `Error: ${error.message}`, {
                    startTime: Date.now(),
                    tokenCount: 0,
                    estimatedCost: 0
                });
            }
        })
    );
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
                max_tokens: config.maxTokens,
                temperature: config.temperature,
                messages: messages.map(msg => ({
                    role: msg.role === "system" ? "assistant" : msg.role,
                    content: msg.content
                }))
            });
            return response.content[0].text || "";
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
        return "";
    }
}

export async function generateVariations(
    metaPrompt: string,
    count: number = 3,
    config: ModelConfig
): Promise<string[]> {
    const prompt = `Generate exactly ${count} detailed variations of the following meta prompt:

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

Return ONLY a JSON object with this exact structure, containing exactly ${count} variations:
{
  "variations": [
    "First complete variation text here",
    "Second complete variation text here",

  ]
}
Important: The response must contain exactly ${count} variations, no more and no less.`;

    const client = getClient(config);
    try {
        let content: string;

        if (config.provider === "anthropic") {
            const response = await (client as Anthropic).messages.create({
                model: config.model,
                max_tokens: Math.max(config.maxTokens, 4096),
                temperature: config.temperature,
                messages: formatMessages(prompt, config).map(msg => ({
                    role: msg.role === "system" ? "assistant" : msg.role,
                    content: msg.content
                }))
            });
            content = response.content[0].text || "";
        } else {
            const response = await (client as OpenAI).chat.completions.create({
                model: config.model,
                messages: formatMessages(prompt, config),
                temperature: config.temperature,
                max_tokens: Math.max(config.maxTokens, 4096),
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

            if (result.variations.length !== count) {
                console.warn(`Expected ${count} variations but received ${result.variations.length}`);
            }

            return result.variations
                .slice(0, count)
                .map((v: any) => typeof v === 'string' ? v : JSON.stringify(v));
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
    const evaluationPrompt = `You are an objective evaluator. Analyze the following response against a test case and provide numerical scores.

Input Test Case: "${testCase}"

Response to Evaluate: "${prompt}"

Rate ONLY the following criteria, with scores from 0 to 1 (where 0 is poor and 1 is excellent).
Required criteria: ${Object.keys(criteria).join(", ")}

Return ONLY a JSON object with exactly these scores, no other text. Example format:
{
  "criterionName": 0.85,
  "anotherCriterion": 0.92
}`;

    const client = getClient(config);
    try {
        let content: string;

        if (config.provider === "anthropic") {
            const response = await (client as Anthropic).messages.create({
                model: config.model,
                max_tokens: config.maxTokens,
                temperature: config.temperature,
                messages: formatMessages(evaluationPrompt, config).map(msg => ({
                    role: msg.role === "system" ? "assistant" : msg.role,
                    content: msg.content
                }))
            });
            content = response.content[0].text || "";
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

        try {
            const result = JSON.parse(content.trim());
            const validatedScores: Record<string, number> = {};
            Object.keys(criteria).forEach(key => {
                const score = result[key];
                if (typeof score !== 'number' || score < 0 || score > 1) {
                    validatedScores[key] = 0.5;
                } else {
                    validatedScores[key] = score;
                }
            });
            return validatedScores;
        } catch (parseError) {
            console.error("Failed to parse evaluation response:", parseError);
            console.error("Raw content:", content);
            return Object.keys(criteria).reduce((acc, key) => ({ ...acc, [key]: 0.5 }), {});
        }
    } catch (error) {
        handleApiError(error);
        return Object.keys(criteria).reduce((acc, key) => ({ ...acc, [key]: 0 }), {});
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
                max_tokens: config.maxTokens,
                temperature: config.temperature,
                messages: formatMessages(prompt, config).map(msg => ({
                    role: msg.role === "system" ? "assistant" : msg.role,
                    content: msg.content
                }))
            });
            content = response.content[0].text || "";
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

export async function generateResponse(
    prompt: string,
    testCase: string,
    config: ModelConfig
): Promise<string> {
    const client = getClient(config);
    try {
        const modifiedConfig = {
            ...config,
            systemPrompt: prompt
        };

        if (config.provider === "anthropic") {
            const response = await (client as Anthropic).messages.create({
                model: config.model,
                max_tokens: config.maxTokens,
                temperature: config.temperature,
                messages: formatMessages(testCase, modifiedConfig).map(msg => ({
                    role: msg.role === "system" ? "assistant" : msg.role,
                    content: msg.content
                }))
            });
            return response.content[0].text || "";
        } else {
            const response = await (client as OpenAI).chat.completions.create({
                model: config.model,
                messages: formatMessages(testCase, modifiedConfig),
                temperature: config.temperature,
                max_tokens: config.maxTokens
            });
            return response.choices[0].message.content || "";
        }
    } catch (error) {
        handleApiError(error);
        return "";
    }
}