import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { generateMetaPrompt, generateVariations, evaluatePrompt } from "@/lib/openai";
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

  const evaluationMutation = useMutation({
    mutationFn: async () => {
      const results = await Promise.all(
        variations.map(async (variation) => {
          const scores = await Promise.all(
            testCases.map(async (test) => {
              return evaluatePrompt(variation, test.input, test.criteria);
            })
          );
          
          // Average scores across test cases
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

  const handleMetaPromptSubmit = async (data: MetaPromptInput) => {
    try {
      await metaPromptMutation.mutateAsync(data);
      toast({
        title: "Meta prompt generated",
        description: "You can now generate variations of this prompt."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate meta prompt",
        variant: "destructive"
      });
    }
  };

  const handleGenerateVariations = async (count: number) => {
    try {
      await variationMutation.mutateAsync(count);
      toast({
        title: "Variations generated",
        description: "You can now create test cases to evaluate the variations."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate variations",
        variant: "destructive"
      });
    }
  };

  const handleAddTest = (test: TestCase) => {
    setTestCases([...testCases, test]);
  };

  const handleEvaluate = async () => {
    if (testCases.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one test case",
        variant: "destructive"
      });
      return;
    }

    try {
      await evaluationMutation.mutateAsync();
      toast({
        title: "Evaluation complete",
        description: "You can now compare the results of different variations."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to evaluate prompts",
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
        {currentStep === 1 && (
          <div>
            <h2 className="text-2xl font-semibold mb-4">Meta Prompt Generator</h2>
            <MetaPromptForm 
              onSubmit={handleMetaPromptSubmit}
              isLoading={metaPromptMutation.isPending}
            />
          </div>
        )}

        {currentStep >= 2 && (
          <div>
            <h2 className="text-2xl font-semibold mb-4">Variation Generator</h2>
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
            <h2 className="text-2xl font-semibold mb-4">Test Set Creation</h2>
            <TestCreator
              onAddTest={handleAddTest}
              testCases={testCases}
            />
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleEvaluate}
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50"
                disabled={evaluationMutation.isPending}
              >
                {evaluationMutation.isPending ? "Evaluating..." : "Evaluate Prompts"}
              </button>
            </div>
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
