import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ModelConfig } from "@/components/settings/model-settings-section";
import { Gauge } from "lucide-react";
import type { StreamMetrics } from "@/lib/openai";

interface ModelComparisonResult {
  modelConfig: ModelConfig;
  response: string;
  metrics: StreamMetrics;
  isStreaming: boolean;
  streamProgress: number;
}

interface ModelArenaProps {
  testCase: string;
  modelConfigs: ModelConfig[];
  onStartComparison: (configs: ModelConfig[]) => Promise<void>;
  results: ModelComparisonResult[];
}

export function ModelArena({
  testCase,
  modelConfigs,
  onStartComparison,
  results
}: ModelArenaProps) {
  const [isComparing, setIsComparing] = useState(false);

  return (
    <Card className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Gauge className="w-5 h-5" />
          <Label className="text-lg">Model Arena</Label>
        </div>
        <Button 
          onClick={() => {
            setIsComparing(true);
            onStartComparison(modelConfigs).finally(() => setIsComparing(false));
          }}
          disabled={isComparing}
        >
          {isComparing ? "Comparing..." : "Start Comparison"}
        </Button>
      </div>

      <div className="space-y-4">
        <div className="bg-muted p-3 rounded">
          <Label>Test Input:</Label>
          <p className="mt-1 text-sm">{testCase}</p>
        </div>

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
        )}
      </div>
    </Card>
  );
}