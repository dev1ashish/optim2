import { useState } from "react";
import { Card } from "@/components/ui/card";
import type { EvaluationCriterion, TestCase } from "@shared/schema";
import { ModelArena } from "./model-arena/model-arena";
import type { StreamMetrics } from "@/lib/openai";
import type { ModelConfig } from "@/components/settings/model-settings-section";

interface ComparisonDashboardProps {
  variations: string[];
  testCases: TestCase[];
  onCompareModels: (prompt: string, testCase: string, configs: ModelConfig[]) => Promise<void>;
  modelResults: {
    modelConfig: ModelConfig;
    response: string;
    metrics: StreamMetrics;
    isStreaming: boolean;
    streamProgress: number;
    scores?: Record<string, number>;
  }[];
  defaultConfig: ModelConfig;
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
  onCompareModels,
  modelResults,
  defaultConfig
}: ComparisonDashboardProps) {
  const [criteria, setCriteria] = useState<EvaluationCriterion[]>(defaultCriteria);
  const [selectedTestCase, setSelectedTestCase] = useState<TestCase>(testCases[0]);

  return (
    <Card className="p-6 space-y-8">
      <ModelArena
        testCases={testCases}
        selectedTestCase={selectedTestCase}
        onTestCaseSelect={setSelectedTestCase}
        variations={variations}
        onStartComparison={(prompt, configs) =>
          onCompareModels(prompt, selectedTestCase.input, configs)
        }
        results={modelResults}
        evaluationCriteria={criteria}
        onUpdateCriteria={setCriteria}
      />
    </Card>
  );
}