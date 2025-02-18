
import { z } from "zod";
import type { ModelConfig } from "@/components/settings/model-settings-section";

export const VALID_PROVIDERS = ["openai", "anthropic", "gemini", "groq"] as const;
export type Provider = typeof VALID_PROVIDERS[number];

export const MODEL_CONFIGS = {
  openai: {
    name: "OpenAI",
    models: [
      { id: "gpt-4o", name: "GPT-4 Turbo", maxTokens: 4096 },
      { id: "gpt-4o-mini", name: "GPT-4 Turbo Mini", maxTokens: 4096 }
    ]
  },
  anthropic: {
    name: "Anthropic",
    models: [
      { id: "claude-3-opus-20240229", name: "Claude 3 Opus", maxTokens: 32768 },
      { id: "claude-3-sonnet-20240229", name: "Claude 3 Sonnet", maxTokens: 32768 },
      { id: "claude-3-haiku-20240307", name: "Claude 3 Haiku", maxTokens: 32768 }
    ]
  },
  groq: {
    name: "Groq",
    models: [
      { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B", maxTokens: 32768 },
      { id: "llama2-70b-4096", name: "LLaMA2 70B", maxTokens: 4096 },
      { id: "llama2-7b-32768", name: "LLaMA2 7B", maxTokens: 32768 }
    ]
  },
  gemini: {
    name: "Google",
    models: [
      { id: "gemini-pro", name: "Gemini Pro", maxTokens: 32768 },
      { id: "gemini-pro-vision", name: "Gemini Pro Vision", maxTokens: 32768 }
    ]
  }
} as const;

export const getDefaultConfig = (provider: Provider, modelId: string): ModelConfig => ({
  provider,
  model: modelId,
  temperature: 0.7,
  maxTokens: MODEL_CONFIGS[provider].models.find(m => m.id === modelId)?.maxTokens || 4096,
  apiKey: "",
  systemPrompt: ""
});
