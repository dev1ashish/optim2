import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import type { ModelConfig } from "@/components/settings/model-settings-section";
import { Gauge, ArrowUpDown } from "lucide-react";
import type { StreamMetrics } from "@/lib/openai";
import { ModelArenaDialog } from "./model-arena-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const [selectedMetric, setSelectedMetric] = useState<string>("tokensPerSec");

  // Calculate summary metrics
  const totalCost = results.reduce((acc, result) => acc + result.metrics.estimatedCost, 0);
  const avgTokensPerSec = results.reduce((acc, result) => {
    const duration = (result.metrics.endTime || Date.now()) - result.metrics.startTime;
    return acc + (result.metrics.tokenCount / (duration / 1000));
  }, 0) / Math.max(1, results.length);
  const totalTokens = results.reduce((acc, result) => acc + result.metrics.tokenCount, 0);

  const isProcessing = results.some(r => r.isStreaming);
  const avgProgress = results.reduce((acc, r) => acc + r.streamProgress, 0) / results.length;

  // Get the best performing model based on selected metric
  const getBestModel = () => {
    if (!results.length) return null;

    return results.reduce((best, current) => {
      let currentValue: number;
      let bestValue: number;

      switch (selectedMetric) {
        case "tokensPerSec":
          currentValue = current.metrics.tokenCount / ((current.metrics.endTime || Date.now()) - current.metrics.startTime) * 1000;
          bestValue = best.metrics.tokenCount / ((best.metrics.endTime || Date.now()) - best.metrics.startTime) * 1000;
          return currentValue > bestValue ? current : best;
        case "cost":
          return current.metrics.estimatedCost < best.metrics.estimatedCost ? current : best;
        case "tokens":
          return current.metrics.tokenCount < best.metrics.tokenCount ? current : best;
        default:
          return best;
      }
    });
  };

  const bestModel = getBestModel();

  return (
    <Card className="p-4 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Gauge className="w-5 h-5" />
            <Label className="text-lg">Variation {promptVariationIndex + 1}</Label>
          </div>
          <p className="text-sm text-muted-foreground font-mono line-clamp-2">
            {promptVariation}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Select 
            value={selectedMetric}
            onValueChange={setSelectedMetric}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Select metric" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tokensPerSec">Tokens/sec</SelectItem>
              <SelectItem value="cost">Cost</SelectItem>
              <SelectItem value="tokens">Total Tokens</SelectItem>
            </SelectContent>
          </Select>

          {isProcessing && (
            <Progress value={avgProgress} className="w-20" />
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-4 text-sm">
        <div>
          <Label className="text-xs">Total Cost</Label>
          <p className="font-mono">${totalCost.toFixed(4)}</p>
        </div>
        <div>
          <Label className="text-xs">Avg. Tokens/sec</Label>
          <p className="font-mono">{avgTokensPerSec.toFixed(1)}</p>
        </div>
        <div>
          <Label className="text-xs">Total Tokens</Label>
          <p className="font-mono">{totalTokens}</p>
        </div>
        <div>
          <Label className="text-xs">Best Model</Label>
          <p className="font-mono truncate">
            {bestModel ? `${bestModel.modelConfig.provider} - ${bestModel.modelConfig.model}` : "N/A"}
          </p>
        </div>
      </div>

      {bestModel && (
        <div className="mb-4 p-4 bg-secondary rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpDown className="w-4 h-4" />
            <Label className="font-medium">Best Performing Model</Label>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <Label className="text-xs">Model</Label>
              <p>{bestModel.modelConfig.provider} - {bestModel.modelConfig.model}</p>
            </div>
            <div>
              <Label className="text-xs">Performance</Label>
              <p className="font-mono">
                {selectedMetric === "tokensPerSec" && `${(bestModel.metrics.tokenCount / ((bestModel.metrics.endTime || Date.now()) - bestModel.metrics.startTime) * 1000).toFixed(1)} tokens/sec`}
                {selectedMetric === "cost" && `$${bestModel.metrics.estimatedCost.toFixed(4)}`}
                {selectedMetric === "tokens" && `${bestModel.metrics.tokenCount} tokens`}
              </p>
            </div>
            <div>
              <Label className="text-xs">Response Time</Label>
              <p className="font-mono">
                {((bestModel.metrics.endTime || Date.now()) - bestModel.metrics.startTime).toFixed(2)}ms
              </p>
            </div>
          </div>
        </div>
      )}

      <ModelArenaDialog
        testCase={testCase}
        promptVariation={promptVariation}
        promptVariationIndex={promptVariationIndex}
        modelConfigs={modelConfigs}
        onStartComparison={onStartComparison}
        results={results}
      />
    </Card>
  );
}