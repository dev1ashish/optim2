import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { FlowCanvas } from "@/components/flow/flow-canvas";
import { useToast } from "@/hooks/use-toast";
import type { ModelConfig } from "@/components/settings/model-settings-section";
import { apiRequest } from "@/lib/queryClient";
import { generateMetaPrompt, generateVariations, evaluatePrompt, generateTestCases, generateResponse, compareModels, type StreamMetrics } from "@/lib/openai";
import { PromptChain } from "@/components/prompt-chain";
import { MetaPromptForm } from "@/components/meta-prompt-form";
import { VariationGenerator } from "@/components/variation-generator";
import { ComparisonDashboard } from "@/components/comparison-dashboard";
import type { MetaPromptInput, TestCase, EvaluationResult, EvaluationCriterion } from "@shared/schema";

const MAX_TOKENS = {
  openai: 4096,  // For GPT-4
  anthropic: 100000,  // For Claude 3
  groq: 4096  // For LLaMA2
};

const defaultModelConfig: ModelConfig = {
  provider: "openai",
  model: "gpt-4o",
  temperature: 0.7,
  maxTokens: MAX_TOKENS.openai,
  topP: 1,
  frequencyPenalty: 0,
  presencePenalty: 0,
  apiKey: "",
  systemPrompt: "You are a professional AI prompt engineer, skilled at creating detailed and effective prompts. Your goal is to create clear, structured prompts that guide AI models to provide high-quality responses.",
  responseFormat: { type: "json_object" },
  seed: undefined,
  tools: undefined,
  toolChoice: undefined,
  topK: undefined,
  stopSequences: undefined
};

const defaultVariationConfig: ModelConfig = {
  ...defaultModelConfig,
  systemPrompt: "You are a creative prompt variation generator. Your goal is to create diverse but focused variations of the given prompt while maintaining the core functionality and objectives. Each variation should be unique but equally effective."
};

const defaultTestConfig: ModelConfig = {
  ...defaultModelConfig,
  temperature: 0.8, // Slightly higher for more diverse test cases
  systemPrompt: "You are a test case generator for AI prompts. Create diverse and challenging test scenarios that cover edge cases, common scenarios, and potential failure modes. Focus on generating test inputs that will help evaluate the effectiveness of different prompt variations."
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
  const [evaluationResults, setEvaluationResults] = useState<EvaluationResult[]>([]);

  // Model configs for each section
  const [metaPromptConfig, setMetaPromptConfig] = useState<ModelConfig>(defaultModelConfig);
  const [variationConfig, setVariationConfig] = useState<ModelConfig>(defaultVariationConfig);
  const [testConfig, setTestConfig] = useState<ModelConfig>(defaultTestConfig);
  const [evaluationConfig, setEvaluationConfig] = useState<ModelConfig>(defaultEvaluationConfig);

  // Settings usage flags
  const [useDefaultForVariation, setUseDefaultForVariation] = useState(true);
  const [useDefaultForTest, setUseDefaultForTest] = useState(true);
  const [useDefaultForEvaluation, setUseDefaultForEvaluation] = useState(true);

  const [modelResults, setModelResults] = useState<{
    modelConfig: ModelConfig;
    response: string;
    metrics: StreamMetrics;
    isStreaming: boolean;
    streamProgress: number;
  }[]>([]);

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
        const generatedVariations = await generateVariations(metaPrompt, count, config);
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
      const config = useDefaultForTest ? metaPromptConfig : testConfig;
      if (!checkApiKey(config)) return;

      try {
        const generatedTests = await generateTestCases(
          baseInput,
          metaPrompt,
          variations,
          config
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
      const config = useDefaultForEvaluation ? metaPromptConfig : evaluationConfig;
      if (!checkApiKey(config)) return;

      const results: EvaluationResult[] = [];
      for (let varIndex = 0; varIndex < variations.length; varIndex++) {
        for (let testIndex = 0; testIndex < testCases.length; testIndex++) {
          // First generate the actual response using the variation
          const response = await generateResponse(
            variations[varIndex],
            testCases[testIndex].input,
            config
          );

          // Then evaluate the response
          const scores = await evaluatePrompt(
            response,
            testCases[testIndex].input,
            criteria.reduce((acc, c) => ({ ...acc, [c.id]: 0 }), {}),
            config
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

  const handleModelComparison = async (
    prompt: string,
    testCase: string,
    configs: ModelConfig[]
  ) => {
    // Initialize results for each model
    setModelResults(configs.map(config => ({
      modelConfig: config,
      response: "",
      metrics: {
        startTime: Date.now(),
        tokenCount: 0,
        estimatedCost: 0
      },
      isStreaming: true,
      streamProgress: 0
    })));

    try {
      await compareModels(prompt, testCase, configs, (modelIndex, chunk, metrics) => {
        setModelResults(prev => prev.map((result, i) => {
          if (i === modelIndex) {
            return {
              ...result,
              response: result.response + chunk,
              metrics,
              streamProgress: metrics.endTime ? 100 : ((metrics.tokenCount / (metrics.totalTokens || 100)) * 100),
              isStreaming: !metrics.endTime
            };
          }
          return result;
        }));
      });
    } catch (error) {
      console.error("Model comparison error:", error);
      toast({
        title: "Error",
        description: "Failed to compare models",
        variant: "destructive"
      });
    }
  };

  const handleStepComplete = (step: number) => {
    setCurrentStep(Math.max(currentStep, step + 1));
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <h1 className="text-4xl font-bold text-center mb-8 bg-gradient-to-r from-green-500 to-blue-500 text-transparent bg-clip-text">
        Prompt Optimization System
      </h1>

      <FlowCanvas
        currentStep={currentStep}
        onStepComplete={handleStepComplete}
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
        metaPromptConfig={metaPromptConfig}
        setMetaPromptConfig={setMetaPromptConfig}
        variationConfig={variationConfig}
        setVariationConfig={setVariationConfig}
        testConfig={testConfig}
        setTestConfig={setTestConfig}
        evaluationConfig={evaluationConfig}
        setEvaluationConfig={setEvaluationConfig}
        useDefaultForVariation={useDefaultForVariation}
        setUseDefaultForVariation={setUseDefaultForVariation}
        useDefaultForTest={useDefaultForTest}
        setUseDefaultForTest={setUseDefaultForTest}
        useDefaultForEvaluation={useDefaultForEvaluation}
        setUseDefaultForEvaluation={setUseDefaultForEvaluation}
        modelResults={modelResults}
        setModelResults={setModelResults}
        metaPromptMutation={metaPromptMutation}
        variationMutation={variationMutation}
        testGenerationMutation={testGenerationMutation}
        evaluationMutation={evaluationMutation}
        handleModelComparison={handleModelComparison}
      />
    </div>
  );
}