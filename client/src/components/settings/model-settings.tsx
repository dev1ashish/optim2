import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { useToast } from "@/hooks/use-toast";
import { Settings2 } from "lucide-react";
import { MODEL_CONFIGS } from "@/lib/model-config";

export interface ModelConfig {
  provider: "openai" | "anthropic" | "groq" | "gemini";
  model: string;
  temperature: number;
  maxTokens: number;
  apiKey?: string;
  systemPrompt?: string;
}

interface ModelSettingsProps {
  config: ModelConfig;
  onChange: (config: ModelConfig) => void;
}

export function ModelSettings({ config, onChange }: ModelSettingsProps) {
  const [open, setOpen] = useState(false);
  const [apiKey, setApiKey] = useState(config.apiKey || "");
  const { toast } = useToast();

  useEffect(() => {
    setApiKey(config.apiKey || "");
  }, [config.apiKey]);

  const handleSave = () => {
    if (!apiKey) {
      toast({
        title: "API Key Required",
        description: "Please enter your API key to continue",
        variant: "destructive"
      });
      return;
    }

    onChange({ ...config, apiKey });
    setOpen(false);
    toast({
      title: "Settings Saved",
      description: "Your API key and model settings have been updated."
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
          <DialogTitle>Model Settings</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
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
                  model: MODEL_CONFIGS[value].models[0].id,
                  maxTokens: MODEL_CONFIGS[value].models[0].maxTokens 
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
                <SelectItem value="gemini">Google</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Model</Label>
            <Select
              value={config.model}
              onValueChange={(value) => {
                const selectedModel = MODEL_CONFIGS[config.provider].models.find(m => m.id === value);
                onChange({
                  ...config,
                  model: value,
                  maxTokens: selectedModel?.maxTokens || 4096
                });
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODEL_CONFIGS[config.provider].models.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name}
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
              max={32768}
            />
          </div>

          <Button onClick={handleSave} className="mt-4">Save Settings</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}