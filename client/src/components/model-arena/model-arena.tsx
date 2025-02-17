import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import type { ModelConfig } from "@/components/settings/model-settings-section";
import type { EvaluationCriterion } from "@shared/schema";
import type { StreamMetrics } from "@/lib/openai";
import { ModelArenaDialog } from "./model-arena-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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

interface ModelComparisonResult {
  modelConfig: ModelConfig;
  response: string;
  metrics: StreamMetrics;
  scores?: Record<string, number>;
  isStreaming: boolean;
  streamProgress: number;
}

interface ModelArenaProps {
  testCase: string;
  promptVariation: string;
  promptVariationIndex: number;
  modelConfigs: ModelConfig[];
  evaluationCriteria: EvaluationCriterion[];
  results: ModelComparisonResult[];
  onStartComparison: (configs: ModelConfig[]) => Promise<void>;
}

export function ModelArena({
  testCase,
  promptVariation,
  promptVariationIndex,
  modelConfigs,
  evaluationCriteria,
  results,
  onStartComparison
}: ModelArenaProps) {
  const [selectedMetric, setSelectedMetric] = useState("accuracy");
  const [selectedView, setSelectedView] = useState("comparison");

  // Get all available metrics
  const metrics = [
    ...evaluationCriteria.map(c => ({ id: c.id, name: c.name })),
    { id: "tokensPerSec", name: "Tokens/sec" },
    { id: "cost", name: "Cost" },
    { id: "tokens", name: "Total Tokens" }
  ];

  // Process results for visualization
  const processedData = results.map(result => {
    const metrics = {
      tokensPerSec: result.metrics.tokenCount / ((result.metrics.endTime || Date.now()) - result.metrics.startTime) * 1000,
      cost: result.metrics.estimatedCost,
      tokens: result.metrics.tokenCount,
    };

    // Add evaluation scores if they exist
    if (result.scores) {
      Object.entries(result.scores).forEach(([key, value]) => {
        metrics[key] = value * 100; // Convert to percentage
      });
    }

    return {
      name: `${result.modelConfig.provider} - ${result.modelConfig.model}`,
      ...metrics
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Prompt Comparison Dashboard</h2>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm">Test Prompt:</span>
            <Select value={testCase} disabled>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Test 1" />
              </SelectTrigger>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm">Metric:</span>
            <Select value={selectedMetric} onValueChange={setSelectedMetric}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {metrics.map(metric => (
                  <SelectItem key={metric.id} value={metric.id}>
                    {metric.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Tabs defaultValue="comparison">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="comparison">Comparison View</TabsTrigger>
          <TabsTrigger value="detailed">Detailed View</TabsTrigger>
          <TabsTrigger value="matrix">Matrix View</TabsTrigger>
        </TabsList>

        <TabsContent value="comparison">
          <Card className="p-6">
            <h3 className="text-lg font-medium mb-4">Metric Comparison</h3>
            <div className="w-full overflow-x-auto">
              <BarChart
                width={800}
                height={350}
                data={processedData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey={selectedMetric} fill="#22c55e" />
              </BarChart>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="detailed">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.map((result, index) => (
              <Card key={index} className="p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">{result.modelConfig.provider} - {result.modelConfig.model}</h3>
                  {result.isStreaming && (
                    <Progress value={result.streamProgress} className="w-20" />
                  )}
                </div>

                <div className="bg-secondary p-3 rounded min-h-[150px] text-sm whitespace-pre-wrap">
                  <h4 className="font-medium mb-2">Response:</h4>
                  {result.response || "No response generated"}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Performance Metrics</Label>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>Tokens/sec: {(result.metrics.tokenCount / ((result.metrics.endTime || Date.now()) - result.metrics.startTime) * 1000).toFixed(1)}</div>
                      <div>Cost: ${result.metrics.estimatedCost.toFixed(4)}</div>
                      <div>Tokens: {result.metrics.tokenCount}</div>
                    </div>
                  </div>

                  {result.scores && (
                    <div className="space-y-2">
                      <Label className="text-xs">Evaluation Metrics</Label>
                      <div className="space-y-1 text-xs">
                        {evaluationCriteria.map(criterion => (
                          <div key={criterion.id} className="flex justify-between">
                            <span>{criterion.name}:</span>
                            <span>{((result.scores?.[criterion.id] || 0) * 100).toFixed(0)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="matrix">
          <Card className="p-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Model</TableHead>
                  {metrics.map(metric => (
                    <TableHead key={metric.id}>{metric.name}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((result, index) => (
                  <TableRow key={index}>
                    <TableCell>{result.modelConfig.provider} - {result.modelConfig.model}</TableCell>
                    {metrics.map(metric => (
                      <TableCell key={metric.id}>
                        {metric.id === "tokensPerSec" && 
                          `${(result.metrics.tokenCount / ((result.metrics.endTime || Date.now()) - result.metrics.startTime) * 1000).toFixed(1)}/s`}
                        {metric.id === "cost" && 
                          `$${result.metrics.estimatedCost.toFixed(4)}`}
                        {metric.id === "tokens" && 
                          result.metrics.tokenCount}
                        {result.scores && metric.id in result.scores && 
                          `${(result.scores[metric.id] * 100).toFixed(0)}%`}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      <ModelArenaDialog
        testCase={testCase}
        promptVariation={promptVariation}
        promptVariationIndex={promptVariationIndex}
        modelConfigs={modelConfigs}
        onStartComparison={onStartComparison}
      />
    </div>
  );
}