'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
import { supabase } from '@/lib/supabase';
import { Workflow, Node as WorkflowNode, Edge as WorkflowEdge } from '@/types';

export default function WorkflowBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const workflowId = parseInt(params.id as string);
  
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  // Load workflow data
  useEffect(() => {
    loadWorkflow();
  }, [workflowId]);

  async function loadWorkflow() {
    try {
      setLoading(true);

      // Load workflow
      const { data: workflowData, error: workflowError } = await supabase
        .from('workflow')
        .select('*')
        .eq('id', workflowId)
        .single();

      if (workflowError) throw workflowError;
      setWorkflow(workflowData);

      // Load nodes
      const { data: nodesData, error: nodesError } = await supabase
        .from('node')
        .select('*')
        .eq('workflow_id', workflowId);

      if (nodesError) throw nodesError;

      // Load edges
      const { data: edgesData, error: edgesError } = await supabase
        .from('edge')
        .select('*')
        .eq('workflow_id', workflowId);

      if (edgesError) throw edgesError;

      // Convert to React Flow format
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
        return 'default'; // diamond shape would need custom node
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

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  async function handleSave() {
    try {
      setSaving(true);

      // Update nodes
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

      // Update edges (simplified - in production, handle add/delete)
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

      // Add to canvas
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
      {/* Header */}
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

      {/* Canvas */}
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
          
          {/* Toolbar Panel */}
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

      {/* Side Panel - Node Details */}
      {selectedNode && (
        <div className="absolute top-16 right-0 w-96 h-full bg-white border-l shadow-lg overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Details</h2>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  type="text"
                  value={selectedNode.data.label}
                  onChange={(e) => {
                    setNodes((nds) =>
                      nds.map((node) =>
                        node.id === selectedNode.id
                          ? { ...node, data: { ...node.data, label: e.target.value } }
                          : node
                      )
                    );
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <p className="text-sm text-gray-600">
                  {selectedNode.data.nodeData?.type || 'Unknown'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Position</label>
                <p className="text-sm text-gray-600">
                  X: {Math.round(selectedNode.position.x)}, Y: {Math.round(selectedNode.position.y)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Summary</label>
                <textarea
                  placeholder="Brief description..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Rules</label>
                <textarea
                  placeholder="Enter rules, one per line..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={4}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Runbook</label>
                <textarea
                  placeholder="Step-by-step instructions..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={6}
                />
              </div>

              <button className="w-full py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
                Delete Node
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
