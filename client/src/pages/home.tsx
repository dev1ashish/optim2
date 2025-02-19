import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { GlobalSettings, type GlobalSettings as GlobalSettingsType } from "@/components/settings/global-settings";
import { 
  generateMetaPrompt, 
  generateVariations, 
  evaluateVariations,
  DEFAULT_EVALUATION_CRITERIA,
  type EvaluationScore 
} from "@/lib/openai";
import type { MetaPromptInput } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Loader2 } from "lucide-react";
import { PromptFlow } from "@/components/prompt-flow";
import 'reactflow/dist/style.css';

interface ProcessResult {
  metaPrompt: string;
  variations: string[];
  evaluations: Array<{
    variationIndex: number;
    scores: EvaluationScore[];
  }>;
}

export default function Home() {
  const [showSettings, setShowSettings] = useState(true);
  const [globalSettings, setGlobalSettings] = useState<GlobalSettingsType>({});
  const [baseInput, setBaseInput] = useState("");
  const [result, setResult] = useState<ProcessResult | null>(null);
  const { toast } = useToast();

  const generateMutation = useMutation({
    mutationFn: async (input: MetaPromptInput) => {
      if (!globalSettings.openaiKey) {
        setShowSettings(true);
        throw new Error("OpenAI API key is required");
      }

      try {
        // Step 1: Generate meta prompt
        const metaPrompt = await generateMetaPrompt(input, globalSettings.openaiKey);
        if (!metaPrompt) throw new Error("Failed to generate meta prompt");

        // Step 2: Generate variations
        const variations = await generateVariations(metaPrompt, globalSettings.openaiKey);
        if (!variations.length) throw new Error("Failed to generate variations");

        // Step 3: Evaluate variations
        const evaluations = await evaluateVariations(
          variations,
          input.baseInput,
          globalSettings.openaiKey
        );

        return {
          metaPrompt,
          variations,
          evaluations
        };
      } catch (error) {
        console.error("Generation error:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      setResult(data);
      toast({
        title: "Success!",
        description: "Generated meta prompt, variations, and evaluations.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process the request",
        variant: "destructive"
      });
    }
  });

  return (
    <div className="container mx-auto py-8 space-y-8">
      <h1 className="text-4xl font-bold text-center mb-8 bg-gradient-to-r from-green-500 to-blue-500 text-transparent bg-clip-text">
        Prompt Optimization System
      </h1>

      <GlobalSettings
        settings={globalSettings}
        onSettingsChange={setGlobalSettings}
        isOpen={showSettings}
        onOpenChange={setShowSettings}
      />

      <div className="space-y-8">
        {/* Input Section */}
        <Card className="p-6">
          <div className="space-y-4">
            <Label className="text-lg">What kind of AI assistant do you want?</Label>
            <Textarea
              value={baseInput}
              onChange={(e) => setBaseInput(e.target.value)}
              placeholder='e.g., "I want an AI that helps with writing blog posts"'
              className="min-h-[100px]"
            />
            <Button 
              onClick={() => generateMutation.mutate({ baseInput })}
              disabled={generateMutation.isPending || !baseInput.trim()}
              className="w-full"
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate"
              )}
            </Button>
          </div>
        </Card>

        {/* Results Section */}
        {generateMutation.isPending && (
          <Card className="p-6">
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p>Generating prompt variations and evaluations...</p>
            </div>
          </Card>
        )}

        {generateMutation.isError && (
          <Card className="p-6 border-red-500">
            <div className="flex items-center space-x-2 text-red-500">
              <AlertCircle className="h-6 w-6" />
              <p>{generateMutation.error instanceof Error ? generateMutation.error.message : "An error occurred"}</p>
            </div>
          </Card>
        )}

        {/* Flow View */}
        {result && <PromptFlow result={result} />}
      </div>
    </div>
  );
}