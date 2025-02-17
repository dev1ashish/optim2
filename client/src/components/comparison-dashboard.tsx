import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ModelSettingsSection, type ModelConfig } from "@/components/settings/model-settings-section";
import { EvaluationCriteriaManager } from "./evaluation-criteria-manager";
import { PromptComparisonDashboard } from "./prompt-comparison-dashboard";
import type { EvaluationCriterion, EvaluationResult, TestCase } from "@shared/schema";
import type { StreamMetrics } from "@/lib/openai";

interface ComparisonDashboardProps {
  variations: string[];
  testCases: TestCase[];
  evaluationResults: EvaluationResult[];
  onEvaluate: (criteria: EvaluationCriterion[]) => Promise<void>;
  isEvaluating: boolean;
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
  onEvaluate,
  isEvaluating,
  modelConfig,
  onModelConfigChange,
  defaultConfig,
  useDefaultSettings,
  onUseDefaultSettingsChange,
  onCompareModels,
  modelResults
}: ComparisonDashboardProps) {
  const [criteria, setCriteria] = useState<EvaluationCriterion[]>(defaultCriteria);

  // Combine evaluation results with model results
  const combinedResults = evaluationResults.map(evalResult => {
    const modelResult = modelResults[evalResult.variationIndex * testCases.length + evalResult.testCaseIndex];
    return {
      ...evalResult,
      modelConfig: modelResult.modelConfig,
      metrics: modelResult.metrics
    };
  });

  return (
    <Card className="p-6 space-y-8">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Model Evaluation & Comparison</h2>
          <p className="text-muted-foreground">
            Compare different prompt variations across multiple models and metrics
          </p>
        </div>

        <ModelSettingsSection
          title="Evaluation Settings"
          description="Configure the model settings for evaluation"
          config={modelConfig}
          onChange={onModelConfigChange}
          defaultConfig={defaultConfig}
          useDefaultSettings={useDefaultSettings}
          onUseDefaultSettingsChange={onUseDefaultSettingsChange}
        />
      </div>

      <EvaluationCriteriaManager
        criteria={criteria}
        onAddCriterion={(criterion) => {
          setCriteria([...criteria, criterion]);
        }}
        onUpdateCriterion={(id, criterion) => {
          setCriteria(criteria.map(c => c.id === id ? criterion : c));
        }}
        onRemoveCriterion={(id) => {
          setCriteria(criteria.filter(c => c.id !== id));
        }}
      />

      <div className="flex justify-end">
        <Button
          onClick={() => onEvaluate(criteria)}
          disabled={isEvaluating}
        >
          {isEvaluating ? "Evaluating..." : "Run Evaluation"}
        </Button>
      </div>

      {combinedResults.length > 0 && (
        <PromptComparisonDashboard
          variations={variations}
          testCases={testCases}
          modelConfigs={[modelConfig]}
          evaluationCriteria={criteria}
          results={combinedResults}
        />
      )}
    </Card>
  );
}