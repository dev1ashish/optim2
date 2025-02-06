import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { generateMetaPrompt, generateVariations, evaluatePrompt, generateTestCases } from "@/lib/openai";
import { PromptChain } from "@/components/prompt-chain";
import { MetaPromptForm } from "@/components/meta-prompt-form";
import { VariationGenerator } from "@/components/variation-generator";
import { TestCreator } from "@/components/test-creator";
import { ComparisonDashboard } from "@/components/comparison-dashboard";
import { useToast } from "@/hooks/use-toast";
import type { MetaPromptInput, TestCase } from "@shared/schema";

export default function Home() {
  const [currentStep, setCurrentStep] = useState(1);
  const [metaPrompt, setMetaPrompt] = useState("");
  const [variations, setVariations] = useState<string[]>([]);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [evaluationResults, setEvaluationResults] = useState<Record<string, number>[]>([]);
  const [autoProgress, setAutoProgress] = useState(true);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const metaPromptMutation = useMutation({
    mutationFn: async (input: MetaPromptInput) => {
      const generatedPrompt = await generateMetaPrompt(input);
      setMetaPrompt(generatedPrompt);
      setCurrentStep(2);
      return generatedPrompt;
    },
  });

  const variationMutation = useMutation({
    mutationFn: async (count: number) => {
      const generatedVariations = await generateVariations(metaPrompt, count);
      setVariations(generatedVariations);
      setCurrentStep(3);
      return generatedVariations;
    },
  });

  const testCasesMutation = useMutation({
    mutationFn: async (baseInput: string) => {
      const generatedTests = await generateTestCases(baseInput);
      setTestCases(generatedTests);
      return generatedTests;
    },
  });

  const evaluationMutation = useMutation({
    mutationFn: async () => {
      const results = await Promise.all(
        variations.map(async (variation) => {
          const scores = await Promise.all(
            testCases.map(async (test) => {
              return evaluatePrompt(variation, test.input, test.criteria);
            })
          );

          const averagedScores: Record<string, number> = {};
          Object.keys(scores[0]).forEach((criterion) => {
            averagedScores[criterion] = scores.reduce((sum, score) => sum + score[criterion], 0) / scores.length;
          });

          return averagedScores;
        })
      );

      setEvaluationResults(results);
      setCurrentStep(4);

      // Save to backend
      await apiRequest("POST", "/api/prompts", {
        baseInput: metaPrompt,
        metaPrompt: metaPrompt,
        variations: variations,
        testCases: testCases,
        evaluationResults: results
      });

      return results;
    }
  });

  // Auto-progress through steps
  useEffect(() => {
    if (!autoProgress) return;

    const progressWorkflow = async () => {
      try {
        if (currentStep === 2 && metaPrompt) {
          await variationMutation.mutateAsync(3);
        } else if (currentStep === 3 && variations.length > 0) {
          if (testCases.length === 0) {
            await testCasesMutation.mutateAsync(metaPrompt);
          }
          await evaluationMutation.mutateAsync();
        }
      } catch (error) {
        console.error("Auto-progress error:", error);
        setAutoProgress(false);
      }
    };

    progressWorkflow();
  }, [currentStep, metaPrompt, variations.length, autoProgress]);

  const handleMetaPromptSubmit = async (data: MetaPromptInput) => {
    try {
      await metaPromptMutation.mutateAsync(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate meta prompt",
        variant: "destructive"
      });
      setAutoProgress(false);
    }
  };

  const handleGenerateVariations = async (count: number) => {
    try {
      await variationMutation.mutateAsync(count);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate variations",
        variant: "destructive"
      });
      setAutoProgress(false);
    }
  };

  const handleAddTest = (test: TestCase) => {
    setTestCases([...testCases, test]);
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <h1 className="text-4xl font-bold text-center mb-8 bg-gradient-to-r from-green-500 to-blue-500 text-transparent bg-clip-text">
        Prompt Optimization System
      </h1>

      <PromptChain currentStep={currentStep} />

      <div className="space-y-8">
        {currentStep === 1 && (
          <div>
            <h2 className="text-2xl font-semibold mb-4">Meta Prompt Generator</h2>
            <MetaPromptForm 
              onSubmit={handleMetaPromptSubmit}
              isLoading={metaPromptMutation.isPending}
              autoSubmit={autoProgress}
            />
          </div>
        )}

        {currentStep >= 2 && (
          <div>
            <h2 className="text-2xl font-semibold mb-4">Generated Meta Prompt</h2>
            <VariationGenerator
              metaPrompt={metaPrompt}
              onGenerate={handleGenerateVariations}
              variations={variations}
              isLoading={variationMutation.isPending}
            />
          </div>
        )}

        {currentStep >= 3 && (
          <div>
            <h2 className="text-2xl font-semibold mb-4">Test Cases</h2>
            <TestCreator
              onAddTest={handleAddTest}
              testCases={testCases}
            />
          </div>
        )}

        {currentStep >= 4 && evaluationResults.length > 0 && (
          <div>
            <h2 className="text-2xl font-semibold mb-4">Comparison & Evaluation</h2>
            <ComparisonDashboard
              variations={variations}
              evaluationResults={evaluationResults}
            />
          </div>
        )}
      </div>
    </div>
  );
}