import { ModelConfig } from "@/components/settings/model-settings-section";

// Define model groups by provider
export const MODEL_CONFIGS = {
  openai: {
    name: "OpenAI",
    models: [
      { id: "gpt-4o", name: "GPT-4 Turbo", maxTokens: 4096 },
      { id: "gpt-4o-mini", name: "GPT-4 Turbo Mini", maxTokens: 4096 },
      { id: "gpt-4o-mini-realtime-preview", name: "GPT-4 Mini Realtime", maxTokens: 4096 },
      { id: "gpt-4o-realtime-preview", name: "GPT-4 Realtime", maxTokens: 4096 },
      { id: "gpt-4o-audio-preview", name: "GPT-4 Audio", maxTokens: 4096 }
    ]
  },
  anthropic: {
    name: "Anthropic",
    models: [
      { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet", maxTokens: 200000 },
      { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku", maxTokens: 200000 },
      { id: "claude-3-opus-20240229", name: "Claude 3 Opus", maxTokens: 200000 },
      { id: "claude-3-sonnet-20240229", name: "Claude 3 Sonnet", maxTokens: 200000 },
      { id: "claude-3-haiku-20240307", name: "Claude 3 Haiku", maxTokens: 200000 }
    ]
  },
  gemini: {
    name: "Google Gemini",
    models: [
      { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", maxTokens: 32768 },
      { id: "gemini-2.0-flash-lite-preview-02-05", name: "Gemini 2.0 Flash Lite", maxTokens: 32768 },
      { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", maxTokens: 32768 },
      { id: "gemini-1.5-flash-8b", name: "Gemini 1.5 Flash 8B", maxTokens: 32768 },
      { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", maxTokens: 32768 }
    ]
  },
  groq: {
    name: "Groq",
    models: [
      { id: "llama-3-70b-8192", name: "LLaMA-3 70B", maxTokens: 8192 },
      { id: "llama-3-8b-8192", name: "LLaMA-3 8B", maxTokens: 8192 },
      { id: "llama2-70b-4096", name: "LLaMA2 70B", maxTokens: 4096 },
      { id: "llama2-7b-8192", name: "LLaMA2 7B", maxTokens: 8192 },
      { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B", maxTokens: 32768 }
    ]
  }
};

export const getDefaultConfig = (provider: string, modelId: string): ModelConfig => ({
  provider,
  model: modelId,
  temperature: 0.7,
  maxTokens: MODEL_CONFIGS[provider].models.find(m => m.id === modelId)?.maxTokens || 4096,
  apiKey: "",
  systemPrompt: "",
  responseFormat: { type: "json_object" },
  // Provider specific settings
  topP: 1,
  frequencyPenalty: 0,
  presencePenalty: 0,
  seed: undefined,
  tools: undefined,
  toolChoice: undefined,
  topK: undefined,
  stopSequences: undefined
});
