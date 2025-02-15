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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const [selectedMetric, setSelectedMetric] = useState("tokensPerSec");
  const [selectedTestCase, setSelectedTestCase] = useState(testCases[0]?.input || "");

  // Calculate metrics for each prompt variation
  const promptMetrics = variations.map((variation, index) => {
    const variationResults = modelResults.filter((_, i) =>
      Math.floor(i / testCases.length) === index
    );
    return {
      variation,
      index,
      metrics: {
        avgTokensPerSec: variationResults.reduce((acc, r) => 
          acc + (r.metrics.tokenCount / ((r.metrics.endTime || Date.now()) - r.metrics.startTime) * 1000), 0) / Math.max(1, variationResults.length),
        avgCost: variationResults.reduce((acc, r) => acc + r.metrics.estimatedCost, 0) / Math.max(1, variationResults.length),
        totalTokens: variationResults.reduce((acc, r) => acc + r.metrics.tokenCount, 0),
        avgResponseTime: variationResults.reduce((acc, r) => 
          acc + ((r.metrics.endTime || Date.now()) - r.metrics.startTime), 0) / Math.max(1, variationResults.length)
      }
    };
  });

  // Create chart data
  const chartData = promptMetrics.map((metric, index) => ({
    name: `Variation ${index + 1}`,
    tokensPerSec: metric.metrics.avgTokensPerSec,
    cost: metric.metrics.avgCost,
    tokens: metric.metrics.totalTokens,
    responseTime: metric.metrics.avgResponseTime
  }));

  return (
    <Card className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-2xl font-bold">Model Comparison Arena</h2>
        <div className="flex gap-4">
          <Select value={selectedMetric} onValueChange={setSelectedMetric}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Metric" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tokensPerSec">Tokens/sec</SelectItem>
              <SelectItem value="cost">Cost</SelectItem>
              <SelectItem value="tokens">Total Tokens</SelectItem>
              <SelectItem value="responseTime">Response Time</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedTestCase} onValueChange={setSelectedTestCase}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select Test Case" />
            </SelectTrigger>
            <SelectContent>
              {testCases.map((testCase, index) => (
                <SelectItem key={index} value={testCase.input}>
                  Test Case {index + 1}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="comparison">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="comparison">Comparison View</TabsTrigger>
          <TabsTrigger value="detailed">Detailed View</TabsTrigger>
          <TabsTrigger value="matrix">Matrix View</TabsTrigger>
        </TabsList>

        <TabsContent value="comparison" className="space-y-6">
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-4">Metric Comparison</h3>
            <div className="w-full overflow-x-auto">
              <BarChart
                width={800}
                height={400}
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey={selectedMetric} fill="#22c55e" />
              </BarChart>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="detailed" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {variations.map((variation, index) => {
              const results = modelResults.filter((_, i) =>
                Math.floor(i / testCases.length) === index
              );
              return (
                <Card key={index} className="p-4">
                  <h3 className="font-semibold mb-2">Variation {index + 1}</h3>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{variation}</p>

                  <div className="space-y-2">
                    {results.map((result, rIndex) => (
                      <div key={rIndex} className="p-2 bg-secondary rounded">
                        <p className="text-sm font-medium mb-1">
                          {result.modelConfig.provider} - {result.modelConfig.model}
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>Tokens/sec: {(result.metrics.tokenCount / ((result.metrics.endTime || Date.now()) - result.metrics.startTime) * 1000).toFixed(1)}</div>
                          <div>Cost: ${result.metrics.estimatedCost.toFixed(4)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="matrix">
          <Card className="p-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Variation</TableHead>
                  {modelResults
                    .filter((_, i) => i < testCases.length)
                    .map((result, index) => (
                      <TableHead key={index}>
                        {result.modelConfig.provider} - {result.modelConfig.model}
                      </TableHead>
                    ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {variations.map((variation, vIndex) => (
                  <TableRow key={vIndex}>
                    <TableCell>Variation {vIndex + 1}</TableCell>
                    {modelResults
                      .filter((_, i) => i < testCases.length)
                      .map((_, mIndex) => {
                        const result = modelResults[vIndex * testCases.length + mIndex];
                        return (
                          <TableCell key={mIndex}>
                            {selectedMetric === 'tokensPerSec' && 
                              `${(result.metrics.tokenCount / ((result.metrics.endTime || Date.now()) - result.metrics.startTime) * 1000).toFixed(1)}/s`}
                            {selectedMetric === 'cost' && 
                              `$${result.metrics.estimatedCost.toFixed(4)}`}
                            {selectedMetric === 'tokens' && 
                              result.metrics.tokenCount}
                            {selectedMetric === 'responseTime' && 
                              `${((result.metrics.endTime || Date.now()) - result.metrics.startTime).toFixed(0)}ms`}
                          </TableCell>
                        );
                      })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {variations.map((variation, index) => (
        <ModelArena
          key={index}
          testCase={selectedTestCase}
          promptVariation={variation}
          promptVariationIndex={index}
          modelConfigs={[modelConfig]}
          onStartComparison={onCompareModels}
          results={modelResults.slice(
            index * testCases.length,
            (index + 1) * testCases.length
          )}
        />
      ))}
    </Card>
  );
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