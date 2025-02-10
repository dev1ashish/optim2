import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { MODEL_CONFIGS } from "@/lib/model-config";
import type { ModelConfig } from "@/components/settings/model-settings-section";

interface ModelSelectorProps {
  onModelConfigsChange: (configs: ModelConfig[]) => void;
  selectedConfigs: ModelConfig[];
}

export function ModelSelector({ onModelConfigsChange, selectedConfigs }: ModelSelectorProps) {
  const [selectedProviders, setSelectedProviders] = useState<Record<string, boolean>>(
    Object.fromEntries(
      Object.keys(MODEL_CONFIGS).map(provider => [
        provider,
        selectedConfigs.some(config => config.provider === provider)
      ])
    )
  );
  const [selectedModels, setSelectedModels] = useState<Record<string, string[]>>(
    Object.fromEntries(
      Object.entries(MODEL_CONFIGS).map(([provider, _]) => [
        provider,
        selectedConfigs
          .filter(config => config.provider === provider)
          .map(config => config.model)
      ])
    )
  );

  const handleProviderToggle = (provider: string, checked: boolean) => {
    setSelectedProviders(prev => ({ ...prev, [provider]: checked }));
    if (!checked) {
      // Remove selected models when provider is deselected
      const { [provider]: __, ...restModels } = selectedModels;
      setSelectedModels(restModels);
    } else {
      // Initialize empty array for selected models when provider is selected
      setSelectedModels(prev => ({ ...prev, [provider]: [] }));
    }
  };

  const handleModelToggle = (provider: string, modelId: string, checked: boolean) => {
    setSelectedModels(prev => ({
      ...prev,
      [provider]: checked 
        ? [...(prev[provider] || []), modelId]
        : (prev[provider] || []).filter(id => id !== modelId)
    }));
  };

  const handleUpdateConfigs = () => {
    const configs: ModelConfig[] = Object.entries(selectedProviders)
      .filter(([_, selected]) => selected)
      .flatMap(([provider]) => {
        const providerModels = selectedModels[provider] || [];
        return providerModels.map(modelId => ({
          ...MODEL_CONFIGS[provider as keyof typeof MODEL_CONFIGS].models.find(m => m.id === modelId)!,
          provider: provider as ModelConfig["provider"]
        }));
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
              <div className="ml-6">
                <div>
                  <Label className="text-sm">Models</Label>
                  <ScrollArea className="h-40 rounded border p-2">
                    <div className="space-y-2">
                      {config.models.map((model) => (
                        <div key={model.id} className="flex items-center gap-2">
                          <Checkbox
                            checked={(selectedModels[provider] || []).includes(model.id)}
                            onCheckedChange={(checked) => 
                              handleModelToggle(provider, model.id, checked as boolean)
                            }
                          />
                          <span className="text-sm">{model.name}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <Button 
        onClick={handleUpdateConfigs}
        disabled={Object.values(selectedModels).every(models => !models?.length)}
      >
        Update Model Configuration
      </Button>
    </Card>
  );
}