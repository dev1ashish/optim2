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

      <PromptFlow
        input={baseInput}
        onInputChange={setBaseInput}
        onGenerate={() => generateMutation.mutate({ baseInput })}
        isGenerating={generateMutation.isPending}
        result={result}
      />
    </div>
  );
}