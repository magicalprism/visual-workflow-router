'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  Node,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Workflow, Node as WorkflowNode, Edge as WorkflowEdge } from '@/types';
import NodeModal from './NodeModal';

export default function WorkflowBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const workflowId = parseInt(params.id as string);
  
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  const [isNodeModalOpen, setIsNodeModalOpen] = useState(false);

  useEffect(() => {
    loadWorkflow();
  }, [workflowId]);

  async function loadWorkflow() {
    try {
      setLoading(true);
      const { data: workflowData, error: workflowError } = await supabase
        .from('workflow')
        .select('*')
        .eq('id', workflowId)
        .single();

      if (workflowError) throw workflowError;
      setWorkflow(workflowData);

      const { data: nodesData, error: nodesError } = await supabase
        .from('node')
        .select('*')
        .eq('workflow_id', workflowId);

      if (nodesError) throw nodesError;

      const { data: edgesData, error: edgesError } = await supabase
        .from('edge')
        .select('*')
        .eq('workflow_id', workflowId);

      if (edgesError) throw edgesError;

      const flowNodes: Node[] = (nodesData || []).map((node: WorkflowNode) => ({
        id: node.id.toString(),
        type: getNodeType(node.type),
        position: { x: node.x, y: node.y },
        data: {
          label: node.title,
          nodeData: node,
        },
      }));

      const flowEdges: Edge[] = (edgesData || []).map((edge: WorkflowEdge) => ({
        id: edge.id.toString(),
        source: edge.from_node_id.toString(),
        target: edge.to_node_id.toString(),
        label: edge.label || undefined,
        type: edge.style === 'dashed' ? 'step' : 'default',
        animated: edge.style === 'dashed',
      }));

      setNodes(flowNodes);
      setEdges(flowEdges);
    } catch (error) {
      console.error('Error loading workflow:', error);
      alert('Error loading workflow');
    } finally {
      setLoading(false);
    }
  }

  function getNodeType(type: string): string {
    switch (type) {
      case 'decision':
        return 'default';
      case 'terminal':
        return 'output';
      case 'action':
      case 'exception':
      case 'human':
      default:
        return 'default';
    }
  }

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((_event: any, node: any) => {
    setSelectedNode(node);
    setIsNodeModalOpen(true);
  }, []);

  async function handleSave() {
    try {
      setSaving(true);
      for (const node of nodes) {
        const nodeData = node.data.nodeData as WorkflowNode;
        await supabase
          .from('node')
          .update({
            x: Math.round(node.position.x),
            y: Math.round(node.position.y),
            title: node.data.label,
          })
          .eq('id', nodeData.id);
      }
      alert('Workflow saved!');
    } catch (error) {
      console.error('Error saving:', error);
      alert('Error saving workflow');
    } finally {
      setSaving(false);
    }
  }

  async function handleAddNode(type: string) {
    try {
      const newNode = {
        workflow_id: workflowId,
        title: `New ${type}`,
        type: type,
        x: 250,
        y: 250,
        details: {},
        status: 'active',
      };

      const { data, error } = await supabase
        .from('node')
        .insert([newNode])
        .select()
        .single();

      if (error) throw error;

      const flowNode: Node = {
        id: data.id.toString(),
        type: getNodeType(data.type),
        position: { x: data.x, y: data.y },
        data: {
          label: data.title,
          nodeData: data,
        },
      };

      setNodes((nds) => [...nds, flowNode]);
    } catch (error) {
      console.error('Error adding node:', error);
      alert('Error adding node');
    }
  }

  async function handleNodeDelete() {
    if (!selectedNode) return;
    const canvasId = selectedNode.id;
    const dbId = selectedNode.data?.nodeData?.id ?? selectedNode.data?.nodeId;

    setNodes((nds: any[]) => nds.filter((n) => n.id !== canvasId));
    setEdges((eds: any[]) => eds.filter((e) => {
      const from = e.source ?? e.from ?? e.from_node_id;
      const to = e.target ?? e.to ?? e.to_node_id;
      return from !== canvasId && to !== canvasId;
    }));

    setIsNodeModalOpen(false);
    setSelectedNode(null);

    try {
      if (dbId) {
        await supabase.from('node').delete().eq('id', dbId);
        await supabase.from('edge').delete().or(`from_node_id.eq.${dbId},to_node_id.eq.${dbId}`);
      } else if (selectedNode.data?.nodeData?.provider_id) {
        const pid = selectedNode.data.nodeData.provider_id;
        await supabase.from('node').delete().eq('provider_id', pid);
        await supabase.from('edge').delete().or(`from_node_id.eq.${pid},to_node_id.eq.${pid}`);
      }
    } catch (err) {
      console.warn('DB delete failed', err);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading workflow...</p>
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="mb-4">Workflow not found</p>
        <button
          onClick={() => router.push('/workflows')}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Back to Library
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/workflows')}
            className="text-gray-600 hover:text-gray-900"
          >
            ← Back
          </button>
          <div>
            <h1 className="text-xl font-bold">{workflow.title}</h1>
            <p className="text-sm text-gray-500">
              {workflow.domain} • v{workflow.version} • {workflow.status}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
            Simulate
          </button>
          <button className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
            Export
          </button>
        </div>
      </div>

      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          fitView
        >
          <Background />
          <Controls />
          <MiniMap />
          
          <Panel position="top-left" className="bg-white rounded-lg shadow-lg p-2 m-4">
            <div className="flex gap-2">
              <button
                onClick={() => handleAddNode('action')}
                className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                title="Add Action Node"
              >
                + Action
              </button>
              <button
                onClick={() => handleAddNode('decision')}
                className="px-3 py-1.5 text-sm bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
                title="Add Decision Node"
              >
                + Decision
              </button>
              <button
                onClick={() => handleAddNode('human')}
                className="px-3 py-1.5 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                title="Add Human Checkpoint"
              >
                + Human
              </button>
              <button
                onClick={() => handleAddNode('exception')}
                className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                title="Add Exception Handler"
              >
                + Exception
              </button>
              <button
                onClick={() => handleAddNode('terminal')}
                className="px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
                title="Add Terminal Node"
              >
                + Terminal
              </button>
            </div>
          </Panel>
        </ReactFlow>
      </div>

      {selectedNode && isNodeModalOpen && (
        <NodeModal
          node={selectedNode}
          onClose={() => setIsNodeModalOpen(false)}
          onDelete={handleNodeDelete}
        />
      )}
    </div>
  );
}