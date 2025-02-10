import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { MODEL_CONFIGS, getDefaultConfig } from "@/lib/model-config";
import { useApiKeyStore } from "@/lib/api-keys";
import type { ModelConfig } from "@/components/settings/model-settings-section";

interface ModelSelectorProps {
  onModelConfigsChange: (configs: ModelConfig[]) => void;
}

export function ModelSelector({ onModelConfigsChange }: ModelSelectorProps) {
  const { keys } = useApiKeyStore();
  const { toast } = useToast();
  const [selectedProviders, setSelectedProviders] = useState<Record<string, boolean>>({});
  const [selectedModels, setSelectedModels] = useState<Record<string, string[]>>({});

  const handleProviderToggle = (provider: string, checked: boolean) => {
    if (checked && !keys[provider]) {
      toast({
        title: "API Key Required",
        description: `Please set your ${MODEL_CONFIGS[provider].name} API key in the settings first.`,
        variant: "destructive"
      });
      return;
    }

    setSelectedProviders(prev => ({ ...prev, [provider]: checked }));
    if (!checked) {
      const { [provider]: __, ...restModels } = selectedModels;
      setSelectedModels(restModels);
    } else {
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
          ...getDefaultConfig(provider, modelId),
          apiKey: keys[provider]
        }));
      });

    if (configs.length === 0) {
      toast({
        title: "No Models Selected",
        description: "Please select at least one model to compare.",
        variant: "destructive"
      });
      return;
    }

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
                disabled={!keys[provider]}
              />
              <Label className="flex items-center gap-2">
                {config.name}
                {!keys[provider] && (
                  <span className="text-xs text-muted-foreground">(API key required)</span>
                )}
              </Label>
            </div>

            {selectedProviders[provider] && (
              <div className="ml-6">
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