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
    },
    gemini: {
        models: [
            { id: "gemini-2.0-flash", maxTokens: 8192 },
            { id: "gemini-2.0-flash-lite-preview-02-05", maxTokens: 4096 },
            { id: "gemini-1.5-flash", maxTokens: 4096 },
            { id: "gemini-1.5-flash-8b", maxTokens: 4096 },
            { id: "gemini-1.5-pro", maxTokens: 8192 }
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
            });
        case "groq":
            // Based on image_1739876676033.png, using OpenAI client with Groq baseURL
            return new OpenAI({
                apiKey: config.apiKey,
                baseURL: "https://api.groq.com/v1",
                dangerouslyAllowBrowser: true
            });
        case "gemini":
            // Based on image_1739876758413.png
            const { GoogleGenerativeAI } = require("@google/generative-ai");
            return new GoogleGenerativeAI(config.apiKey);
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
    scores?: Record<string, number>;
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

        switch (config.provider) {
            case "anthropic":
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
                break;

            case "groq":
            case "openai":
                const openaiStream = await (client as OpenAI).chat.completions.create({
                    model: config.model,
                    messages: formatMessages(testCase, modifiedConfig),
                    temperature: config.temperature,
                    max_tokens: Math.min(config.maxTokens, maxTokens),
                    stream: true
                });

                for await (const chunk of openaiStream) {
                    const text = chunk.choices[0]?.delta?.content || "";
                    if (text) {
                        metrics.tokenCount += text.split(/\s+/).length;
                        metrics.estimatedCost = metrics.tokenCount * (config.provider === "groq" ? 0.000001 : 0.00001);
                        onMetrics?.(metrics);
                        yield { chunk: text, metrics };
                    }
                }
                break;

            case "gemini":
                const genAI = client;
                const model = genAI.getGenerativeModel({ model: config.model });
                const result = await model.generateContentStream(testCase);

                for await (const chunk of result.stream) {
                    const text = chunk.text();
                    if (text) {
                        metrics.tokenCount += text.split(/\s+/).length;
                        metrics.estimatedCost = metrics.tokenCount * 0.00001;
                        onMetrics?.(metrics);
                        yield { chunk: text, metrics };
                    }
                }
                break;
        }

        metrics.endTime = Date.now();
        onMetrics?.(metrics);
    } catch (error) {
        handleApiError(error);
    }
}

interface EvaluationCriterion {
  id: string;
  description: string;
  name: string;
}

export async function evaluatePrompt(
    response: string,
    testCase: string,
    criteria: Record<string, number>,
    config: ModelConfig
): Promise<Record<string, number>> {
    // Force GPT-4o for evaluations
    const evaluationConfig: ModelConfig = {
        provider: "openai",
        model: "gpt-4o",
        temperature: 0.3,
        maxTokens: 2000,
        apiKey: config.apiKey,
        systemPrompt: "You are an objective evaluator tasked with scoring AI responses against specific criteria."
    };

    const evaluationPrompt = `Evaluate this AI response against the given test case and criteria.
        
Test Case: "${testCase}"
        
Response to Evaluate: "${response}"
        
Rate each criterion from 0 to 1 (where 0 is poor and 1 is excellent):
${Object.entries(criteria).map(([criterion]) => `- ${criterion}`).join('\n')}
        
Provide scores in this exact JSON format:
{
${Object.keys(criteria).map(criterion => `  "${criterion}": 0.85`).join(',\n')}
}
        
Your response must be valid JSON containing only the scores.`;

    try {
        console.log("Starting evaluation with GPT-4o");
        const client = getClient(evaluationConfig);

        const completion = await (client as OpenAI).chat.completions.create({
            model: evaluationConfig.model,
            messages: [
                {
                    role: "system",
                    content: evaluationConfig.systemPrompt
                },
                {
                    role: "user",
                    content: evaluationPrompt
                }
            ],
            temperature: evaluationConfig.temperature,
            max_tokens: evaluationConfig.maxTokens,
            response_format: { type: "json_object" }
        });

        const content = completion.choices[0].message.content;
        console.log("Raw evaluation response:", content);

        if (!content) {
            console.error("Empty evaluation response");
            return Object.keys(criteria).reduce((acc, key) => ({ ...acc, [key]: 0 }), {});
        }

        const result = JSON.parse(content);
        const validatedScores: Record<string, number> = {};

        Object.keys(criteria).forEach(key => {
            const score = result[key];
            if (typeof score !== 'number' || score < 0 || score > 1) {
                console.warn(`Invalid score for ${key}:`, score);
                validatedScores[key] = 0.5;
            } else {
                validatedScores[key] = score;
            }
        });

        console.log("Final validated scores:", validatedScores);
        return validatedScores;
    } catch (error) {
        console.error("Evaluation error:", error);
        return Object.keys(criteria).reduce((acc, key) => ({ ...acc, [key]: 0 }), {});
    }
}

