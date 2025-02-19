import ReactFlow, { 
  Handle, 
  Position, 
  Background, 
  Controls,
  MarkerType
} from 'reactflow';
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import type { EvaluationScore } from "@/lib/openai";

interface ProcessResult {
  metaPrompt: string;
  variations: string[];
  evaluations: Array<{
    variationIndex: number;
    scores: EvaluationScore[];
  }>;
}

interface InputNodeProps {
  data: { 
    value: string;
    onChange: (value: string) => void;
    onGenerate: () => void;
    isGenerating: boolean;
  };
}

const InputNode = ({ data }: InputNodeProps) => (
  <div className="w-[400px]">
    <Handle type="source" position={Position.Bottom} />
    <Card className="p-4">
      <Label className="text-lg mb-2 block">Meta Prompt Generation</Label>
      <div className="space-y-4">
        <Textarea
          value={data.value}
          onChange={(e) => data.onChange(e.target.value)}
          placeholder="What kind of AI assistant do you want?"
          className="min-h-[100px]"
        />
        <Button 
          onClick={data.onGenerate}
          disabled={data.isGenerating || !data.value.trim()}
          className="w-full"
        >
          {data.isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            "Generate"
          )}
        </Button>
      </div>
    </Card>
  </div>
);

const MetaPromptNode = ({ data }: { data: { content: string } }) => (
  <div className="w-[400px]">
    <Handle type="target" position={Position.Top} />
    <Card className="p-4">
      <Label className="text-lg mb-2 block">Generated Meta Prompt</Label>
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
      <Label className="text-lg mb-2 block">Generated Variations</Label>
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rank</TableHead>
              <TableHead>Variation</TableHead>
              <TableHead>Average Score</TableHead>
              <TableHead>Top Criterion</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
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
                <TableRow key={result.variationIndex}>
                  <TableCell>#{rank + 1}</TableCell>
                  <TableCell>Variation {result.variationIndex + 1}</TableCell>
                  <TableCell>{(result.avgScore * 100).toFixed(1)}%</TableCell>
                  <TableCell className="text-sm">{result.topCriterion.explanation}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  </div>
);

interface PromptFlowProps {
  input: string;
  onInputChange: (value: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  result: ProcessResult | null;
}

export function PromptFlow({ input, onInputChange, onGenerate, isGenerating, result }: PromptFlowProps) {
  const nodes = [
    {
      id: '1',
      type: 'input',
      position: { x: 400, y: 0 },
      data: { 
        value: input,
        onChange: onInputChange,
        onGenerate,
        isGenerating
      }
    },
    ...(result ? [
      {
        id: '2',
        type: 'metaPrompt',
        position: { x: 400, y: 200 },
        data: { content: result.metaPrompt }
      },
      {
        id: '3',
        type: 'variations',
        position: { x: 200, y: 400 },
        data: { variations: result.variations }
      },
      {
        id: '4',
        type: 'leaderboard',
        position: { x: 300, y: 700 },
        data: { evaluations: result.evaluations }
      }
    ] : [])
  ];

  const edges = result ? [
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
    },
    {
      id: 'e3-4',
      source: '3',
      target: '4',
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { stroke: '#999' }
    }
  ] : [];

  const nodeTypes = {
    input: InputNode,
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