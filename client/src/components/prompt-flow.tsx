import ReactFlow, { 
  Handle, 
  Position, 
  Background, 
  Controls,
  MarkerType
} from 'reactflow';
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { EvaluationScore } from "@/lib/openai";

interface ProcessResult {
  metaPrompt: string;
  variations: string[];
  evaluations: Array<{
    variationIndex: number;
    scores: EvaluationScore[];
  }>;
}

const MetaPromptNode = ({ data }: { data: { content: string } }) => (
  <div className="w-[400px]">
    <Handle type="target" position={Position.Top} />
    <Card className="p-4">
      <Label className="text-lg mb-2 block">Meta Prompt</Label>
      <ScrollArea className="h-[150px] w-full rounded-md border p-2">
        <div className="whitespace-pre-wrap">{data.content}</div>
      </ScrollArea>
    </Card>
    <Handle type="source" position={Position.Bottom} />
  </div>
);

const VariationsNode = ({ data }: { data: { variations: string[] } }) => (
  <div className="w-[800px]">
    <Handle type="target" position={Position.Top} />
    <Card className="p-4">
      <Label className="text-lg mb-2 block">Variations</Label>
      <div className="grid grid-cols-3 gap-4">
        {data.variations.map((variation, index) => (
          <ScrollArea key={index} className="h-[200px] rounded-md border p-2">
            <div className="font-medium mb-1">Variation {index + 1}</div>
            <div className="whitespace-pre-wrap text-sm">{variation}</div>
          </ScrollArea>
        ))}
      </div>
    </Card>
    <Handle type="source" position={Position.Bottom} />
  </div>
);

const LeaderboardNode = ({ data }: { data: { evaluations: ProcessResult['evaluations'] } }) => (
  <div className="w-[600px]">
    <Handle type="target" position={Position.Top} />
    <Card className="p-4">
      <Label className="text-lg mb-2 block">Evaluation Leaderboard</Label>
      <div className="rounded-lg overflow-hidden border">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="p-2 text-left">Rank</th>
              <th className="p-2 text-left">Variation</th>
              <th className="p-2 text-left">Average Score</th>
              <th className="p-2 text-left">Strengths</th>
            </tr>
          </thead>
          <tbody>
            {data.evaluations
              .map(({ variationIndex, scores }) => ({
                variationIndex,
                avgScore: scores.reduce((sum, s) => sum + s.score, 0) / scores.length,
                topCriterion: scores.reduce((prev, curr) => 
                  curr.score > prev.score ? curr : prev
                )
              }))
              .sort((a, b) => b.avgScore - a.avgScore)
              .map((result, rank) => (
                <tr key={result.variationIndex} className="border-t">
                  <td className="p-2">#{rank + 1}</td>
                  <td className="p-2">Variation {result.variationIndex + 1}</td>
                  <td className="p-2">{(result.avgScore * 100).toFixed(1)}%</td>
                  <td className="p-2 text-sm">{result.topCriterion.explanation}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </Card>
  </div>
);

export function PromptFlow({ result }: { result: ProcessResult }) {
  const nodes = [
    {
      id: '1',
      type: 'metaPrompt',
      position: { x: 400, y: 0 },
      data: { content: result.metaPrompt }
    },
    {
      id: '2',
      type: 'variations',
      position: { x: 200, y: 250 },
      data: { variations: result.variations }
    },
    {
      id: '3',
      type: 'leaderboard',
      position: { x: 300, y: 600 },
      data: { evaluations: result.evaluations }
    }
  ];

  const edges = [
    {
      id: 'e1-2',
      source: '1',
      target: '2',
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { stroke: '#999' }
    },
    {
      id: 'e2-3',
      source: '2',
      target: '3',
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { stroke: '#999' }
    }
  ];

  const nodeTypes = {
    metaPrompt: MetaPromptNode,
    variations: VariationsNode,
    leaderboard: LeaderboardNode
  };

  return (
    <div className="h-[800px] w-full border rounded-lg">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
