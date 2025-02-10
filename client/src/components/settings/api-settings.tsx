import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";

interface ApiKeys {
  OPENAI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  GROQ_API_KEY?: string;
  GEMINI_API_KEY?: string;
}

interface ApiSettingsProps {
  onApiKeysSet?: () => void;
}

export function ApiSettings({ onApiKeysSet }: ApiSettingsProps) {
  const [apiKeys, setApiKeys] = useState<ApiKeys>(() => {
    const stored = localStorage.getItem('api_keys');
    return stored ? JSON.parse(stored) : {};
  });
  const { toast } = useToast();

  const updateApiKeysMutation = useMutation({
    mutationFn: async (keys: ApiKeys) => {
      // In a real app, you might want to validate these keys with the providers
      localStorage.setItem('api_keys', JSON.stringify(keys));
      return keys;
    },
    onSuccess: () => {
      toast({
        title: "API Keys Updated",
        description: "Your API keys have been saved successfully.",
      });
      onApiKeysSet?.();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save API keys. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateApiKeysMutation.mutate(apiKeys);
  };

  return (
    <Card className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">API Settings</h2>
        <p className="text-muted-foreground">
          Configure your API keys for different AI providers. These keys will be used across all comparisons.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="openai">OpenAI API Key</Label>
          <Input
            id="openai"
            type="password"
            value={apiKeys.OPENAI_API_KEY || ""}
            onChange={(e) => setApiKeys(prev => ({ ...prev, OPENAI_API_KEY: e.target.value }))}
            placeholder="sk-..."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="anthropic">Anthropic API Key</Label>
          <Input
            id="anthropic"
            type="password"
            value={apiKeys.ANTHROPIC_API_KEY || ""}
            onChange={(e) => setApiKeys(prev => ({ ...prev, ANTHROPIC_API_KEY: e.target.value }))}
            placeholder="sk-ant-..."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="groq">Groq API Key</Label>
          <Input
            id="groq"
            type="password"
            value={apiKeys.GROQ_API_KEY || ""}
            onChange={(e) => setApiKeys(prev => ({ ...prev, GROQ_API_KEY: e.target.value }))}
            placeholder="gsk-..."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="gemini">Google Gemini API Key</Label>
          <Input
            id="gemini"
            type="password"
            value={apiKeys.GEMINI_API_KEY || ""}
            onChange={(e) => setApiKeys(prev => ({ ...prev, GEMINI_API_KEY: e.target.value }))}
          />
        </div>

        <Button
          type="submit"
          disabled={updateApiKeysMutation.isPending}
          className="w-full"
        >
          {updateApiKeysMutation.isPending ? "Saving..." : "Save API Keys"}
        </Button>
      </form>
    </Card>
  );
}