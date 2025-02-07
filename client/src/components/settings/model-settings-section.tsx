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
  provider: "openai" | "anthropic" | "groq";
  model: string;
  temperature: number;
  maxTokens: number;
  apiKey?: string;
  systemPrompt?: string;
}

interface ModelSettingsSectionProps {
  title: string;
  description: string;
  config: ModelConfig;
  onChange: (config: ModelConfig) => void;
  defaultConfig?: ModelConfig;
  useDefaultSettings?: boolean;
  onUseDefaultSettingsChange?: (use: boolean) => void;
  defaultSystemPrompt?: string;
}

const MODEL_OPTIONS = {
  openai: ["gpt-4o", "gpt-4", "gpt-3.5-turbo"],
  anthropic: ["claude-3-opus", "claude-3-sonnet", "claude-3-haiku"],
  groq: ["mixtral-8x7b", "llama2-70b"],
};

export function ModelSettingsSection({
  title,
  description,
  config,
  onChange,
  defaultConfig,
  useDefaultSettings,
  onUseDefaultSettingsChange,
  defaultSystemPrompt = "",
}: ModelSettingsSectionProps) {
  const [open, setOpen] = useState(false);
  const [apiKey, setApiKey] = useState(config.apiKey || "");
  const [systemPrompt, setSystemPrompt] = useState(config.systemPrompt || defaultSystemPrompt);
  const { toast } = useToast();

  useEffect(() => {
    setApiKey(config.apiKey || "");
    setSystemPrompt(config.systemPrompt || defaultSystemPrompt);
  }, [config.apiKey, config.systemPrompt, defaultSystemPrompt]);

  const handleSave = () => {
    if (!useDefaultSettings && !apiKey) {
      toast({
        title: "API Key Required",
        description: "Please enter your API key to continue",
        variant: "destructive",
      });
      return;
    }

    onChange({ ...config, apiKey, systemPrompt });
    setOpen(false);
    toast({
      title: "Settings Saved",
      description: "Your model settings have been updated.",
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
                <Label>Provider</Label>
                <Select
                  value={config.provider}
                  onValueChange={(value: ModelConfig["provider"]) =>
                    onChange({
                      ...config,
                      provider: value,
                      model: MODEL_OPTIONS[value][0],
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="anthropic">Anthropic</SelectItem>
                    <SelectItem value="groq">Groq</SelectItem>
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
                <Label>System Prompt</Label>
                <Textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="Enter a custom system prompt..."
                  className="h-32"
                />
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
                  max={4096}
                />
              </div>
            </>
          )}

          <Button onClick={handleSave} className="mt-4">
            Save Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}