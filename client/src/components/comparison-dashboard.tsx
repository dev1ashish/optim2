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
  LineChart,
  Line,
} from "recharts";
import { Medal, Trophy } from "lucide-react";
import { ModelSettingsSection, type ModelConfig } from "@/components/settings/model-settings-section";
import { EvaluationCriteriaManager } from "./evaluation-criteria-manager";
import type { EvaluationCriterion, EvaluationResult } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { ModelArena } from "./model-arena/model-arena";
import type { StreamMetrics } from "@/lib/openai";

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
  onCompareModels: (prompt: string, testCase: string, configs: ModelConfig[]) => Promise<void>;
  modelResults: {
    modelConfig: ModelConfig;
    response: string;
    metrics: StreamMetrics;
    isStreaming: boolean;
    streamProgress: number;
  }[];
}

// Calculate aggregated metrics for a prompt variation
const calculatePromptMetrics = (results: ComparisonDashboardProps["modelResults"]) => {
  if (!results.length) return null;

  const avgTokensPerSec = results.reduce((acc, result) => {
    const duration = (result.metrics.endTime || Date.now()) - result.metrics.startTime;
    return acc + (result.metrics.tokenCount / (duration / 1000));
  }, 0) / results.length;

  const avgCost = results.reduce((acc, result) => 
    acc + result.metrics.estimatedCost, 0) / results.length;

  const totalTokens = results.reduce((acc, result) => 
    acc + result.metrics.tokenCount, 0);

  const avgResponseTime = results.reduce((acc, result) => {
    const duration = (result.metrics.endTime || Date.now()) - result.metrics.startTime;
    return acc + duration;
  }, 0) / results.length;

  return {
    avgTokensPerSec,
    avgCost,
    totalTokens,
    avgResponseTime
  };
};

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

  // Calculate metrics for each prompt variation
  const promptMetrics = variations.map((variation, index) => {
    const variationResults = modelResults.filter((_, i) => 
      Math.floor(i / testCases.length) === index
    );
    return {
      index,
      variation,
      metrics: calculatePromptMetrics(variationResults) || {
        avgTokensPerSec: 0,
        avgCost: 0,
        totalTokens: 0,
        avgResponseTime: 0
      }
    };
  });

  // Sort prompt variations by different metrics
  const byTokensPerSec = [...promptMetrics].sort((a, b) => 
    b.metrics.avgTokensPerSec - a.metrics.avgTokensPerSec
  );
  const byCost = [...promptMetrics].sort((a, b) => 
    a.metrics.avgCost - b.metrics.avgCost
  );
  const byTokens = [...promptMetrics].sort((a, b) => 
    a.metrics.totalTokens - b.metrics.totalTokens
  );

  // Create chart data for prompt variation performance
  const chartData = promptMetrics.map((metric, index) => ({
    name: `Variation ${index + 1}`,
    tokensPerSec: metric.metrics.avgTokensPerSec,
    cost: metric.metrics.avgCost,
    tokens: metric.metrics.totalTokens,
    responseTime: metric.metrics.avgResponseTime
  }));

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

  const chartData2 = variations.map((_, index) => ({
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

  const metaPrompt = "This is a meta prompt"; // Placeholder, replace with actual meta prompt
  const metaPromptConfig = modelConfig; // Placeholder, adjust as needed


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
          {/* Side-by-side comparison of responses */}
          <div className="space-y-6">
            <h3 className="text-xl font-semibold">Response Comparison</h3>
            <div className="space-y-8">
              {testCases.map((testCase, testIndex) => (
                <Card key={testIndex} className="p-4">
                  <div className="mb-4">
                    <h4 className="font-semibold mb-2">Test Query:</h4>
                    <p className="text-sm bg-muted p-2 rounded">{testCase.input}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {variations.map((_, varIndex) => {
                      const result = evaluationResults.find(
                        r => r.variationIndex === varIndex && r.testCaseIndex === testIndex
                      );
                      return (
                        <div key={varIndex} className="space-y-3">
                          <h5 className="font-medium">Meta-Prompt {varIndex + 1}</h5>
                          <div className="bg-secondary p-3 rounded min-h-[100px] text-sm">
                            {result?.response || "No response generated"}
                          </div>
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
                      );
                    })}
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Charts and statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-semibold mb-4">Overall Performance</h3>
              <BarChart
                width={500}
                height={300}
                data={chartData2}
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
      {/* Prompt Variation Leaderboard */}
      {modelResults.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-500" />
            <h2 className="text-2xl font-bold">Prompt Variation Leaderboard</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Fastest Processing */}
            <Card className="p-4">
              <h3 className="font-semibold mb-4">Fastest Processing (Tokens/sec)</h3>
              <div className="space-y-2">
                {byTokensPerSec.slice(0, 3).map((prompt, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Medal className={`w-5 h-5 ${
                      index === 0 ? "text-yellow-500" :
                      index === 1 ? "text-gray-400" :
                      "text-amber-700"
                    }`} />
                    <span>Variation {prompt.index + 1}:</span>
                    <span className="font-mono">
                      {prompt.metrics.avgTokensPerSec.toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Most Cost-Effective */}
            <Card className="p-4">
              <h3 className="font-semibold mb-4">Most Cost-Effective</h3>
              <div className="space-y-2">
                {byCost.slice(0, 3).map((prompt, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Medal className={`w-5 h-5 ${
                      index === 0 ? "text-yellow-500" :
                      index === 1 ? "text-gray-400" :
                      "text-amber-700"
                    }`} />
                    <span>Variation {prompt.index + 1}:</span>
                    <span className="font-mono">
                      ${prompt.metrics.avgCost.toFixed(4)}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Token Efficiency */}
            <Card className="p-4">
              <h3 className="font-semibold mb-4">Token Efficiency</h3>
              <div className="space-y-2">
                {byTokens.slice(0, 3).map((prompt, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Medal className={`w-5 h-5 ${
                      index === 0 ? "text-yellow-500" :
                      index === 1 ? "text-gray-400" :
                      "text-amber-700"
                    }`} />
                    <span>Variation {prompt.index + 1}:</span>
                    <span className="font-mono">
                      {prompt.metrics.totalTokens.toLocaleString()} tokens
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Performance Trends */}
          <Card className="p-4">
            <h3 className="font-semibold mb-4">Performance Trends</h3>
            <div className="w-full overflow-x-auto">
              <LineChart
                width={800}
                height={400}
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                <Tooltip />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="tokensPerSec"
                  name="Tokens/sec"
                  stroke="#8884d8"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="cost"
                  name="Cost ($)"
                  stroke="#82ca9d"
                />
              </LineChart>
            </div>
          </Card>
        </div>
      )}

      {testCases.map((testCase) => (
        variations.map((variation, variationIndex) => (
          <ModelArena
            key={`${testCase.input}-${variationIndex}`}
            testCase={testCase.input}
            promptVariation={variation}
            promptVariationIndex={variationIndex}
            modelConfigs={[
              metaPromptConfig,
              {
                ...metaPromptConfig,
                provider: "anthropic",
                model: "claude-3"
              },
              {
                ...metaPromptConfig,
                provider: "groq",
                model: "llama2"
              }
            ]}
            onStartComparison={(configs) =>
              onCompareModels(variation, testCase.input, configs)
            }
            results={modelResults.slice(
              variationIndex * testCases.length,
              (variationIndex + 1) * testCases.length
            )}
          />
        ))
      ))}
    </Card>
  );
}