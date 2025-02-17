import { useState } from "react";
import { Card } from "@/components/ui/card";
import { ModelArena } from "./model-arena/model-arena";
import type { EvaluationCriterion, TestCase } from "@shared/schema";
import type { ModelConfig } from "@/components/settings/model-settings-section";
import type { StreamMetrics } from "@/lib/openai";

interface ComparisonDashboardProps {
  variations: string[];
  testCases: TestCase[];
  evaluationResults: {
    variationIndex: number;
    testCaseIndex: number;
    response: string;
    scores: Record<string, number>;
  }[];
  modelConfig: ModelConfig;
  onModelConfigChange: (config: ModelConfig) => void;
  defaultConfig: ModelConfig;
  useDefaultSettings: boolean;
  onUseDefaultSettingsChange: (use: boolean) => void;
  onCompareModels: (prompt: string, testCase: string, configs: ModelConfig[]) => Promise<void>;
  modelResults: {
    modelConfig: ModelConfig;
    response: string;
    metrics: StreamMetrics;
    isStreaming: boolean;
    streamProgress: number;
  }[];
}

const defaultCriteria: EvaluationCriterion[] = [
  {
    id: "clarity",
    name: "Clarity",
    description: "How clear and understandable is the response?",
    systemPrompt: "Rate the following response for clarity and understandability on a scale of 0 to 1. Consider whether the message is well-structured, easy to follow, and free of ambiguity.",
    weight: 1
  },
  {
    id: "relevance",
    name: "Relevance",
    description: "How relevant is the response to the input?",
    systemPrompt: "Rate the following response for relevance on a scale of 0 to 1. Consider how well it addresses the specific query or concern raised in the input.",
    weight: 1
  },
  {
    id: "empathy",
    name: "Empathy",
    description: "How empathetic is the response?",
    systemPrompt: "Rate the following response for empathy on a scale of 0 to 1. Consider how well it acknowledges and responds to the emotional content of the input.",
    weight: 1
  },
  {
    id: "actionability",
    name: "Actionability",
    description: "How actionable is the advice or information provided?",
    systemPrompt: "Rate the following response for actionability on a scale of 0 to 1. Consider whether it provides practical, implementable suggestions or clear next steps.",
    weight: 1
  },
  {
    id: "professionalism",
    name: "Professionalism",
    description: "How professional is the tone and content?",
    systemPrompt: "Rate the following response for professionalism on a scale of 0 to 1. Consider the appropriateness of tone, language choice, and overall presentation.",
    weight: 1
  }
];

export function ComparisonDashboard({
  variations,
  testCases,
  evaluationResults,
  modelConfig,
  modelResults,
  onCompareModels
}: ComparisonDashboardProps) {
  // Map evaluation results to model results
  const combinedResults = evaluationResults.map(evalResult => {
    const modelResult = modelResults[evalResult.variationIndex * testCases.length + evalResult.testCaseIndex];
    return {
      ...modelResult,
      scores: evalResult.scores
    };
  });

  return (
    <div className="space-y-6">
      {variations.map((variation, index) => (
        <ModelArena
          key={index}
          testCase={testCases[0].input}
          promptVariation={variation}
          promptVariationIndex={index}
          modelConfigs={[modelConfig]}
          evaluationCriteria={defaultCriteria}
          onStartComparison={(configs) =>
            onCompareModels(variation, testCases[0].input, configs)
          }
          results={combinedResults.filter(
            r => r.variationIndex === index && r.testCaseIndex === 0
          )}
        />
      ))}
    </div>
  );
}