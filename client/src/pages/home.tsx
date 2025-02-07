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
import { TestCasesDisplay } from "@/components/test-cases-display"; // Assuming this component exists

const defaultModelConfig: ModelConfig = {
  provider: "openai",
  model: "gpt-4o",
  temperature: 0.7,
  maxTokens: 2048,
  apiKey: "",
  systemPrompt: "" // Add default empty system prompt
};

const defaultMetaPromptSystemPrompt = `You are an expert prompt engineer. Your task is to create comprehensive and effective meta-prompts that define AI assistant behaviors. Focus on clarity, specificity, and alignment with the user's requirements.`;

const defaultVariationSystemPrompt = `You are a creative prompt designer. Your task is to generate diverse but focused variations of a meta-prompt while maintaining its core functionality and objectives.`;

const defaultEvaluationSystemPrompt = `You are an evaluation expert. Your task is to assess prompt variations objectively based on given criteria. Provide numerical scores and maintain consistency in your evaluations.`;

export default function Home() {
  const [currentStep, setCurrentStep] = useState(1);
  const [baseInput, setBaseInput] = useState("");
  const [metaPrompt, setMetaPrompt] = useState("");
  const [variations, setVariations] = useState<string[]>([]);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [evaluationResults, setEvaluationResults] = useState<Record<string, number>[]>([]);

  // Update model configs with system prompts
  const [metaPromptConfig, setMetaPromptConfig] = useState<ModelConfig>({
    ...defaultModelConfig,
    systemPrompt: defaultMetaPromptSystemPrompt
  });

  const [variationConfig, setVariationConfig] = useState<ModelConfig>({
    ...defaultModelConfig,
    systemPrompt: defaultVariationSystemPrompt
  });

  const [evaluationConfig, setEvaluationConfig] = useState<ModelConfig>({
    ...defaultModelConfig,
    systemPrompt: defaultEvaluationSystemPrompt
  });

  const [useDefaultForVariation, setUseDefaultForVariation] = useState(true);
  const [useDefaultForEvaluation, setUseDefaultForEvaluation] = useState(true);

  const { toast } = useToast();

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
        setEvaluationResults([]);
        const generatedVariations = await generateVariations(metaPrompt, count, config);
        if (!generatedVariations.length) {
          throw new Error("Failed to generate variations");
        }
        setVariations(generatedVariations);
        setCurrentStep(2);

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

        const evalConfig = useDefaultForEvaluation ? metaPromptConfig : evaluationConfig;
        const results = await Promise.all(
          generatedVariations.map(async (variation) => {
            const scores = await Promise.all(
              generatedTests.map(async (test) => {
                return evaluatePrompt(variation, test.input, test.criteria, evalConfig);
              })
            );

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

        {testCases.length > 0 && (
          <TestCasesDisplay testCases={testCases} />
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