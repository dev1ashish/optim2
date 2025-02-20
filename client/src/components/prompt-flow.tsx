import ReactFlow, {
  Handle,
  Position,
  Background,
  Controls,
  MarkerType,
  useReactFlow,
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  Connection,
  applyNodeChanges,
  applyEdgeChanges,
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
import { memo, useCallback, useState, useEffect } from 'react';

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

// Memoize the nodes to prevent unnecessary re-renders
const InputNode = memo(({ data }: InputNodeProps) => (
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
));

const MetaPromptNode = memo(({ data }: { data: { content: string } }) => (
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
));

const VariationsNode = memo(({ data }: { data: { variations: string[] } }) => (
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
));

const LeaderboardNode = memo(({ data }: { data: { evaluations: ProcessResult['evaluations'] } }) => (
  <div className="w-[800px]">
    <Handle type="target" position={Position.Top} />
    <Card className="p-4">
      <Label className="text-lg mb-2 block">Evaluation Leaderboard</Label>
      <div className="rounded-lg overflow-hidden border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Rank</TableHead>
              <TableHead className="w-32">Variation</TableHead>
              <TableHead>Scores</TableHead>
              <TableHead className="w-24 text-right">Average</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.evaluations
              .map(({ variationIndex, scores }) => ({
                variationIndex,
                scores,
                avgScore: scores.reduce((sum, s) => sum + (s.score || 0), 0) / scores.length || 0
              }))
              .sort((a, b) => b.avgScore - a.avgScore)
              .map((result, rank) => (
                <TableRow key={result.variationIndex}>
                  <TableCell className="font-medium">#{rank + 1}</TableCell>
                  <TableCell>Variation {result.variationIndex + 1}</TableCell>
                  <TableCell>
                    <div className="space-y-2">
                      {result.scores.map(score => (
                        <div key={score.criterionId} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">{score.criterionId}:</span>
                            <span>{Math.round(score.score * 10)}/10</span>
                          </div>
                          <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary transition-all duration-300"
                              style={{ width: `${Math.round(score.score * 100)}%` }}
                            />
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {score.explanation}
                          </div>
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {(result.avgScore * 10).toFixed(1)}/10
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  </div>
));

// Memoize the node types
const nodeTypes = {
  input: InputNode,
  metaPrompt: MetaPromptNode,
  variations: VariationsNode,
  leaderboard: LeaderboardNode
};

interface PromptFlowProps {
  input: string;
  onInputChange: (value: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  result: ProcessResult | null;
}

export function PromptFlow({ input, onInputChange, onGenerate, isGenerating, result }: PromptFlowProps) {
  // Initialize nodes with state
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  
  // Update nodes and edges when result changes
  useEffect(() => {
    const newNodes = [
      {
        id: '1',
        type: 'input',
        position: { x: 400, y: 50 },
        data: { 
          value: input,
          onChange: onInputChange,
          onGenerate,
          isGenerating
        },
        draggable: true
      }
    ];

    const newEdges: Edge[] = [];

    if (result) {
      newNodes.push(
        {
          id: '2',
          type: 'metaPrompt',
          position: { x: 400, y: 250 },
          data: { content: result.metaPrompt },
          draggable: true
        },
        {
          id: '3',
          type: 'variations',
          position: { x: 400, y: 500 },
          data: { variations: result.variations },
          draggable: true
        },
        {
          id: '4',
          type: 'leaderboard',
          position: { x: 400, y: 800 },
          data: { evaluations: result.evaluations },
          draggable: true
        }
      );

      newEdges.push(
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
      );
    }

    setNodes(newNodes);
    setEdges(newEdges);
  }, [input, onInputChange, onGenerate, isGenerating, result]);

  // Handle node changes (position, selection, etc.)
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  // Handle edge changes
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  // Handle new connections
  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => [
        ...eds,
        {
          ...connection,
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { stroke: '#999' }
        } as Edge,
      ]);
    },
    []
  );

  return (
    <div className="h-[800px] w-full border rounded-lg">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        snapToGrid
        snapGrid={[20, 20]}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        minZoom={0.1}
        maxZoom={4}
        className="bg-background"
      >
        <Background gap={20} size={1} />
        <Controls 
          showInteractive={true}
          className="bg-background border-primary"
        />
      </ReactFlow>
    </div>
  );
}