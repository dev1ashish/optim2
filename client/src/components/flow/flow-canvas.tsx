import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  NodeProps,
  Handle,
  Position,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { MetaPromptForm } from '../meta-prompt-form';
import { VariationGenerator } from '../variation-generator';
import { TestCreator } from '../test-creator';
import { ComparisonDashboard } from '../comparison-dashboard';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { ModelConfig } from '@/types/model';
import type { MetaPromptInput, TestCase, EvaluationResult } from '@shared/schema';
import type { UseMutationResult } from '@tanstack/react-query';

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
  modelResults: any[];

  // Config
  metaPromptConfig: ModelConfig;
  variationConfig: ModelConfig;
  testConfig: ModelConfig;
  evaluationConfig: ModelConfig;
  useDefaultForVariation: boolean;
  useDefaultForTest: boolean;
  useDefaultForEvaluation: boolean;

  // Mutations
  metaPromptMutation: UseMutationResult<any, Error, MetaPromptInput>;
  variationMutation: UseMutationResult<any, Error, number>;
  testGenerationMutation: UseMutationResult<any, Error, void>;
  evaluationMutation: UseMutationResult<any, Error, any>;

  // Handlers
  onModelConfigChange: (config: ModelConfig) => void;
  handleModelComparison: (prompt: string, testCase: string, configs: ModelConfig[]) => Promise<void>;

  // Setters
  setBaseInput: (input: string) => void;
  setMetaPrompt: (prompt: string) => void;
  setVariations: (variations: string[]) => void;
  setTestCases: (cases: TestCase[]) => void;
  setEvaluationResults: (results: EvaluationResult[]) => void;
  setModelResults: (results: any[]) => void;
  setMetaPromptConfig: (config: ModelConfig) => void;
  setVariationConfig: (config: ModelConfig) => void;
  setTestConfig: (config: ModelConfig) => void;
  setEvaluationConfig: (config: ModelConfig) => void;
  setUseDefaultForVariation: (use: boolean) => void;
  setUseDefaultForTest: (use: boolean) => void;
  setUseDefaultForEvaluation: (use: boolean) => void;
}

// Custom nodes with improved styling
function MetaPromptNode({ data, dragging }: NodeProps) {
  return (
    <Card className={cn(
      "p-6 min-w-[400px] transition-all duration-200 shadow-lg",
      "border-2 hover:border-primary",
      dragging ? "opacity-70" : "opacity-100"
    )}>
      <Handle type="target" position={Position.Left} className="!bg-primary" />
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-primary">Meta Prompt Generation</h3>
        <p className="text-sm text-muted-foreground">Define your AI assistant's purpose</p>
      </div>
      <MetaPromptForm {...data} />
      <Handle type="source" position={Position.Right} className="!bg-primary" />
    </Card>
  );
}

function VariationNode({ data, dragging }: NodeProps) {
  return (
    <Card className={cn(
      "p-6 min-w-[400px] transition-all duration-200 shadow-lg",
      "border-2 hover:border-primary",
      dragging ? "opacity-70" : "opacity-100"
    )}>
      <Handle type="target" position={Position.Left} className="!bg-primary" />
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-primary">Prompt Variations</h3>
        <p className="text-sm text-muted-foreground">Generate and refine variations</p>
      </div>
      <VariationGenerator {...data} />
      <Handle type="source" position={Position.Right} className="!bg-primary" />
    </Card>
  );
}

function TestCaseNode({ data, dragging }: NodeProps) {
  return (
    <Card className={cn(
      "p-6 min-w-[400px] transition-all duration-200 shadow-lg",
      "border-2 hover:border-primary",
      dragging ? "opacity-70" : "opacity-100"
    )}>
      <Handle type="target" position={Position.Left} className="!bg-primary" />
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-primary">Test Cases</h3>
        <p className="text-sm text-muted-foreground">Create and manage test scenarios</p>
      </div>
      <TestCreator {...data} />
      <Handle type="source" position={Position.Right} className="!bg-primary" />
    </Card>
  );
}

function ComparisonNode({ data, dragging }: NodeProps) {
  return (
    <Card className={cn(
      "p-6 min-w-[400px] transition-all duration-200 shadow-lg",
      "border-2 hover:border-primary",
      dragging ? "opacity-70" : "opacity-100"
    )}>
      <Handle type="target" position={Position.Left} className="!bg-primary" />
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-primary">Evaluation Dashboard</h3>
        <p className="text-sm text-muted-foreground">Compare and analyze results</p>
      </div>
      <ComparisonDashboard {...data} />
    </Card>
  );
}

const nodeTypes = {
  metaPrompt: MetaPromptNode,
  variation: VariationNode,
  testCase: TestCaseNode,
  comparison: ComparisonNode,
};

