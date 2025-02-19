import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  Panel,
  NodeProps,
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { MetaPromptForm } from '../meta-prompt-form';
import { VariationGenerator } from '../variation-generator';
import { TestCreator } from '../test-creator';
import { ComparisonDashboard } from '../comparison-dashboard';
import type { MetaPromptInput, TestCase, EvaluationResult } from '@shared/schema';
import type { UseMutationResult } from '@tanstack/react-query';

// Custom nodes
function MetaPromptNode({ data }: NodeProps) {
  return (
    <Card className="p-4 min-w-[300px]">
      <Handle type="target" position={Position.Top} className="!bg-primary" />
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Meta Prompt Generation</h3>
      </div>
      <MetaPromptForm {...data} />
      <Handle type="source" position={Position.Bottom} className="!bg-primary" />
    </Card>
  );
}

function VariationNode({ data }: NodeProps) {
  return (
    <Card className="p-4 min-w-[300px]">
      <Handle type="target" position={Position.Top} className="!bg-primary" />
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Variation Generation</h3>
      </div>
      <VariationGenerator {...data} />
      <Handle type="source" position={Position.Bottom} className="!bg-primary" />
    </Card>
  );
}

function TestCaseNode({ data }: NodeProps) {
  return (
    <Card className="p-4 min-w-[300px]">
      <Handle type="target" position={Position.Top} className="!bg-primary" />
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Test Case Generation</h3>
      </div>
      <TestCreator {...data} />
      <Handle type="source" position={Position.Bottom} className="!bg-primary" />
    </Card>
  );
}

function EvaluationNode({ data }: NodeProps) {
  return (
    <Card className="p-4 min-w-[300px]">
      <Handle type="target" position={Position.Top} className="!bg-primary" />
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Evaluation & Comparison</h3>
      </div>
      <ComparisonDashboard {...data} />
    </Card>
  );
}

// Output nodes for displaying generated content
function OutputNode({ data }: NodeProps) {
  return (
    <Card className="p-4 min-w-[250px] max-w-[300px]">
      <Handle type="target" position={Position.Left} className="!bg-primary" />
      <div className="prose dark:prose-invert">
        <h4 className="text-sm font-medium mb-2">{data.title}</h4>
        <pre className="text-xs bg-muted p-2 rounded-md overflow-auto max-h-[200px]">
          {data.content}
        </pre>
      </div>
    </Card>
  );
}

const nodeTypes = {
  metaPrompt: MetaPromptNode,
  variation: VariationNode,
  testCase: TestCaseNode,
  evaluation: EvaluationNode,
  output: OutputNode,
};

interface FlowCanvasProps {
  currentStep: number;
  onStepComplete: (step: number) => void;
  className?: string;

  // State
  baseInput: string;
  metaPrompt: string;
  variations: string[];
  testCases: TestCase[];
  evaluationResults: EvaluationResult[];

  // Mutations
  metaPromptMutation: UseMutationResult<any, Error, MetaPromptInput>;
  variationMutation: UseMutationResult<any, Error, number>;
  testGenerationMutation: UseMutationResult<any, Error, void>;
  evaluationMutation: UseMutationResult<any, Error, any>;

  // Setters
  setBaseInput: (input: string) => void;
  setMetaPrompt: (prompt: string) => void;
  setVariations: (variations: string[]) => void;
  setTestCases: (cases: TestCase[]) => void;
  setEvaluationResults: (results: EvaluationResult[]) => void;
}

export function FlowCanvas(props: FlowCanvasProps) {
  const mainNodes: Node[] = [
    {
      id: 'input',
      type: 'metaPrompt',
      position: { x: 400, y: 50 },
      data: {
        onSubmit: props.metaPromptMutation.mutateAsync,
        isLoading: props.metaPromptMutation.isPending,
      },
    },
    {
      id: 'variations',
      type: 'variation',
      position: { x: 400, y: 250 },
      data: {
        metaPrompt: props.metaPrompt,
        onGenerate: props.variationMutation.mutateAsync,
        variations: props.variations,
        isLoading: props.variationMutation.isPending,
      },
    },
    {
      id: 'testCases',
      type: 'testCase',
      position: { x: 400, y: 450 },
      data: {
        onGenerateTests: props.testGenerationMutation.mutateAsync,
        testCases: props.testCases,
        isLoading: props.testGenerationMutation.isPending,
      },
    },
    {
      id: 'evaluation',
      type: 'evaluation',
      position: { x: 400, y: 650 },
      data: {
        variations: props.variations,
        testCases: props.testCases,
        evaluationResults: props.evaluationResults,
        onEvaluate: props.evaluationMutation.mutateAsync,
        isEvaluating: props.evaluationMutation.isPending,
      },
    },
  ];

  // Output nodes
  const outputNodes: Node[] = [];
  if (props.metaPrompt) {
    outputNodes.push({
      id: 'metaPromptOutput',
      type: 'output',
      position: { x: 800, y: 150 },
      data: {
        title: 'Generated Meta Prompt',
        content: props.metaPrompt,
      },
    });
  }

  if (props.variations.length > 0) {
    outputNodes.push({
      id: 'variationsOutput',
      type: 'output',
      position: { x: 800, y: 350 },
      data: {
        title: 'Generated Variations',
        content: props.variations.join('\n\n'),
      },
    });
  }

  const nodes = [...mainNodes, ...outputNodes];

  const edges: Edge[] = [
    { id: 'e1-2', source: 'input', target: 'variations' },
    { id: 'e2-3', source: 'variations', target: 'testCases' },
    { id: 'e3-4', source: 'testCases', target: 'evaluation' },
  ];

  if (props.metaPrompt) {
    edges.push({ 
      id: 'e1-out', 
      source: 'input', 
      target: 'metaPromptOutput',
      type: 'smoothstep',
      animated: true,
    });
  }

  if (props.variations.length > 0) {
    edges.push({ 
      id: 'e2-out', 
      source: 'variations', 
      target: 'variationsOutput',
      type: 'smoothstep',
      animated: true,
    });
  }

  return (
    <div className={cn("w-full h-[800px]", props.className)}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        className="bg-background"
        minZoom={0.5}
        maxZoom={1.5}
      >
        <Background pattern="dots" color="hsl(var(--muted-foreground))" />
        <Controls className="bg-background border-primary" />
        <Panel position="top-left" className="bg-background/80 p-4 rounded-lg backdrop-blur">
          <h2 className="text-lg font-semibold mb-2">Pipeline Progress</h2>
          <p className="text-sm text-muted-foreground">Step {props.currentStep} of 4</p>
        </Panel>
      </ReactFlow>
    </div>
  );
}