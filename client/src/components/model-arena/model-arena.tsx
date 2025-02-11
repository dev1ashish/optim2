import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import type { ModelConfig } from "@/components/settings/model-settings-section";
import { Gauge } from "lucide-react";
import type { StreamMetrics } from "@/lib/openai";
import { ModelArenaDialog } from "./model-arena-dialog";

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
  // Calculate summary metrics
  const totalCost = results.reduce((acc, result) => acc + result.metrics.estimatedCost, 0);
  const avgTokensPerSec = results.reduce((acc, result) => {
    const duration = (result.metrics.endTime || Date.now()) - result.metrics.startTime;
    return acc + (result.metrics.tokenCount / (duration / 1000));
  }, 0) / Math.max(1, results.length);
  const totalTokens = results.reduce((acc, result) => acc + result.metrics.tokenCount, 0);

  const isProcessing = results.some(r => r.isStreaming);
  const avgProgress = results.reduce((acc, r) => acc + r.streamProgress, 0) / results.length;

  return (
    <Card className="p-4 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Gauge className="w-5 h-5" />
            <Label className="text-lg">Variation {promptVariationIndex + 1}</Label>
          </div>
          <p className="text-sm text-muted-foreground font-mono line-clamp-1">
            {promptVariation}
          </p>
        </div>

        {isProcessing && (
          <Progress value={avgProgress} className="w-20" />
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
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
      </div>

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