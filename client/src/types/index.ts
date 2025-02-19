// Provider types
export type Provider = "openai" | "anthropic" | "groq";

export interface ModelConfig {
  provider: Provider;
  model: string;
  temperature: number;
  maxTokens: number;
  apiKey?: string;
  systemPrompt?: string;
}