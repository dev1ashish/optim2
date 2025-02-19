import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  NodeProps,
  Handle,
  Position,
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

// Custom nodes for each section
function MetaPromptNode({ data }: NodeProps) {
  return (
    <Card className="p-4 min-w-[400px]">
      <Handle type="target" position={Position.Left} />
      <MetaPromptForm {...data} />
      <Handle type="source" position={Position.Right} />
    </Card>
  );
}

function VariationNode({ data }: NodeProps) {
  return (
    <Card className="p-4 min-w-[400px]">
      <Handle type="target" position={Position.Left} />
      <VariationGenerator {...data} />
      <Handle type="source" position={Position.Right} />
    </Card>
  );
}

function TestCaseNode({ data }: NodeProps) {
  return (
    <Card className="p-4 min-w-[400px]">
      <Handle type="target" position={Position.Left} />
      <TestCreator {...data} />
      <Handle type="source" position={Position.Right} />
    </Card>
  );
}

function ComparisonNode({ data }: NodeProps) {
  return (
    <Card className="p-4 min-w-[400px]">
      <Handle type="target" position={Position.Left} />
      <ComparisonDashboard {...data} />
    </Card>
  );
}

// Node types mapping
const nodeTypes = {
  metaPrompt: MetaPromptNode,
  variation: VariationNode,
  testCase: TestCaseNode,
  comparison: ComparisonNode,
};

export function FlowCanvas(props: FlowCanvasProps) {
  // Define nodes for the flow
  const nodes: Node[] = [
    {
      id: '1',
      type: 'metaPrompt',
      position: { x: 0, y: 0 },
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
      position: { x: 400, y: 0 },
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
      position: { x: 800, y: 0 },
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
      position: { x: 1200, y: 0 },
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

  // Define edges connecting the nodes
  const edges: Edge[] = [
    { id: 'e1-2', source: '1', target: '2', animated: props.currentStep >= 2 },
    { id: 'e2-3', source: '2', target: '3', animated: props.currentStep >= 3 },
    { id: 'e3-4', source: '3', target: '4', animated: props.currentStep >= 4 },
  ];

  return (
    <div className={cn("w-full h-[800px]", props.className)}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        className="bg-background"
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}