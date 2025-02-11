import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ModelConfig } from "@/components/settings/model-settings-section";
import { Gauge, LineChart } from "lucide-react";
import type { StreamMetrics } from "@/lib/openai";
import { ModelSelector } from "./model-selector";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  isStreaming: boolean;
  streamProgress: number;
  error?: string;
}

interface ModelArenaProps {
  testCase: string;
  promptVariation: string;
  promptVariationIndex: number;
  modelConfigs: ModelConfig[];
  onStartComparison: (configs: ModelConfig[]) => Promise<void>;
  results: ModelComparisonResult[];
}

export function ModelArena({
  testCase,
  promptVariation,
  promptVariationIndex,
  modelConfigs,
  onStartComparison,
  results
}: ModelArenaProps) {
  const [isComparing, setIsComparing] = useState(false);
  const [selectedConfigs, setSelectedConfigs] = useState<ModelConfig[]>(modelConfigs);

  const handleStartComparison = async () => {
    setIsComparing(true);
    try {
      await onStartComparison(selectedConfigs);
    } finally {
      setIsComparing(false);
    }
  };

  // Calculate aggregated metrics for the current prompt variation
  const calculateMetrics = () => {
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

  // Create chart data for metrics visualization
  const metricsData = results.map((result) => ({
    name: `${result.modelConfig.provider} - ${result.modelConfig.model}`,
    tokensPerSec: result.metrics.tokenCount / ((result.metrics.endTime || Date.now()) - result.metrics.startTime) * 1000,
    cost: result.metrics.estimatedCost,
    tokens: result.metrics.tokenCount,
  }));

  return (
    <Card className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Gauge className="w-5 h-5" />
            <Label className="text-lg">Model Arena</Label>
          </div>
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">Prompt Variation {promptVariationIndex + 1}</span>
          </div>
        </div>
      </div>

      <div className="bg-secondary p-3 rounded">
        <Label className="text-sm">System Prompt:</Label>
        <p className="mt-1 text-sm font-mono">{promptVariation}</p>
      </div>

      <ModelSelector onModelConfigsChange={setSelectedConfigs} />

      <div className="space-y-4">
        <div className="bg-muted p-3 rounded">
          <Label>Test Input:</Label>
          <p className="mt-1 text-sm">{testCase}</p>
        </div>

        <Button 
          onClick={handleStartComparison}
          disabled={isComparing || selectedConfigs.length === 0}
        >
          {isComparing ? "Comparing..." : "Start Comparison"}
        </Button>

        {results.length > 0 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.map((result, index) => (
                <Card key={index} className="p-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium">{result.modelConfig.provider} - {result.modelConfig.model}</h3>
                    {result.isStreaming && (
                      <Progress value={result.streamProgress} className="w-20" />
                    )}
                  </div>

                  <div className="bg-secondary p-3 rounded min-h-[150px] text-sm whitespace-pre-wrap">
                    {result.error ? (
                      <Alert variant="destructive">
                        <AlertDescription>
                          {result.error}
                        </AlertDescription>
                      </Alert>
                    ) : (
                      result.response || "Waiting for response..."
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <Label className="text-xs">Response Time</Label>
                      <p>{(result.metrics.endTime ? (result.metrics.endTime - result.metrics.startTime) : 0).toFixed(2)}ms</p>
                    </div>
                    <div>
                      <Label className="text-xs">Tokens/sec</Label>
                      <p>{(result.metrics.tokenCount / (Math.max(1, (result.metrics.endTime || Date.now()) - result.metrics.startTime) / 1000)).toFixed(1)}</p>
                    </div>
                    <div>
                      <Label className="text-xs">Est. Cost</Label>
                      <p>${result.metrics.estimatedCost.toFixed(4)}</p>
                    </div>
                    <div>
                      <Label className="text-xs">Tokens</Label>
                      <p>{result.metrics.tokenCount}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <LineChart className="w-5 h-5" />
                Metrics Visualization
              </h3>
              <div className="bg-card p-4 rounded-lg overflow-x-auto">
                <BarChart
                  width={600}
                  height={300}
                  data={metricsData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                  <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="tokensPerSec" name="Tokens/sec" fill="#8884d8" />
                  <Bar yAxisId="right" dataKey="cost" name="Cost ($)" fill="#82ca9d" />
                </BarChart>
              </div>
            </div>

            {/* Comparison Table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Model</TableHead>
                  <TableHead>Response Time</TableHead>
                  <TableHead>Tokens/sec</TableHead>
                  <TableHead>Est. Cost</TableHead>
                  <TableHead>Total Tokens</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((result, index) => (
                  <TableRow key={index}>
                    <TableCell>{result.modelConfig.provider} - {result.modelConfig.model}</TableCell>
                    <TableCell>{(result.metrics.endTime ? (result.metrics.endTime - result.metrics.startTime) : 0).toFixed(2)}ms</TableCell>
                    <TableCell>{(result.metrics.tokenCount / (Math.max(1, (result.metrics.endTime || Date.now()) - result.metrics.startTime) / 1000)).toFixed(1)}</TableCell>
                    <TableCell>${result.metrics.estimatedCost.toFixed(4)}</TableCell>
                    <TableCell>{result.metrics.tokenCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </Card>
  );
}