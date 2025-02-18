
import { z } from "zod";
import type { ModelConfig } from "@/components/settings/model-settings-section";

export const VALID_PROVIDERS = ["openai", "anthropic", "gemini", "groq", "meta", "deepseek", "mistral", "alibaba"] as const;
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
  meta: {
    name: "Meta",
    models: [
      { id: "llama-3-3-70b-specdec", name: "LLaMA 3.3 70B SpecDec", maxTokens: 8192 },
      { id: "llama-3-2-1b-preview", name: "LLaMA 3.2 1B", maxTokens: 128000 },
      { id: "llama-3-2-3b-preview", name: "LLaMA 3.2 3B", maxTokens: 128000 },
      { id: "llama-3-2-11b-vision-preview", name: "LLaMA 3.2 11B Vision", maxTokens: 128000 },
      { id: "llama-3-2-90b-vision-preview", name: "LLaMA 3.2 90B Vision", maxTokens: 128000 },
      { id: "llama-3-3-70b-versatile", name: "LLaMA 3.3 70B Versatile", maxTokens: 32768 },
      { id: "llama-3-1-8b-instant", name: "LLaMA 3.1 8B Instant", maxTokens: 8192 }
    ]
  },
  deepseek: {
    name: "DeepSeek",
    models: [
      { id: "deepseek-r1-distill-qwen-32b", name: "DeepSeek R1 Distill Qwen 32B", maxTokens: 16384 },
      { id: "deepseek-r1-distill-llama-70b-specdec", name: "DeepSeek R1 Distill LLaMA 70B SpecDec", maxTokens: 16384 },
      { id: "deepseek-r1-distill-llama-70b", name: "DeepSeek R1 Distill LLaMA 70B", maxTokens: 16384 }
    ]
  },
  alibaba: {
    name: "Alibaba Cloud",
    models: [
      { id: "qwen-2-5-32b", name: "Qwen 2.5 32B", maxTokens: 8192 }
    ]
  },
  mistral: {
    name: "Mistral",
    models: [
      { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B", maxTokens: 32768 }
    ]
  },
  groq: {
    name: "Groq",
    models: [
      { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B", maxTokens: 32768 },
      { id: "llama2-70b-4096", name: "LLaMA2 70B", maxTokens: 4096 }
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
