import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ModelConfig } from "@/components/settings/model-settings-section";
import { Gauge, Settings2, Award } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
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
  variations: string[];
  onStartComparison: (prompt: string, configs: ModelConfig[]) => Promise<void>;
  results: ModelComparisonResult[];
  evaluationCriteria: EvaluationCriterion[];
  onUpdateCriteria: (criteria: EvaluationCriterion[]) => void;
}

export function ModelArena({
  testCases,
  selectedTestCase,
  onTestCaseSelect,
  variations,
  onStartComparison,
  results,
  evaluationCriteria,
  onUpdateCriteria
}: ModelArenaProps) {
  const [isComparing, setIsComparing] = useState(false);
  const [selectedConfigs, setSelectedConfigs] = useState<ModelConfig[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "matrix" | "visuals">("grid");
  const [showSettings, setShowSettings] = useState(false);
  const [selectedVariation, setSelectedVariation] = useState<string>(variations[0]);

  const handleStartComparison = async () => {
    if (!selectedVariation || selectedConfigs.length === 0) return;
    setIsComparing(true);
    try {
      await onStartComparison(selectedVariation, selectedConfigs);
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

  // Sort results by overall score
  const sortedResults = [...results].sort((a, b) => {
    const scoreA = calculateWeightedScore(a.scores);
    const scoreB = calculateWeightedScore(b.scores);
    return scoreB - scoreA;
  });

  const bestResult = sortedResults[0];

  // Prepare data for visualizations
  const performanceChartData = sortedResults.map(result => ({
    name: `${result.modelConfig.provider} - ${result.modelConfig.model}`,
    score: calculateWeightedScore(result.scores) * 100,
    responseTime: result.metrics.endTime ? (result.metrics.endTime - result.metrics.startTime) : 0,
    tokensPerSecond: result.metrics.tokenCount / (Math.max(1, (result.metrics.endTime || Date.now()) - result.metrics.startTime) / 1000),
    cost: result.metrics.estimatedCost
  }));

  const criteriaChartData = sortedResults.map(result => {
    const data: any = {
      name: `${result.modelConfig.provider} - ${result.modelConfig.model}`,
    };
    evaluationCriteria.forEach(criterion => {
      data[criterion.name] = (result.scores?.[criterion.id] || 0) * 100;
    });
    return data;
  });

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
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "grid" | "matrix" | "visuals")}>
            <TabsList>
              <TabsTrigger value="grid">Grid View</TabsTrigger>
              <TabsTrigger value="matrix">Matrix View</TabsTrigger>
              <TabsTrigger value="visuals">Visuals</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Main Controls */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Select Test Case:</Label>
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

        <div>
          <Label>Select Prompt Variation:</Label>
          <Select
            value={selectedVariation}
            onValueChange={setSelectedVariation}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose a variation..." />
            </SelectTrigger>
            <SelectContent>
              {variations.map((variation, index) => (
                <SelectItem key={index} value={variation}>
                  Variation {index + 1}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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

      {/* Best Result Banner */}
      {bestResult && bestResult.scores && (
        <Card className="p-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-green-600 dark:text-green-400" />
            <div>
              <h3 className="font-medium">Best Performing Combination</h3>
              <p className="text-sm text-muted-foreground">
                {bestResult.modelConfig.provider} - {bestResult.modelConfig.model}
                <span className="ml-2 font-medium">
                  Score: {(calculateWeightedScore(bestResult.scores) * 100).toFixed(1)}%
                </span>
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Results Grid View */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedResults.map((result, index) => (
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
              {evaluationCriteria.map(criterion => (
                <TableHead key={criterion.id}>{criterion.name}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedResults.map((result, index) => (
              <TableRow key={index}>
                <TableCell>{result.modelConfig.provider} - {result.modelConfig.model}</TableCell>
                <TableCell>{(result.metrics.endTime ? (result.metrics.endTime - result.metrics.startTime) : 0).toFixed(2)}ms</TableCell>
                <TableCell>{(result.metrics.tokenCount / (Math.max(1, (result.metrics.endTime || Date.now()) - result.metrics.startTime) / 1000)).toFixed(1)}</TableCell>
                <TableCell>${result.metrics.estimatedCost.toFixed(4)}</TableCell>
                <TableCell>{result.metrics.tokenCount}</TableCell>
                <TableCell>{(calculateWeightedScore(result.scores) * 100).toFixed(1)}%</TableCell>
                {evaluationCriteria.map(criterion => (
                  <TableCell key={criterion.id}>
                    {((result.scores?.[criterion.id] || 0) * 100).toFixed(0)}%
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Visuals View */}
      {viewMode === "visuals" && (
        <div className="space-y-8">
          {/* Overall Performance Chart */}
          <Card className="p-4">
            <h3 className="text-lg font-medium mb-4">Overall Performance</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={performanceChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="score" name="Overall Score" fill="#4ade80" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Criteria Comparison Chart */}
          <Card className="p-4">
            <h3 className="text-lg font-medium mb-4">Criteria Comparison</h3>
            <ResponsiveContainer width="100%" height={400}>
              <RadarChart data={criteriaChartData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="name" />
                <PolarRadiusAxis domain={[0, 100]} />
                {evaluationCriteria.map((criterion, index) => (
                  <Radar
                    key={criterion.id}
                    name={criterion.name}
                    dataKey={criterion.name}
                    stroke={`hsl(${index * (360 / evaluationCriteria.length)}, 70%, 50%)`}
                    fill={`hsl(${index * (360 / evaluationCriteria.length)}, 70%, 50%)`}
                    fillOpacity={0.3}
                  />
                ))}
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </Card>

          {/* Performance Metrics Chart */}
          <Card className="p-4">
            <h3 className="text-lg font-medium mb-4">Performance Metrics</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={performanceChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="responseTime" name="Response Time (ms)" fill="#60a5fa" />
                <Bar yAxisId="left" dataKey="tokensPerSecond" name="Tokens/sec" fill="#f472b6" />
                <Bar yAxisId="right" dataKey="cost" name="Cost ($)" fill="#fbbf24" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}
    </div>
  );
}