export function FlowCanvas(props: FlowCanvasProps) {
  // Define nodes with better spacing
  const nodes: Node[] = [
    {
      id: '1',
      type: 'metaPrompt',
      position: { x: 50, y: 50 },
      draggable: true,
      data: {
        onSubmit: props.metaPromptMutation.mutateAsync,
        modelConfig: props.metaPromptConfig,
        onModelConfigChange: props.setMetaPromptConfig,
        isLoading: props.metaPromptMutation.isPending
      },
      style: {
        opacity: props.currentStep >= 1 ? 1 : 0.5,
        pointerEvents: props.currentStep >= 1 ? 'all' : 'none',
      },
    },
    {
      id: '2',
      type: 'variation',
      position: { x: 600, y: 50 },
      draggable: true,
      data: {
        metaPrompt: props.metaPrompt,
        onGenerate: props.variationMutation.mutateAsync,
        variations: props.variations,
        isLoading: props.variationMutation.isPending,
        modelConfig: props.useDefaultForVariation ? props.metaPromptConfig : props.variationConfig,
        onModelConfigChange: props.setVariationConfig,
        defaultConfig: props.metaPromptConfig,
        useDefaultSettings: props.useDefaultForVariation,
        onUseDefaultSettingsChange: props.setUseDefaultForVariation
      },
      style: {
        opacity: props.currentStep >= 2 ? 1 : 0.5,
        pointerEvents: props.currentStep >= 2 ? 'all' : 'none',
      },
    },
    {
      id: '3',
      type: 'testCase',
      position: { x: 1150, y: 50 },
      draggable: true,
      data: {
        onAddTest: (test: TestCase) => {
          props.setTestCases([...props.testCases, test]);
          props.onStepComplete(3);
        },
        onGenerateTests: props.testGenerationMutation.mutateAsync,
        testCases: props.testCases,
        onRemoveTest: (index: number) => {
          props.setTestCases(props.testCases.filter((_, i) => i !== index));
        },
        onUpdateTest: (index: number, test: TestCase) => {
          const newTestCases = [...props.testCases];
          newTestCases[index] = test;
          props.setTestCases(newTestCases);
        },
        modelConfig: props.useDefaultForTest ? props.metaPromptConfig : props.testConfig,
        onModelConfigChange: props.setTestConfig,
        defaultConfig: props.metaPromptConfig,
        useDefaultSettings: props.useDefaultForTest,
        onUseDefaultSettingsChange: props.setUseDefaultForTest,
        isGenerating: props.testGenerationMutation.isPending
      },
      style: {
        opacity: props.currentStep >= 3 ? 1 : 0.5,
        pointerEvents: props.currentStep >= 3 ? 'all' : 'none',
      },
    },
    {
      id: '4',
      type: 'comparison',
      position: { x: 1700, y: 50 },
      draggable: true,
      data: {
        variations: props.variations,
        testCases: props.testCases,
        evaluationResults: props.evaluationResults,
        onEvaluate: props.evaluationMutation.mutateAsync,
        isEvaluating: props.evaluationMutation.isPending,
        modelConfig: props.useDefaultForEvaluation ? props.metaPromptConfig : props.evaluationConfig,
        onModelConfigChange: props.setEvaluationConfig,
        defaultConfig: props.metaPromptConfig,
        useDefaultSettings: props.useDefaultForEvaluation,
        onUseDefaultSettingsChange: props.setUseDefaultForEvaluation,
        modelResults: props.modelResults,
        onCompareModels: props.handleModelComparison
      },
      style: {
        opacity: props.currentStep >= 4 ? 1 : 0.5,
        pointerEvents: props.currentStep >= 4 ? 'all' : 'none',
      },
    },
  ];

  // Enhanced edges with better styling
  const edges: Edge[] = [
    { 
      id: 'e1-2', 
      source: '1', 
      target: '2', 
      animated: props.currentStep >= 2,
      style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 },
      className: "transition-opacity duration-300"
    },
    { 
      id: 'e2-3', 
      source: '2', 
      target: '3', 
      animated: props.currentStep >= 3,
      style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 },
      className: "transition-opacity duration-300"
    },
    { 
      id: 'e3-4', 
      source: '3', 
      target: '4', 
      animated: props.currentStep >= 4,
      style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 },
      className: "transition-opacity duration-300"
    },
  ];

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
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
      >
        <Background color="hsl(var(--muted-foreground))" variant="dots" />
        <Controls className="bg-background border-primary" />
        <Panel position="top-left" className="bg-background/80 p-4 rounded-lg backdrop-blur">
          <h2 className="text-lg font-semibold mb-2">Prompt Optimization Flow</h2>
          <p className="text-sm text-muted-foreground">Step {props.currentStep} of 4</p>
        </Panel>
      </ReactFlow>
    </div>
  );
}