import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Settings2, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export interface ModelConfig {
  provider: "openai" | "anthropic" | "groq" | "google";
  model: string;
  temperature: number;
  maxTokens: number;
  apiKey?: string;
  systemPrompt?: string;
  // OpenAI specific
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  responseFormat?: { type: string };
  seed?: number;
  tools?: any[];
  toolChoice?: string;
  // Anthropic specific
  topK?: number;
  // Groq specific
  stopSequences?: string[];
  // Google specific
  candidateCount?: number;
  safetySettings?: Array<{
    category: string;
    threshold: string;
  }>;
}

interface ModelSettingsSectionProps {
  title: string;
  description: string;
  config: ModelConfig;
  onChange: (config: ModelConfig) => void;
  defaultConfig?: ModelConfig;
  useDefaultSettings?: boolean;
  onUseDefaultSettingsChange?: (use: boolean) => void;
}

const MODEL_OPTIONS = {
  openai: ["gpt-4o", "gpt-4", "gpt-3.5-turbo"],
  anthropic: ["claude-3-opus-20240229", "claude-3-sonnet-20240229", "claude-3-haiku-20240229"],
  groq: ["mixtral-8x7b", "llama2-70b"],
  google: ["gemini-2.0-flash", "gemini-2.0-flash-lite-preview-02-05", "gemini-1.5-flash", "gemini-1.5-flash-8b", "gemini-1.5-pro"]
};

const PARAMETER_INFO = {
  temperature: "Controls randomness in the output. Higher values (e.g., 0.8) make the output more random, while lower values (e.g., 0.2) make it more focused and deterministic.",
  maxTokens: "The maximum length of the model's response in tokens. One token is roughly 4 characters for English text.",
  topP: "An alternative to temperature, controls randomness by limiting cumulative probability of next token choices.",
  frequencyPenalty: "Reduces repetition by penalizing tokens based on their frequency in the text so far.",
  presencePenalty: "Reduces repetition by penalizing tokens that have appeared at all in the text so far.",
  seed: "A fixed number that makes the output deterministic. Same seed + same input = same output.",
  topK: "Limits the cumulative probability distribution to top K tokens during text generation.",
  candidateCount: "Number of alternative responses to generate.",
  stopSequences: "Sequences that will cause the model to stop generating further tokens.",
  safetySettings: "Configuration for content filtering and safety thresholds."
};

