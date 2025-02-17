import { useState } from "react";
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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import type { ModelConfig } from "@/components/settings/model-settings-section";
import type { EvaluationCriterion, TestCase } from "@shared/schema";
import type { StreamMetrics } from "@/lib/openai";

interface PromptComparisonDashboardProps {
  variations: string[];
  testCases: TestCase[];
  modelConfigs: ModelConfig[];
  evaluationCriteria: EvaluationCriterion[];
  results: {
    variationIndex: number;
    testCaseIndex: number;
    modelConfig: ModelConfig;
    response: string;
    metrics: StreamMetrics;
    scores: Record<string, number>;
  }[];
}

export function PromptComparisonDashboard({
  variations,
  testCases,
  modelConfigs,
  evaluationCriteria,
  results
}: PromptComparisonDashboardProps) {
  const [selectedMetric, setSelectedMetric] = useState("accuracy");
  const [selectedTest, setSelectedTest] = useState(testCases[0]?.input || "");

  // Process results for visualization
  const processedData = variations.map((variation, vIndex) => {
    const variationResults = results.filter(r => r.variationIndex === vIndex);
    const metrics = modelConfigs.map(config => {
      const modelResults = variationResults.filter(
        r => r.modelConfig.provider === config.provider && r.modelConfig.model === config.model
      );
      
      if (!modelResults.length) return { value: "N/A" };
      
      switch (selectedMetric) {
        case "accuracy":
          return {
            value: modelResults.reduce((acc, r) => {
              const scores = Object.values(r.scores);
              return acc + (scores.reduce((a, b) => a + b, 0) / scores.length);
            }, 0) / modelResults.length
          };
        case "tokensPerSec":
          return {
            value: modelResults.reduce((acc, r) => 
              acc + (r.metrics.tokenCount / ((r.metrics.endTime || Date.now()) - r.metrics.startTime) * 1000), 0
            ) / modelResults.length
          };
        case "cost":
          return {
            value: modelResults.reduce((acc, r) => acc + r.metrics.estimatedCost, 0)
          };
        default:
          return { value: "N/A" };
      }
    });

    return {
      variation,
      metrics
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Prompt Comparison Dashboard</h2>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm">Test Prompt:</span>
            <Select value={selectedTest} onValueChange={setSelectedTest}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select test prompt" />
              </SelectTrigger>
              <SelectContent>
                {testCases.map((test, index) => (
                  <SelectItem key={index} value={test.input}>
                    Test {index + 1}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm">Metric:</span>
            <Select value={selectedMetric} onValueChange={setSelectedMetric}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Select metric" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="accuracy">Accuracy</SelectItem>
                <SelectItem value="tokensPerSec">Tokens/sec</SelectItem>
                <SelectItem value="cost">Cost</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Tabs defaultValue="comparison" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="comparison">Comparison View</TabsTrigger>
          <TabsTrigger value="detailed">Detailed View</TabsTrigger>
          <TabsTrigger value="matrix">Matrix View</TabsTrigger>
        </TabsList>

        <TabsContent value="comparison">
          <Card className="p-6">
            <h3 className="text-lg font-medium mb-4">Metric Comparison Across Models</h3>
            <div className="w-full h-[400px]">
              <BarChart
                width={800}
                height={350}
                data={modelConfigs.map(config => ({
                  name: `${config.provider} - ${config.model}`,
                  ...variations.reduce((acc, _, index) => ({
                    ...acc,
                    [`Variation ${index + 1}`]: processedData[index].metrics[modelConfigs.indexOf(config)].value
                  }), {})
                }))}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                {variations.map((_, index) => (
                  <Bar 
                    key={index}
                    dataKey={`Variation ${index + 1}`}
                    fill={`hsl(${index * (360 / variations.length)}, 70%, 50%)`}
                  />
                ))}
              </BarChart>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="detailed">
          <div className="grid grid-cols-2 gap-6">
            {variations.map((variation, vIndex) => (
              <Card key={vIndex} className="p-6">
                <h3 className="font-medium mb-4">Variation {vIndex + 1}</h3>
                <p className="text-sm text-muted-foreground mb-4">{variation}</p>
                
                <div className="space-y-4">
                  {modelConfigs.map((config, mIndex) => {
                    const result = results.find(
                      r => r.variationIndex === vIndex && 
                          r.modelConfig.provider === config.provider &&
                          r.modelConfig.model === config.model
                    );
                    
                    return (
                      <div key={mIndex} className="bg-muted p-4 rounded-lg">
                        <h4 className="font-medium mb-2">
                          {config.provider} - {config.model}
                        </h4>
                        {result && (
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Response:</span>
                              <p className="mt-1 line-clamp-3">{result.response}</p>
                            </div>
                            <div className="space-y-2">
                              {Object.entries(result.scores).map(([criterion, score]) => (
                                <div key={criterion} className="flex justify-between">
                                  <span>{criterion}:</span>
                                  <span>{(score * 100).toFixed(0)}%</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="matrix">
          <Card className="p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Model</TableHead>
                  {variations.map((_, index) => (
                    <TableHead key={index}>Variation {index + 1}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {modelConfigs.map((config, mIndex) => (
                  <TableRow key={mIndex}>
                    <TableCell>
                      {config.provider} - {config.model}
                    </TableCell>
                    {variations.map((_, vIndex) => {
                      const value = processedData[vIndex].metrics[mIndex].value;
                      return (
                        <TableCell key={vIndex}>
                          {selectedMetric === "accuracy" ? 
                            `${(Number(value) * 100).toFixed(0)}%` :
                            selectedMetric === "cost" ? 
                            `$${Number(value).toFixed(4)}` :
                            selectedMetric === "tokensPerSec" ?
                            `${Number(value).toFixed(1)}/s` :
                            value}
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
    </div>
  );
}
