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

interface ComparisonDashboardProps {
  variations: string[];
  evaluationResults: Record<string, number>[];
}

export function ComparisonDashboard({
  variations,
  evaluationResults
}: ComparisonDashboardProps) {
  const getAverageScore = (result: Record<string, number>) => {
    const values = Object.values(result);
    return values.reduce((a, b) => a + b, 0) / values.length;
  };

  const chartData = variations.map((_, index) => ({
    name: `Variation ${index + 1}`,
    score: getAverageScore(evaluationResults[index])
  }));

  return (
    <Card className="p-6 space-y-6">
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
              {Object.entries(evaluationResults[index]).map(([key, value]) => (
                <TableCell key={key}>{value.toFixed(2)}</TableCell>
              ))}
              <TableCell>
                {getAverageScore(evaluationResults[index]).toFixed(2)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="space-y-4">
        <h3 className="font-semibold">Prompt Variations</h3>
        {variations.map((variation, index) => (
          <div key={index} className="p-4 border rounded">
            <h4 className="font-medium mb-2">Variation {index + 1}</h4>
            <p className="text-sm">{variation}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
