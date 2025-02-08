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
import { Settings2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  google: ["gemini-1.0-pro", "gemini-1.0-ultra", "gemini-1.0-pro-vision"]
};

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
      <DialogContent className="sm:max-w-[425px]">
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
            <>
              <div className="grid gap-2">
                <Label>API Key</Label>
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={`Enter your ${config.provider} API key`}
                />
              </div>

              <div className="grid gap-2">
                <Label>System Prompt</Label>
                <Textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="Enter system prompt to guide the model's behavior"
                  className="min-h-[100px]"
                />
              </div>

              <div className="grid gap-2">
                <Label>Provider</Label>
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
                    <SelectItem value="google">Google</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Model</Label>
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
                <Label>Temperature: {config.temperature}</Label>
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
                <Label>Max Tokens</Label>
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
                <>
                  <div className="grid gap-2">
                    <Label>Top P</Label>
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
                    <Label>Frequency Penalty</Label>
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
                    <Label>Presence Penalty</Label>
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
                    <Label>Seed</Label>
                    <Input
                      type="number"
                      value={config.seed || ''}
                      onChange={(e) =>
                        onChange({ ...config, seed: parseInt(e.target.value) || undefined })
                      }
                      placeholder="Optional seed for deterministic results"
                    />
                  </div>
                </>
              )}

              {/* Anthropic specific settings */}
              {config.provider === "anthropic" && (
                <div className="grid gap-2">
                  <Label>Top K</Label>
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
              )}

              {/* Groq specific settings */}
              {config.provider === "groq" && (
                <div className="grid gap-2">
                  <Label>Stop Sequences</Label>
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
              )}

              {/* Google specific settings */}
              {config.provider === "google" && (
                <>
                  <div className="grid gap-2">
                    <Label>Candidate Count</Label>
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
                    <Label>Safety Settings</Label>
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
                </>
              )}
            </>
          )}

          <Button onClick={handleSave} className="mt-4">Save Settings</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}