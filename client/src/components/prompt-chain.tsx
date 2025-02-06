import ReactFlow, { 
  Node, 
  Edge,
  Background,
  Controls,
  MiniMap
} from 'reactflow';
import 'reactflow/dist/style.css';

interface PromptChainProps {
  currentStep: number;
}

export function PromptChain({ currentStep }: PromptChainProps) {
  const nodes: Node[] = [
    {
      id: '1',
      type: 'default',
      data: { label: 'Meta Prompt Generator' },
      position: { x: 0, y: 0 },
      style: { 
        background: currentStep >= 1 ? '#22c55e' : '#cbd5e1',
        color: 'white',
        border: 'none',
        width: 200 
      }
    },
    {
      id: '2',
      type: 'default',
      data: { label: 'Variation Generator' },
      position: { x: 250, y: 0 },
      style: { 
        background: currentStep >= 2 ? '#22c55e' : '#cbd5e1',
        color: 'white',
        border: 'none',
        width: 200 
      }
    },
    {
      id: '3',
      type: 'default',
      data: { label: 'Test Set Creation' },
      position: { x: 500, y: 0 },
      style: { 
        background: currentStep >= 3 ? '#22c55e' : '#cbd5e1',
        color: 'white',
        border: 'none',
        width: 200 
      }
    },
    {
      id: '4',
      type: 'default',
      data: { label: 'Comparison & Evaluation' },
      position: { x: 750, y: 0 },
      style: { 
        background: currentStep >= 4 ? '#22c55e' : '#cbd5e1',
        color: 'white',
        border: 'none',
        width: 200 
      }
    },
  ];

  const edges: Edge[] = [
    { id: 'e1-2', source: '1', target: '2' },
    { id: 'e2-3', source: '2', target: '3' },
    { id: 'e3-4', source: '3', target: '4' },
  ];

  return (
    <div style={{ height: 200 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        attributionPosition="bottom-right"
      >
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  );
}
