import { z } from "zod";

export type Provider = "openai" | "anthropic" | "groq" | "gemini";

export interface ModelConfig {
  provider: Provider;
  model: string;
  temperature: number;
  maxTokens: number;
  apiKey?: string;
  systemPrompt?: string;
  responseFormat?: { type: string };
  seed?: number;
  tools?: any[];
  toolChoice?: string;
  topK?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
}

export interface StreamMetrics {
  startTime: number;
  endTime?: number;
  tokenCount: number;
  totalTokens?: number;
  estimatedCost: number;
}
