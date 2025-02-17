import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ModelConfig } from "@/components/settings/model-settings-section";
import { Gauge, Settings2 } from "lucide-react";
import type { StreamMetrics } from "@/lib/openai";
import { ModelSelector } from "./model-selector";
import { EvaluationCriteriaManager } from "../evaluation-criteria-manager";
import type { EvaluationCriterion, TestCase } from "@shared/schema";

interface ModelComparisonResult {
  modelConfig: ModelConfig;
  response: string;
  metrics: StreamMetrics;
  isStreaming: boolean;
  streamProgress: number;
  scores?: Record<string, number>;
}

interface ModelArenaProps {
  testCases: TestCase[];
  selectedTestCase: TestCase;
  onTestCaseSelect: (testCase: TestCase) => void;
  modelConfigs: ModelConfig[];
  onStartComparison: (configs: ModelConfig[]) => Promise<void>;
  results: ModelComparisonResult[];
  evaluationCriteria: EvaluationCriterion[];
  onUpdateCriteria: (criteria: EvaluationCriterion[]) => void;
}

export function ModelArena({
  testCases,
  selectedTestCase,
  onTestCaseSelect,
  modelConfigs,
  onStartComparison,
  results,
  evaluationCriteria,
  onUpdateCriteria
}: ModelArenaProps) {
  const [isComparing, setIsComparing] = useState(false);
  const [selectedConfigs, setSelectedConfigs] = useState<ModelConfig[]>(modelConfigs);
  const [viewMode, setViewMode] = useState<"grid" | "matrix">("grid");
  const [showSettings, setShowSettings] = useState(false);

  const handleStartComparison = async () => {
    setIsComparing(true);
    try {
      await onStartComparison(selectedConfigs);
    } finally {
      setIsComparing(false);
    }
  };

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Gauge className="w-5 h-5" />
          <h2 className="text-xl font-bold">Model Arena</h2>
        </div>

        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings2 className="h-4 w-4" />
          </Button>
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "grid" | "matrix")}>
            <TabsList>
              <TabsTrigger value="grid">Grid View</TabsTrigger>
              <TabsTrigger value="matrix">Matrix View</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Test Case Selection */}
      <div>
        <Label>Select Test Prompt:</Label>
        <Select 
          value={selectedTestCase?.input} 
          onValueChange={(value) => {
            const testCase = testCases.find(tc => tc.input === value);
            if (testCase) onTestCaseSelect(testCase);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose a test case..." />
          </SelectTrigger>
          <SelectContent>
            {testCases.map((testCase, index) => (
              <SelectItem key={index} value={testCase.input}>
                Test {index + 1}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <Card className="p-4 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-medium">Settings</h3>
          </div>

          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-medium mb-2">Model Configuration</h4>
              <ModelSelector onModelConfigsChange={setSelectedConfigs} />
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">Evaluation Criteria</h4>
              <EvaluationCriteriaManager
                criteria={evaluationCriteria}
                onCriteriaChange={onUpdateCriteria}
              />
            </div>
          </div>
        </Card>
      )}

      {/* Action Button */}
      <Button 
        onClick={handleStartComparison}
        disabled={isComparing || selectedConfigs.length === 0}
        className="w-full"
      >
        {isComparing ? "Comparing Models..." : "Start Comparison"}
      </Button>

      {/* Results Grid View */}
      {viewMode === "grid" && (
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
      )}

      {/* Results Matrix View */}
      {viewMode === "matrix" && (
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
  );
}