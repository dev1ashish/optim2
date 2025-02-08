import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Medal } from "lucide-react";
import { ModelSettingsSection, type ModelConfig } from "@/components/settings/model-settings-section";
import { EvaluationCriteriaManager } from "./evaluation-criteria-manager";
import type { EvaluationCriterion, EvaluationResult } from "@shared/schema";
import { Button } from "@/components/ui/button";


interface ComparisonDashboardProps {
  variations: string[];
  testCases: { input: string }[];
  evaluationResults: EvaluationResult[];
  onEvaluate: (criteria: EvaluationCriterion[]) => Promise<void>;
  isEvaluating: boolean;
  modelConfig: ModelConfig;
  onModelConfigChange: (config: ModelConfig) => void;
  defaultConfig: ModelConfig;
  useDefaultSettings: boolean;
  onUseDefaultSettingsChange: (use: boolean) => void;
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
  onUseDefaultSettingsChange
}: ComparisonDashboardProps) {
  const [criteria, setCriteria] = useState<EvaluationCriterion[]>(defaultCriteria);

  // Get all unique criteria IDs from results
  const getCriteriaIds = () => {
    const ids = new Set<string>();
    evaluationResults.forEach(result => {
      Object.keys(result.scores).forEach(id => ids.add(id));
    });
    return Array.from(ids);
  };

  // Calculate weighted average score for a variation
  const getWeightedScore = (variationIndex: number) => {
    const results = evaluationResults.filter(r => r.variationIndex === variationIndex);
    if (!results.length) return 0;

    let totalWeight = 0;
    let weightedSum = 0;

    criteria.forEach(criterion => {
      const scores = results.map(r => r.scores[criterion.id] || 0);
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      weightedSum += avgScore * criterion.weight;
      totalWeight += criterion.weight;
    });

    return totalWeight ? weightedSum / totalWeight : 0;
  };

  // Calculate scores and create sorted index
  const scores = variations.map((variation, index) => ({
    index,
    score: getWeightedScore(index),
    variation
  }));

  // Sort by score in descending order
  const sortedScores = [...scores].sort((a, b) => b.score - a.score);
  const topThree = sortedScores.slice(0, 3);

  const chartData = variations.map((_, index) => ({
    name: `Variation ${index + 1}`,
    score: getWeightedScore(index)
  }));

  const getMedalColor = (position: number) => {
    switch (position) {
      case 0: return "text-yellow-500"; // Gold
      case 1: return "text-gray-400";   // Silver
      case 2: return "text-amber-700";  // Bronze
      default: return "text-gray-500";
    }
  };

  return (
    <Card className="p-6 space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Evaluation Dashboard</h2>
        <ModelSettingsSection
          title="Evaluation Settings"
          description="Configure the default model for evaluating responses"
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
        defaultModelConfig={modelConfig}
      />

      <div className="flex justify-end">
        <Button
          onClick={() => onEvaluate(criteria)}
          disabled={isEvaluating}
        >
          {isEvaluating ? "Evaluating..." : "Run Evaluation"}
        </Button>
      </div>

      {evaluationResults.length > 0 && (
        <>
          {/* Side-by-side comparison */}
          <div className="space-y-6">
            <h3 className="text-xl font-semibold">Side-by-side Comparison</h3>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Test Case</TableHead>
                    {variations.map((_, i) => (
                      <TableHead key={i}>Variation {i + 1}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {testCases.map((testCase, testIndex) => (
                    <TableRow key={testIndex}>
                      <TableCell className="font-medium">{testCase.input}</TableCell>
                      {variations.map((_, varIndex) => {
                        const result = evaluationResults.find(
                          r => r.variationIndex === varIndex && r.testCaseIndex === testIndex
                        );
                        return (
                          <TableCell key={varIndex} className="max-w-md">
                            <div className="space-y-2">
                              <p className="text-sm">{result?.response}</p>
                              {result && (
                                <div className="text-xs space-y-1">
                                  {Object.entries(result.scores).map(([criterionId, score]) => {
                                    const criterion = criteria.find(c => c.id === criterionId);
                                    return criterion ? (
                                      <div key={criterionId} className="flex justify-between">
                                        <span>{criterion.name}:</span>
                                        <span>{(score * 100).toFixed(0)}%</span>
                                      </div>
                                    ) : null;
                                  })}
                                </div>
                              )}
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Charts and statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-semibold mb-4">Overall Performance</h3>
              <BarChart
                width={500}
                height={300}
                data={chartData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 1]} />
                <Tooltip />
                <Legend />
                <Bar dataKey="score" fill="#22c55e" />
              </BarChart>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-4">Top Performers</h3>
              <div className="grid grid-cols-1 gap-4">
                {topThree.map((result, index) => (
                  <Card key={index} className="p-4 relative">
                    <div className="absolute top-2 right-2">
                      <Medal className={`w-6 h-6 ${getMedalColor(index)}`} />
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold">Rank #{index + 1}</h4>
                      <p className="text-sm text-muted-foreground">
                        Score: {(result.score * 100).toFixed(1)}%
                      </p>
                      <pre className="text-xs whitespace-pre-wrap bg-secondary p-2 rounded">
                        {result.variation}
                      </pre>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}