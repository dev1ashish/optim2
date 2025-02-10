import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useApiKeyStore } from "@/lib/api-keys";
import { MODEL_CONFIGS } from "@/lib/model-config";

export function ApiKeySettings() {
  const { keys, setKey, removeKey } = useApiKeyStore();
  const [newKeys, setNewKeys] = useState<Record<string, string>>(keys);

  const handleSave = (provider: string) => {
    setKey(provider, newKeys[provider]);
  };

  const handleRemove = (provider: string) => {
    removeKey(provider);
    setNewKeys(prev => {
      const { [provider]: _, ...rest } = prev;
      return rest;
    });
  };

  return (
    <Card className="p-6 space-y-6">
      <h2 className="text-lg font-semibold">API Keys</h2>
      <div className="space-y-4">
        {Object.entries(MODEL_CONFIGS).map(([provider, config]) => (
          <div key={provider} className="space-y-2">
            <Label>{config.name} API Key</Label>
            <div className="flex gap-2">
              <Input
                type="password"
                value={newKeys[provider] || ''}
                onChange={(e) => setNewKeys(prev => ({ ...prev, [provider]: e.target.value }))}
                placeholder={`Enter ${config.name} API Key`}
              />
              <Button 
                variant="outline" 
                onClick={() => handleSave(provider)}
                disabled={!newKeys[provider] || newKeys[provider] === keys[provider]}
              >
                Save
              </Button>
              {keys[provider] && (
                <Button 
                  variant="destructive" 
                  onClick={() => handleRemove(provider)}
                >
                  Remove
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
