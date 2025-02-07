import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { generateMetaPrompt, generateVariations, evaluatePrompt, generateTestCases } from "@/lib/openai";
import { PromptChain } from "@/components/prompt-chain";
import { MetaPromptForm } from "@/components/meta-prompt-form";
import { VariationGenerator } from "@/components/variation-generator";
import { ComparisonDashboard } from "@/components/comparison-dashboard";
import { useToast } from "@/hooks/use-toast";
import type { MetaPromptInput, TestCase } from "@shared/schema";
import type { ModelConfig } from "@/components/settings/model-settings-section";

const defaultModelConfig: ModelConfig = {
  provider: "openai",
  model: "gpt-4o",
  temperature: 0.7,
  maxTokens: 2048,
  apiKey: "",
  systemPrompt: "You are a professional AI prompt engineer, skilled at creating detailed and effective prompts. Your goal is to create clear, structured prompts that guide AI models to provide high-quality responses."
};

const defaultVariationConfig: ModelConfig = {
  ...defaultModelConfig,
  systemPrompt: "You are a creative prompt variation generator. Your goal is to create diverse but focused variations of the given prompt while maintaining the core functionality and objectives. Each variation should be unique but equally effective."
};

const defaultEvaluationConfig: ModelConfig = {
  ...defaultModelConfig,
  systemPrompt: "You are an objective prompt evaluator. Your task is to assess prompts based on given criteria with fairness and consistency. Provide numerical scores based on clear rubrics and objective analysis."
};

export default function Home() {
  const [currentStep, setCurrentStep] = useState(1);
  const [baseInput, setBaseInput] = useState("");
  const [metaPrompt, setMetaPrompt] = useState("");
  const [variations, setVariations] = useState<string[]>([]);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [evaluationResults, setEvaluationResults] = useState<Record<string, number>[]>([]);

  // Model configs for each section
  const [metaPromptConfig, setMetaPromptConfig] = useState<ModelConfig>(defaultModelConfig);
  const [variationConfig, setVariationConfig] = useState<ModelConfig>(defaultVariationConfig);
  const [evaluationConfig, setEvaluationConfig] = useState<ModelConfig>(defaultEvaluationConfig);

  // Settings usage flags
  const [useDefaultForVariation, setUseDefaultForVariation] = useState(true);
  const [useDefaultForEvaluation, setUseDefaultForEvaluation] = useState(true);

  const { toast } = useToast();

  // Check for API key before operations
  const checkApiKey = (config: ModelConfig) => {
    if (!config.apiKey) {
      toast({
        title: "API Key Required",
        description: "Please set your API key in the model settings before proceeding.",
        variant: "destructive"
      });
      return false;
    }
    return true;
  };

  const metaPromptMutation = useMutation({
    mutationFn: async (input: MetaPromptInput) => {
      if (!checkApiKey(metaPromptConfig)) return;
      setBaseInput(input.baseInput);
      const generatedPrompt = await generateMetaPrompt(input, metaPromptConfig);
      setMetaPrompt(generatedPrompt);
      setCurrentStep(2);
      return generatedPrompt;
    },
  });

  const variationMutation = useMutation({
    mutationFn: async (count: number) => {
      const config = useDefaultForVariation ? metaPromptConfig : variationConfig;
      if (!checkApiKey(config)) return;

      try {
        // Clear previous results
        setEvaluationResults([]);

        // Generate variations
        const generatedVariations = await generateVariations(metaPrompt, count, config);
        if (!generatedVariations.length) {
          throw new Error("Failed to generate variations");
        }
        setVariations(generatedVariations);
        setCurrentStep(2);

        // Generate test cases
        const generatedTests = await generateTestCases(
          baseInput,
          metaPrompt,
          generatedVariations,
          config
        );
        if (!generatedTests.length) {
          throw new Error("Failed to generate test cases");
        }
        setTestCases(generatedTests);
        setCurrentStep(3);

        // Run evaluations with potentially different config
        const evalConfig = useDefaultForEvaluation ? metaPromptConfig : evaluationConfig;
        const results = await Promise.all(
          generatedVariations.map(async (variation) => {
            const scores = await Promise.all(
              generatedTests.map(async (test) => {
                return evaluatePrompt(variation, test.input, test.criteria, evalConfig);
              })
            );

            // Average the scores across all test cases
            const averagedScores: Record<string, number> = {};
            Object.keys(scores[0] || {}).forEach((criterion) => {
              averagedScores[criterion] =
                scores.reduce((sum, score) => sum + (score[criterion] || 0), 0) / scores.length;
            });

            return averagedScores;
          })
        );

        setEvaluationResults(results);
        setCurrentStep(4);

        // Save results
        await apiRequest("POST", "/api/prompts", {
          baseInput,
          metaPrompt,
          variations: generatedVariations,
          testCases: generatedTests,
          evaluationResults: results
        });

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

  const handleMetaPromptSubmit = async (data: MetaPromptInput) => {
    try {
      await metaPromptMutation.mutateAsync(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate meta prompt",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <h1 className="text-4xl font-bold text-center mb-8 bg-gradient-to-r from-green-500 to-blue-500 text-transparent bg-clip-text">
        Prompt Optimization System
      </h1>

      <PromptChain currentStep={currentStep} />

      <div className="space-y-8">
        <MetaPromptForm
          onSubmit={handleMetaPromptSubmit}
          modelConfig={metaPromptConfig}
          onModelConfigChange={setMetaPromptConfig}
          isLoading={metaPromptMutation.isPending}
        />

        {metaPrompt && (
          <VariationGenerator
            metaPrompt={metaPrompt}
            onGenerate={(count) => variationMutation.mutateAsync(count)}
            variations={variations}
            isLoading={variationMutation.isPending}
            modelConfig={useDefaultForVariation ? metaPromptConfig : variationConfig}
            onModelConfigChange={setVariationConfig}
            defaultConfig={metaPromptConfig}
            useDefaultSettings={useDefaultForVariation}
            onUseDefaultSettingsChange={setUseDefaultForVariation}
          />
        )}

        {evaluationResults.length > 0 && (
          <ComparisonDashboard
            variations={variations}
            evaluationResults={evaluationResults}
            modelConfig={useDefaultForEvaluation ? metaPromptConfig : evaluationConfig}
            onModelConfigChange={setEvaluationConfig}
            defaultConfig={metaPromptConfig}
            useDefaultSettings={useDefaultForEvaluation}
            onUseDefaultSettingsChange={setUseDefaultForEvaluation}
          />
        )}
      </div>
    </div>
  );
}