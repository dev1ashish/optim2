import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ModelConfig } from "@/components/settings/model-settings-section";
import { Gauge } from "lucide-react";
import type { StreamMetrics } from "@/lib/openai";
import { ModelSelector } from "./model-selector";
import type { EvaluationCriterion, EvaluationResult } from "@shared/schema";

interface ModelComparisonResult {
  modelConfig: ModelConfig;
  response: string;
  metrics: StreamMetrics;
  isStreaming: boolean;
  streamProgress: number;
  scores?: Record<string, number>;
}

interface ModelArenaProps {
  testCase: string;
  promptVariations: string[];
  selectedVariationIndex: number;
  onVariationSelect: (index: number) => void;
  modelConfigs: ModelConfig[];
  onStartComparison: (configs: ModelConfig[]) => Promise<void>;
  results: ModelComparisonResult[];
  evaluationCriteria: EvaluationCriterion[];
}

export function ModelArena({
  testCase,
  promptVariations,
  selectedVariationIndex,
  onVariationSelect,
  modelConfigs,
  onStartComparison,
  results,
  evaluationCriteria
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

  // Calculate the weighted score for a result
  const calculateWeightedScore = (scores: Record<string, number> | undefined) => {
    if (!scores) return 0;

    let totalWeight = 0;
    let weightedSum = 0;

    evaluationCriteria.forEach(criterion => {
      const score = scores[criterion.id] || 0;
      weightedSum += score * criterion.weight;
      totalWeight += criterion.weight;
    });

    return totalWeight ? weightedSum / totalWeight : 0;
  };

  return (
    <Card className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Gauge className="w-5 h-5" />
          <Label className="text-lg">Model Arena</Label>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-muted p-4 rounded space-y-4">
          <div>
            <Label className="text-sm font-medium">Selected Prompt Variation:</Label>
            <select
              className="mt-1 w-full p-2 rounded border"
              value={selectedVariationIndex}
              onChange={(e) => onVariationSelect(Number(e.target.value))}
            >
              {promptVariations.map((variation, index) => (
                <option key={index} value={index}>
                  Variation {index + 1}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label className="text-sm font-medium">Test Input:</Label>
            <p className="mt-1 text-sm">{testCase}</p>
          </div>
        </div>

        <ModelSelector onModelConfigsChange={setSelectedConfigs} />

        <Button 
          onClick={handleStartComparison}
          disabled={isComparing || selectedConfigs.length === 0}
        >
          {isComparing ? "Comparing..." : "Start Comparison"}
        </Button>

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
                {result.response || "Waiting for response..."}
              </div>

              {/* Performance Metrics */}
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

              {/* Evaluation Scores */}
              {result.scores && (
                <div className="space-y-2">
                  <Label className="text-xs">Evaluation Scores</Label>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    {evaluationCriteria.map(criterion => (
                      <div key={criterion.id} className="flex justify-between">
                        <span>{criterion.name}:</span>
                        <span>{((result.scores?.[criterion.id] || 0) * 100).toFixed(0)}%</span>
                      </div>
                    ))}
                    <div className="col-span-2 border-t pt-1 mt-1">
                      <div className="flex justify-between font-medium">
                        <span>Overall Score:</span>
                        <span>{(calculateWeightedScore(result.scores) * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>

        {results.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Model</TableHead>
                <TableHead>Response Time</TableHead>
                <TableHead>Tokens/sec</TableHead>
                <TableHead>Est. Cost</TableHead>
                <TableHead>Total Tokens</TableHead>
                <TableHead>Overall Score</TableHead>
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
                  <TableCell>{(calculateWeightedScore(result.scores) * 100).toFixed(1)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </Card>
  );
}