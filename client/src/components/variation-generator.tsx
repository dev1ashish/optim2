import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ModelSettingsSection, type ModelConfig } from "@/components/settings/model-settings-section";

interface VariationGeneratorProps {
  metaPrompt: string;
  onGenerate: (count: number) => void;
  variations: string[];
  isLoading?: boolean;
  modelConfig: ModelConfig;
  onModelConfigChange: (config: ModelConfig) => void;
  defaultConfig: ModelConfig;
  useDefaultSettings: boolean;
  onUseDefaultSettingsChange: (use: boolean) => void;
}

export function VariationGenerator({
  metaPrompt,
  onGenerate,
  variations,
  isLoading,
  modelConfig,
  onModelConfigChange,
  defaultConfig,
  useDefaultSettings,
  onUseDefaultSettingsChange
}: VariationGeneratorProps) {
  const [count, setCount] = useState("3");

  return (
    <Card className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <Label className="text-lg">Generate Variations</Label>
        <ModelSettingsSection
          title="Variation Generation Settings"
          description="Configure the model for generating prompt variations"
          config={modelConfig}
          onChange={onModelConfigChange}
          defaultConfig={defaultConfig}
          useDefaultSettings={useDefaultSettings}
          onUseDefaultSettingsChange={onUseDefaultSettingsChange}
        />
      </div>

      <div>
        <Label>Original Meta Prompt</Label>
        <Textarea
          value={metaPrompt}
          readOnly
          className="mt-2"
        />
      </div>

      <div className="flex items-end gap-4">
        <div className="flex-1">
          <Label>Number of Variations</Label>
          <Select
            value={count}
            onValueChange={setCount}
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2">2 variations</SelectItem>
              <SelectItem value="3">3 variations</SelectItem>
              <SelectItem value="4">4 variations</SelectItem>
              <SelectItem value="5">5 variations</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button 
          onClick={() => onGenerate(parseInt(count))}
          disabled={isLoading}
        >
          {isLoading ? "Generating..." : "Generate Variations"}
        </Button>
      </div>

      <div className="space-y-4">
        <Label>Generated Variations</Label>
        {variations.map((variation, index) => (
          <Textarea
            key={index}
            value={variation}
            readOnly
            className="mt-2"
          />
        ))}
      </div>
    </Card>
  );
}