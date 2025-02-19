import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { GlobalSettings, type GlobalSettings as GlobalSettingsType } from "@/components/settings/global-settings";
import { apiRequest } from "@/lib/queryClient";
import { generateMetaPrompt, generateVariations, evaluatePrompt, generateTestCases } from "@/lib/openai";
import type { MetaPromptInput, TestCase, EvaluationResult, EvaluationCriterion } from "@shared/schema";
import { PromptChain } from "@/components/prompt-chain";
import { MetaPromptForm } from "@/components/meta-prompt-form";
import { VariationGenerator } from "@/components/variation-generator";
import { TestCreator } from "@/components/test-creator";
import { EvaluationCriteriaManager } from "@/components/evaluation-criteria-manager";

// Default model configuration using GPT-4o
const defaultModelConfig = {
  provider: "openai" as const,
  model: "gpt-4o",
  temperature: 0.7,
  maxTokens: 4096,
  systemPrompt: "You are a professional AI prompt engineer, skilled at creating detailed and effective prompts."
};

export default function Home() {
  const [currentStep, setCurrentStep] = useState(1);
  const [showSettings, setShowSettings] = useState(true);
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
      setShowSettings(true);
      toast({
        title: "API Key Required",
        description: "Please set your OpenAI API key in the settings before proceeding.",
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
      const generatedVariations = await generateVariations(metaPrompt, count, getConfigWithKey());
      if (!generatedVariations.length) {
        throw new Error("Failed to generate variations");
      }
      setVariations(generatedVariations);
      setCurrentStep(3);
      return generatedVariations;
    }
  });

  const testGenerationMutation = useMutation({
    mutationFn: async () => {
      if (!checkApiKey()) return;
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
      setCurrentStep(4);
      return generatedTests;
    }
  });

  const evaluationMutation = useMutation({
    mutationFn: async (criteria: EvaluationCriterion[]) => {
      if (!checkApiKey()) return;

      const results: EvaluationResult[] = [];
      for (const variation of variations) {
        for (const testCase of testCases) {
          const response = await generateMetaPrompt(
            { baseInput: testCase.input },
            { ...getConfigWithKey(), systemPrompt: variation }
          );

          const scores = await evaluatePrompt(
            response,
            testCase.input,
            criteria.reduce((acc, c) => ({ ...acc, [c.id]: 0 }), {}),
            getConfigWithKey()
          );

          results.push({
            variationIndex: variations.indexOf(variation),
            testCaseIndex: testCases.indexOf(testCase),
            scores,
            response
          });
        }
      }

      setEvaluationResults(results);
      setCurrentStep(5);
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
        isOpen={showSettings}
        onOpenChange={setShowSettings}
      />

      <PromptChain currentStep={currentStep} />

      <div className="space-y-8 mt-8">
        {currentStep === 1 && (
          <MetaPromptForm
            onSubmit={metaPromptMutation.mutate}
            isLoading={metaPromptMutation.isPending}
          />
        )}

        {currentStep >= 2 && (
          <VariationGenerator
            metaPrompt={metaPrompt}
            onGenerate={variationMutation.mutate}
            variations={variations}
            isLoading={variationMutation.isPending}
          />
        )}

        {currentStep >= 3 && (
          <TestCreator
            onAddTest={(test) => setTestCases([...testCases, test])}
            onGenerateTests={testGenerationMutation.mutate}
            testCases={testCases}
            onRemoveTest={(index) => {
              const newTests = [...testCases];
              newTests.splice(index, 1);
              setTestCases(newTests);
            }}
            onUpdateTest={(index, test) => {
              const newTests = [...testCases];
              newTests[index] = test;
              setTestCases(newTests);
            }}
            isGenerating={testGenerationMutation.isPending}
          />
        )}

        {currentStep >= 4 && (
          <EvaluationCriteriaManager
            criteria={[]}
            onAddCriterion={() => {}}
            onUpdateCriterion={() => {}}
            onRemoveCriterion={() => {}}
          />
        )}
      </div>
    </div>
  );
}