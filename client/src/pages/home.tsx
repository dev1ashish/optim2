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
import type { ModelConfig } from "@/components/settings/model-settings";

export default function Home() {
  const [currentStep, setCurrentStep] = useState(1);
  const [baseInput, setBaseInput] = useState("");
  const [metaPrompt, setMetaPrompt] = useState("");
  const [variations, setVariations] = useState<string[]>([]);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [evaluationResults, setEvaluationResults] = useState<Record<string, number>[]>([]);
  const [modelConfig, setModelConfig] = useState<ModelConfig>({
    provider: "openai",
    model: "gpt-4o",
    temperature: 0.7,
    maxTokens: 2048
  });

  const { toast } = useToast();

  const metaPromptMutation = useMutation({
    mutationFn: async (input: MetaPromptInput) => {
      setBaseInput(input.baseInput);
      const generatedPrompt = await generateMetaPrompt(input, modelConfig);
      setMetaPrompt(generatedPrompt);
      setCurrentStep(2);
      return generatedPrompt;
    },
  });

  const variationMutation = useMutation({
    mutationFn: async (count: number) => {
      try {
        const generatedVariations = await generateVariations(metaPrompt, count, modelConfig);
        setVariations(generatedVariations);

        if (generatedVariations.length > 0) {
          // Generate test cases
          const generatedTests = await generateTestCases(
            baseInput,
            metaPrompt,
            generatedVariations,
            modelConfig
          );
          setTestCases(generatedTests);

          // Automatically start evaluation
          if (generatedTests.length > 0) {
            const results = await Promise.all(
              generatedVariations.map(async (variation) => {
                const scores = await Promise.all(
                  generatedTests.map(async (test) => {
                    return evaluatePrompt(variation, test.input, test.criteria, modelConfig);
                  })
                );

                // Average the scores across all test cases
                const averagedScores: Record<string, number> = {};
                Object.keys(scores[0]).forEach((criterion) => {
                  averagedScores[criterion] =
                    scores.reduce((sum, score) => sum + score[criterion], 0) / scores.length;
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
          }
        }

        return generatedVariations;
      } catch (error) {
        console.error("Variation generation error:", error);
        toast({
          title: "Error",
          description: "Failed to generate variations and test cases",
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
          modelConfig={modelConfig}
          onModelConfigChange={setModelConfig}
          isLoading={metaPromptMutation.isPending}
        />

        {metaPrompt && (
          <VariationGenerator
            metaPrompt={metaPrompt}
            onGenerate={(count) => variationMutation.mutateAsync(count)}
            variations={variations}
            isLoading={variationMutation.isPending}
          />
        )}

        {evaluationResults.length > 0 && (
          <ComparisonDashboard
            variations={variations}
            evaluationResults={evaluationResults}
          />
        )}
      </div>
    </div>
  );
}