import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Gauge, LineChart } from "lucide-react";
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
import type { StreamMetrics } from "@/lib/openai";
import { ModelSelector } from "./model-selector";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ModelComparisonResult {
  modelConfig: ModelConfig;
  response: string;
  metrics: StreamMetrics;
  isStreaming: boolean;
  streamProgress: number;
  error?: string;
}

interface ModelArenaDialogProps {
  testCase: string;
  promptVariation: string;
  promptVariationIndex: number;
  modelConfigs: ModelConfig[];
  onStartComparison: (configs: ModelConfig[]) => Promise<void>;
  results: ModelComparisonResult[];
}

export function ModelArenaDialog({
  testCase,
  promptVariation,
  promptVariationIndex,
  modelConfigs,
  onStartComparison,
  results
}: ModelArenaDialogProps) {
  const metricsData = results.map((result) => ({
    name: `${result.modelConfig.provider} - ${result.modelConfig.model}`,
    tokensPerSec: result.metrics.tokenCount / ((result.metrics.endTime || Date.now()) - result.metrics.startTime) * 1000,
    cost: result.metrics.estimatedCost,
    tokens: result.metrics.tokenCount,
  }));

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">View Results</Button>
      </DialogTrigger>
      <DialogContent className="max-w-[90vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gauge className="w-5 h-5" />
            Prompt Variation {promptVariationIndex + 1} Results
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Select defaultValue="accuracy">
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select Metric" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="accuracy">Accuracy</SelectItem>
                <SelectItem value="tokensPerSec">Tokens/sec</SelectItem>
                <SelectItem value="cost">Cost</SelectItem>
                <SelectItem value="tokens">Total Tokens</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Tabs defaultValue="comparison" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="comparison">Comparison View</TabsTrigger>
              <TabsTrigger value="detailed">Detailed View</TabsTrigger>
              <TabsTrigger value="matrix">Matrix View</TabsTrigger>
            </TabsList>

            {/* Comparison View */}
            <TabsContent value="comparison" className="space-y-4">
              <div className="bg-card p-4 rounded-lg overflow-x-auto">
                <BarChart
                  width={800}
                  height={400}
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
            </TabsContent>

            {/* Detailed View */}
            <TabsContent value="detailed" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
            </TabsContent>

            {/* Matrix View */}
            <TabsContent value="matrix">
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
            </TabsContent>
          </Tabs>

          <ModelSelector onModelConfigsChange={onStartComparison} />
        </div>
      </DialogContent>
    </Dialog>
  );
}