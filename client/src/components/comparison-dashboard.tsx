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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Medal } from "lucide-react";
import { ModelSettingsSection, type ModelConfig } from "@/components/settings/model-settings-section";

interface ComparisonDashboardProps {
  variations: string[];
  evaluationResults: Record<string, number>[];
  modelConfig: ModelConfig;
  onModelConfigChange: (config: ModelConfig) => void;
  defaultConfig: ModelConfig;
  useDefaultSettings: boolean;
  onUseDefaultSettingsChange: (use: boolean) => void;
}

export function ComparisonDashboard({
  variations,
  evaluationResults,
  modelConfig,
  onModelConfigChange,
  defaultConfig,
  useDefaultSettings,
  onUseDefaultSettingsChange
}: ComparisonDashboardProps) {
  const getAverageScore = (result: Record<string, number> | undefined) => {
    if (!result) return 0;
    const values = Object.values(result);
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  };

  // Calculate scores and create sorted index
  const scores = (evaluationResults || []).map((result, index) => ({
    index,
    score: getAverageScore(result),
    variation: variations[index],
    metrics: result
  }));

  // Sort by score in descending order
  const sortedScores = [...scores].sort((a, b) => b.score - a.score);
  const topThree = sortedScores.slice(0, 3);

  const chartData = variations.map((_, index) => ({
    name: `Variation ${index + 1}`,
    score: getAverageScore(evaluationResults[index])
  }));

  const getMedalColor = (position: number) => {
    switch (position) {
      case 0: return "text-yellow-500"; // Gold
      case 1: return "text-gray-400";   // Silver
      case 2: return "text-amber-700";  // Bronze
      default: return "text-gray-500";
    }
  };

  if (!evaluationResults || evaluationResults.length === 0) {
    return (
      <Card className="p-6">
        <h2 className="text-2xl font-bold">Results Dashboard</h2>
        <p className="text-muted-foreground">No evaluation results available yet.</p>
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Results Dashboard</h2>
        <ModelSettingsSection
          title="Evaluation Settings"
          description="Configure the model for evaluating prompt variations"
          config={modelConfig}
          onChange={onModelConfigChange}
          defaultConfig={defaultConfig}
          useDefaultSettings={useDefaultSettings}
          onUseDefaultSettingsChange={onUseDefaultSettingsChange}
        />
      </div>

      {/* Leaderboard Section */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-center">Top Performing Variations</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {topThree.map((result, index) => (
            <Card key={index} className="p-4 relative">
              <div className="absolute top-2 right-2">
                <Medal className={`w-6 h-6 ${getMedalColor(index)}`} />
              </div>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-1">Rank #{index + 1}</h3>
                  <p className="text-sm text-muted-foreground">Score: {result.score.toFixed(2)}</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Metrics:</h4>
                  {Object.entries(result.metrics || {}).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span>{key}:</span>
                      <span className="font-medium">{value.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <h4 className="font-medium text-sm mb-2">Variation:</h4>
                  <pre className="text-xs whitespace-pre-wrap bg-secondary p-2 rounded">
                    {typeof result.variation === 'string' ? result.variation : JSON.stringify(result.variation, null, 2)}
                  </pre>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Chart Section */}
      <div className="overflow-x-auto">
        <BarChart
          width={600}
          height={300}
          data={chartData}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis domain={[0, 1]} />
          <Tooltip />
          <Legend />
          <Bar dataKey="score" fill="#22c55e" />
        </BarChart>
      </div>

      {/* Detailed Results Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Variation</TableHead>
            {Object.keys(evaluationResults[0] || {}).map((criterion) => (
              <TableHead key={criterion}>{criterion}</TableHead>
            ))}
            <TableHead>Average Score</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {variations.map((variation, index) => (
            <TableRow key={index}>
              <TableCell>Variation {index + 1}</TableCell>
              {Object.entries(evaluationResults[index] || {}).map(([key, value]) => (
                <TableCell key={key}>{value.toFixed(2)}</TableCell>
              ))}
              <TableCell>
                {evaluationResults[index] ? getAverageScore(evaluationResults[index]).toFixed(2) : 'N/A'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* All Variations */}
      <div className="space-y-4">
        <h3 className="font-semibold">All Prompt Variations</h3>
        {variations.map((variation, index) => (
          <div key={index} className="p-4 border rounded">
            <h4 className="font-medium mb-2">Variation {index + 1}</h4>
            <pre className="whitespace-pre-wrap text-sm">{typeof variation === 'string' ? variation : JSON.stringify(variation, null, 2)}</pre>
          </div>
        ))}
      </div>
    </Card>
  );
}