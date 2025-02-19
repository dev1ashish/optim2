import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { FlowCanvas } from "@/components/flow/flow-canvas";
import { useToast } from "@/hooks/use-toast";
import { GlobalSettings, type GlobalSettings as GlobalSettingsType } from "@/components/settings/global-settings";
import { apiRequest } from "@/lib/queryClient";
import { generateMetaPrompt, generateVariations, evaluatePrompt, generateTestCases, type StreamMetrics } from "@/lib/openai";
import type { MetaPromptInput, TestCase, EvaluationResult, EvaluationCriterion } from "@shared/schema";

// Simplified model config that only uses GPT-4
const defaultModelConfig = {
  provider: "openai" as const,
  model: "gpt-4o",
  temperature: 0.7,
  maxTokens: 4096,
  systemPrompt: "You are a professional AI prompt engineer, skilled at creating detailed and effective prompts. Your goal is to create clear, structured prompts that guide AI models to provide high-quality responses."
};

export default function Home() {
  const [currentStep, setCurrentStep] = useState(1);
  const [baseInput, setBaseInput] = useState("");
  const [metaPrompt, setMetaPrompt] = useState("");
  const [variations, setVariations] = useState<string[]>([]);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [evaluationResults, setEvaluationResults] = useState<EvaluationResult[]>([]);
  const [globalSettings, setGlobalSettings] = useState<GlobalSettingsType>({});

  const { toast } = useToast();

  // Use the OpenAI key from global settings
  const getConfigWithKey = () => ({
    ...defaultModelConfig,
    apiKey: globalSettings.openaiKey
  });

  const checkApiKey = () => {
    if (!globalSettings.openaiKey) {
      toast({
        title: "API Key Required",
        description: "Please set your OpenAI API key in the global settings before proceeding.",
        variant: "destructive"
      });
      return false;
    }
    return true;
  };

  const metaPromptMutation = useMutation({
    mutationFn: async (input: MetaPromptInput) => {
      if (!checkApiKey()) return;
      setBaseInput(input.baseInput);
      const generatedPrompt = await generateMetaPrompt(input, getConfigWithKey());
      setMetaPrompt(generatedPrompt);
      setCurrentStep(2);
      return generatedPrompt;
    },
  });

  const variationMutation = useMutation({
    mutationFn: async (count: number) => {
      if (!checkApiKey()) return;
      try {
        const generatedVariations = await generateVariations(metaPrompt, count, getConfigWithKey());
        if (!generatedVariations.length) {
          throw new Error("Failed to generate variations");
        }
        setVariations(generatedVariations);
        setCurrentStep(2);
        return generatedVariations;
      } catch (error) {
        console.error("Variation generation error:", error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to process variations",
          variant: "destructive"
        });
        throw error;
      }
    }
  });

  const testGenerationMutation = useMutation({
    mutationFn: async () => {
      if (!checkApiKey()) return;
      try {
        const generatedTests = await generateTestCases(
          baseInput,
          metaPrompt,
          variations,
          getConfigWithKey()
        );
        if (!generatedTests.length) {
          throw new Error("Failed to generate test cases");
        }
        setTestCases(generatedTests);
        setCurrentStep(3);
        return generatedTests;
      } catch (error) {
        console.error("Test case generation error:", error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to generate test cases",
          variant: "destructive"
        });
        throw error;
      }
    }
  });

  const evaluationMutation = useMutation({
    mutationFn: async (criteria: EvaluationCriterion[]) => {
      if (!checkApiKey()) return;

      const results: EvaluationResult[] = [];
      for (let varIndex = 0; varIndex < variations.length; varIndex++) {
        for (let testIndex = 0; testIndex < testCases.length; testIndex++) {
          const response = await generateResponse(
            variations[varIndex],
            testCases[testIndex].input,
            getConfigWithKey()
          );

          const scores = await evaluatePrompt(
            response,
            testCases[testIndex].input,
            criteria.reduce((acc, c) => ({ ...acc, [c.id]: 0 }), {}),
            getConfigWithKey()
          );

          results.push({
            variationIndex: varIndex,
            testCaseIndex: testIndex,
            scores,
            response
          });
        }
      }

      setEvaluationResults(results);
      setCurrentStep(4);
      return results;
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
      />

      <FlowCanvas
        currentStep={currentStep}
        onStepComplete={setCurrentStep}
        baseInput={baseInput}
        setBaseInput={setBaseInput}
        metaPrompt={metaPrompt}
        setMetaPrompt={setMetaPrompt}
        variations={variations}
        setVariations={setVariations}
        testCases={testCases}
        setTestCases={setTestCases}
        evaluationResults={evaluationResults}
        setEvaluationResults={setEvaluationResults}
        metaPromptMutation={metaPromptMutation}
        variationMutation={variationMutation}
        testGenerationMutation={testGenerationMutation}
        evaluationMutation={evaluationMutation}
      />
    </div>
  );
}