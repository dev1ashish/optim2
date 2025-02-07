import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Settings2 } from "lucide-react";
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

export interface ModelConfig {
  provider: "openai" | "anthropic" | "groq";
  model: string;
  temperature: number;
  maxTokens: number;
}

interface ModelSettingsProps {
  config: ModelConfig;
  onChange: (config: ModelConfig) => void;
}

const MODEL_OPTIONS = {
  openai: ["gpt-4o", "gpt-4", "gpt-3.5-turbo"],
  anthropic: ["claude-3-opus", "claude-3-sonnet", "claude-3-haiku"],
  groq: ["mixtral-8x7b", "llama2-70b"]
};

export function ModelSettings({ config, onChange }: ModelSettingsProps) {
  const [open, setOpen] = useState(false);

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
          <DialogDescription>
            Configure the AI model and its parameters
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
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
              max={4096}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