function ParameterLabel({ label, info }: { label: string; info: string }) {
  return (
    <div className="flex items-center gap-2">
      <Label>{label}</Label>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p>{info}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

export function ModelSettingsSection({ 
  title,
  description,
  config,
  onChange,
  defaultConfig,
  useDefaultSettings,
  onUseDefaultSettingsChange
}: ModelSettingsSectionProps) {
  const [open, setOpen] = useState(false);
  const [apiKey, setApiKey] = useState(config.apiKey || "");
  const [systemPrompt, setSystemPrompt] = useState(config.systemPrompt || "");
  const { toast } = useToast();

  useEffect(() => {
    setApiKey(config.apiKey || "");
    setSystemPrompt(config.systemPrompt || "");
  }, [config.apiKey, config.systemPrompt]);

  const handleSave = () => {
    if (!useDefaultSettings && !apiKey) {
      toast({
        title: "API Key Required",
        description: "Please enter your API key to continue",
        variant: "destructive"
      });
      return;
    }

    onChange({ ...config, apiKey, systemPrompt });
    setOpen(false);
    toast({
      title: "Settings Saved",
      description: "Your model settings have been updated."
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Settings2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {defaultConfig && (
            <div className="flex items-center gap-2">
              <Label>Use Default Settings</Label>
              <input
                type="checkbox"
                checked={useDefaultSettings}
                onChange={(e) => onUseDefaultSettingsChange?.(e.target.checked)}
              />
            </div>
          )}

          {!useDefaultSettings && (
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="grid gap-2">
                  <ParameterLabel label="API Key" info="Your API key for authentication with the selected provider" />
                  <Input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={`Enter your ${config.provider} API key`}
                  />
                </div>

                <div className="grid gap-2">
                  <ParameterLabel label="System Prompt" info="Initial instructions that define the AI's behavior and role" />
                  <Textarea
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    placeholder="Enter system prompt to guide the model's behavior"
                    className="min-h-[100px]"
                  />
                </div>

                <div className="grid gap-2">
                  <ParameterLabel label="Provider" info="The AI model provider to use" />
                  <Select
                    value={config.provider}
                    onValueChange={(value: ModelConfig["provider"]) =>
                      onChange({ ...config, provider: value, model: MODEL_OPTIONS[value][0] })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="anthropic">Anthropic</SelectItem>
                      <SelectItem value="groq">Groq</SelectItem>
                      <SelectItem value="google">Google (Gemini)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <ParameterLabel label="Model" info="Specific model version to use" />
                  <Select
                    value={config.model}
                    onValueChange={(value) =>
                      onChange({ ...config, model: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MODEL_OPTIONS[config.provider].map((model) => (
                        <SelectItem key={model} value={model}>
                          {model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <ParameterLabel label={`Temperature: ${config.temperature}`} info={PARAMETER_INFO.temperature} />
                  <Slider
                    value={[config.temperature]}
                    min={0}
                    max={2}
                    step={0.1}
                    onValueChange={([value]) =>
                      onChange({ ...config, temperature: value })
                    }
                  />
                </div>

                <div className="grid gap-2">
                  <ParameterLabel label="Max Tokens" info={PARAMETER_INFO.maxTokens} />
                  <Input
                    type="number"
                    value={config.maxTokens}
                    onChange={(e) =>
                      onChange({ ...config, maxTokens: parseInt(e.target.value) })
                    }
                    min={1}
                    max={100000}
                  />
                </div>

                {/* OpenAI specific settings */}
                {config.provider === "openai" && (
                  <div className="space-y-4 border-t pt-4">
                    <h4 className="font-medium">OpenAI Specific Settings</h4>
                    <div className="grid gap-2">
                      <ParameterLabel label="Top P" info={PARAMETER_INFO.topP} />
                      <Slider
                        value={[config.topP || 1]}
                        min={0}
                        max={1}
                        step={0.1}
                        onValueChange={([value]) =>
                          onChange({ ...config, topP: value })
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <ParameterLabel label="Frequency Penalty" info={PARAMETER_INFO.frequencyPenalty} />
                      <Slider
                        value={[config.frequencyPenalty || 0]}
                        min={-2}
                        max={2}
                        step={0.1}
                        onValueChange={([value]) =>
                          onChange({ ...config, frequencyPenalty: value })
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <ParameterLabel label="Presence Penalty" info={PARAMETER_INFO.presencePenalty} />
                      <Slider
                        value={[config.presencePenalty || 0]}
                        min={-2}
                        max={2}
                        step={0.1}
                        onValueChange={([value]) =>
                          onChange({ ...config, presencePenalty: value })
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <ParameterLabel label="Seed" info={PARAMETER_INFO.seed} />
                      <Input
                        type="number"
                        value={config.seed || ''}
                        onChange={(e) =>
                          onChange({ ...config, seed: parseInt(e.target.value) || undefined })
                        }
                        placeholder="Optional seed for deterministic results"
                      />
                    </div>
                  </div>
                )}

                {/* Anthropic specific settings */}
                {config.provider === "anthropic" && (
                  <div className="space-y-4 border-t pt-4">
                    <h4 className="font-medium">Anthropic Specific Settings</h4>
                    <div className="grid gap-2">
                      <ParameterLabel label="Top K" info={PARAMETER_INFO.topK} />
                      <Input
                        type="number"
                        value={config.topK || ''}
                        onChange={(e) =>
                          onChange({ ...config, topK: parseInt(e.target.value) || undefined })
                        }
                        min={1}
                        placeholder="Optional top-k for sampling"
                      />
                    </div>
                  </div>
                )}

                {/* Groq specific settings */}
                {config.provider === "groq" && (
                  <div className="space-y-4 border-t pt-4">
                    <h4 className="font-medium">Groq Specific Settings</h4>
                    <div className="grid gap-2">
                      <ParameterLabel label="Stop Sequences" info={PARAMETER_INFO.stopSequences} />
                      <Textarea
                        value={config.stopSequences?.join('\n') || ''}
                        onChange={(e) =>
                          onChange({ 
                            ...config, 
                            stopSequences: e.target.value ? e.target.value.split('\n') : undefined 
                          })
                        }
                        placeholder="Enter stop sequences (one per line)"
                      />
                    </div>
                  </div>
                )}

                {/* Google specific settings */}
                {config.provider === "google" && (
                  <div className="space-y-4 border-t pt-4">
                    <h4 className="font-medium">Google (Gemini) Specific Settings</h4>
                    <div className="grid gap-2">
                      <ParameterLabel label="Candidate Count" info={PARAMETER_INFO.candidateCount} />
                      <Input
                        type="number"
                        value={config.candidateCount || ''}
                        onChange={(e) =>
                          onChange({ ...config, candidateCount: parseInt(e.target.value) || undefined })
                        }
                        min={1}
                        placeholder="Number of response candidates"
                      />
                    </div>
                    <div className="grid gap-2">
                      <ParameterLabel label="Safety Settings" info={PARAMETER_INFO.safetySettings} />
                      <Textarea
                        value={config.safetySettings ? JSON.stringify(config.safetySettings, null, 2) : ''}
                        onChange={(e) => {
                          try {
                            const settings = e.target.value ? JSON.parse(e.target.value) : undefined;
                            onChange({ ...config, safetySettings: settings });
                          } catch (error) {
                            // Invalid JSON, don't update
                          }
                        }}
                        placeholder='[{"category": "HARM_CATEGORY", "threshold": "BLOCK_LOW_AND_ABOVE"}]'
                      />
                    </div>
                  </div>
                )}
              </div>

              <Button onClick={handleSave} className="w-full">Save Settings</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}