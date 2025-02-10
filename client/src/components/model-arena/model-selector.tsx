import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MODEL_CONFIGS, getDefaultConfig } from "@/lib/model-config";
import type { ModelConfig } from "@/components/settings/model-settings-section";

interface ModelSelectorProps {
  onModelConfigsChange: (configs: ModelConfig[]) => void;
}

export function ModelSelector({ onModelConfigsChange }: ModelSelectorProps) {
  const [selectedProviders, setSelectedProviders] = useState<Record<string, boolean>>({});
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [selectedModels, setSelectedModels] = useState<Record<string, string>>({});

  const handleProviderToggle = (provider: string, checked: boolean) => {
    setSelectedProviders(prev => ({ ...prev, [provider]: checked }));
    if (!checked) {
      // Remove API key and selected model when provider is deselected
      const { [provider]: _, ...restApiKeys } = apiKeys;
      const { [provider]: __, ...restModels } = selectedModels;
      setApiKeys(restApiKeys);
      setSelectedModels(restModels);
    }
  };

  const handleApiKeyChange = (provider: string, key: string) => {
    setApiKeys(prev => ({ ...prev, [provider]: key }));
  };

  const handleModelSelect = (provider: string, modelId: string) => {
    setSelectedModels(prev => ({ ...prev, [provider]: modelId }));
  };

  const handleUpdateConfigs = () => {
    const configs: ModelConfig[] = Object.entries(selectedProviders)
      .filter(([_, selected]) => selected)
      .map(([provider]) => {
        const modelId = selectedModels[provider];
        return {
          ...getDefaultConfig(provider, modelId),
          apiKey: apiKeys[provider]
        };
      });
    onModelConfigsChange(configs);
  };

  return (
    <Card className="p-4 space-y-4">
      <h3 className="text-lg font-semibold mb-4">Select Models for Comparison</h3>
      
      <div className="space-y-4">
        {Object.entries(MODEL_CONFIGS).map(([provider, config]) => (
          <div key={provider} className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedProviders[provider] || false}
                onCheckedChange={(checked) => handleProviderToggle(provider, checked as boolean)}
              />
              <Label>{config.name}</Label>
            </div>
            
            {selectedProviders[provider] && (
              <div className="ml-6 space-y-2">
                <div>
                  <Label className="text-sm">API Key</Label>
                  <Input
                    type="password"
                    value={apiKeys[provider] || ""}
                    onChange={(e) => handleApiKeyChange(provider, e.target.value)}
                    placeholder={`Enter ${config.name} API Key`}
                  />
                </div>
                
                <div>
                  <Label className="text-sm">Model</Label>
                  <Select
                    value={selectedModels[provider]}
                    onValueChange={(value) => handleModelSelect(provider, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a model" />
                    </SelectTrigger>
                    <SelectContent>
                      {config.models.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <Button onClick={handleUpdateConfigs}>
        Update Model Configuration
      </Button>
    </Card>
  );
}