export async function compareModels(
    prompt: string,
    testCase: string,
    configs: ModelConfig[],
    onProgress: (modelIndex: number, chunk: string, metrics: StreamMetrics) => void,
    evaluationCriteria: EvaluationCriterion[]
): Promise<void> {
    const streams = configs.map((config, index) => {
        const stream = streamResponse(prompt, testCase, config, (metrics) => {
            onProgress(index, "", metrics);
        });
        return { stream, index, config };
    });

    await Promise.all(
        streams.map(async ({ stream, index, config }) => {
            try {
                let fullResponse = "";
                let lastMetrics: StreamMetrics | null = null;

                for await (const { chunk, metrics } of stream) {
                    fullResponse += chunk;
                    lastMetrics = metrics;
                    onProgress(index, chunk, metrics);
                }

                // Always evaluate using GPT-4o
                if (evaluationCriteria?.length) {
                    console.log(`Starting evaluation for model ${index}`);
                    const criteriaMap = evaluationCriteria.reduce((acc, c) => ({ ...acc, [c.name]: 0 }), {});

                    const scores = await evaluatePrompt(
                        fullResponse,
                        testCase,
                        criteriaMap,
                        config
                    );

                    console.log(`Evaluation scores for model ${index}:`, scores);

                    // Merge scores with last metrics
                    const finalMetrics: StreamMetrics = {
                        startTime: lastMetrics?.startTime || Date.now(),
                        endTime: Date.now(),
                        tokenCount: lastMetrics?.tokenCount || 0,
                        estimatedCost: lastMetrics?.estimatedCost || 0,
                        scores
                    };

                    onProgress(index, "", finalMetrics);
                }
            } catch (error) {
                console.error(`Error in model comparison for index ${index}:`, error);
                onProgress(index, `Error: ${error instanceof Error ? error.message : 'Unknown error'}`, {
                    startTime: Date.now(),
                    endTime: Date.now(),
                    tokenCount: 0,
                    estimatedCost: 0,
                    scores: evaluationCriteria.reduce((acc, c) => ({ ...acc, [c.name]: 0 }), {})
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
            return response.content[0].text || "";
        } else {
            const response = await (client as OpenAI).chat.completions.create({
                model: config.model,
                messages: formatMessages(prompt, config),
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
    "Third complete variation text here"
  ]
}`;

    try {
        const client = getClient(config);

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
            const content = response.content[0].text || "";
            try {
                const result = JSON.parse(content);
                return result.variations.slice(0, count);
            } catch (error) {
                console.error("Failed to parse variations:", error);
                return [];
            }
        } else {
            const response = await (client as OpenAI).chat.completions.create({
                model: config.model,
                messages: formatMessages(prompt, config),
                temperature: config.temperature,
                max_tokens: Math.max(config.maxTokens, 4096),
                response_format: { type: "json_object" }
            });
            const content = response.choices[0].message.content || "";
            try {
                const result = JSON.parse(content);
                return result.variations.slice(0, count);
            } catch (error) {
                console.error("Failed to parse variations:", error);
                return [];
            }
        }
    } catch (error) {
        handleApiError(error);
        return [];
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