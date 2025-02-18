import type { ModelConfig } from "@/components/settings/model-settings";
import { z } from "zod";

// Note: These are the only valid providers we support
export const VALID_PROVIDERS = ["openai", "anthropic", "gemini", "groq"] as const;
export type Provider = typeof VALID_PROVIDERS[number];

export interface ModelInfo {
  id: string;
  name: string;
  maxTokens: number;
}

export interface ProviderConfig {
  name: string;
  models: ModelInfo[];
}

export const MODEL_CONFIGS: Record<Provider, ProviderConfig> = {
  openai: {
    name: "OpenAI",
    models: [
      { id: "gpt-4o", name: "GPT-4 Turbo", maxTokens: 8192 },
      { id: "gpt-4o-mini", name: "GPT-4 Turbo Mini", maxTokens: 4096 }
    ]
  },
  anthropic: {
    name: "Anthropic",
    models: [
      { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet", maxTokens: 8192 },
      { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku", maxTokens: 4096 },
      { id: "claude-3-opus-20240229", name: "Claude 3 Opus", maxTokens: 8192 },
      { id: "claude-3-sonnet-20240229", name: "Claude 3 Sonnet", maxTokens: 8192 },
      { id: "claude-3-haiku-20240307", name: "Claude 3 Haiku", maxTokens: 4096 }
    ]
  },
  gemini: {
    name: "Google",
    models: [
      { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", maxTokens: 8192 },
      { id: "gemini-2.0-flash-lite-preview-02-05", name: "Gemini 2.0 Flash Lite", maxTokens: 4096 },
      { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", maxTokens: 4096 },
      { id: "gemini-1.5-flash-8b", name: "Gemini 1.5 Flash 8B", maxTokens: 4096 },
      { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", maxTokens: 8192 }
    ]
  },
  groq: {
    name: "Groq",
    models: [
      { id: "distil-whisper-large-v3-en", name: "Distil Whisper Large V3", maxTokens: 4096 },
      { id: "gemma2-7b-it", name: "Gemma2 7B", maxTokens: 8192 },
      { id: "llama-3-7b-versatile", name: "LLaMA 3 7B Versatile", maxTokens: 8192 },
      { id: "llama-3-8b-instant", name: "LLaMA 3 8B Instant", maxTokens: 8192 },
      { id: "llama-guard-1.8b", name: "LLaMA Guard 1.8B", maxTokens: 4096 },
      { id: "llama1-7nb-8192", name: "LLaMA1 7NB", maxTokens: 8192 },
      { id: "llama1-8b-8192", name: "LLaMA1 8B", maxTokens: 8192 },
      { id: "mistral-8x7b-32768", name: "Mixtral 8x7B", maxTokens: 32768 },
      { id: "whisper-large-v3", name: "Whisper Large V3", maxTokens: 4096 }
    ]
  }
} as const;

export function getDefaultConfig(provider: Provider, modelId: string): ModelConfig {
  const model = MODEL_CONFIGS[provider].models.find(m => m.id === modelId);
  return {
    provider,
    model: modelId,
    temperature: 0.7,
    maxTokens: model?.maxTokens || 4096,
    apiKey: "",
    systemPrompt: ""
  };
}