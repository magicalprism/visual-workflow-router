'use client';

import 'reactflow/dist/style.css';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Workflow } from '@/types';
import { formatRelativeTime } from '@/lib/utils';
import Link from 'next/link';
import AIGenerateModal from '@/components/AIGenerateModal';
import DeleteWorkflowButton from '@/components/DeleteWorkflowButton';
import GraphRenderer from '@/components/Graph/GraphRenderer';
import ReactFlow, { Background, Controls, MiniMap, Panel, addEdge, applyNodeChanges, applyEdgeChanges, Connection, NodeChange, EdgeChange } from 'reactflow';

// memoized empty types to avoid React Flow warning (replace with your real types and memoize)
const NODE_TYPES = {};
const EDGE_TYPES = {};

export default function WorkflowsPage() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);

  // React Flow change handlers (memoized)
  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, []);

  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => addEdge(params, eds));
  }, []);

  const onNodeClick = useCallback((_event: any, node: any) => {
    // preview: simple log — real editor uses full NodeModal
    console.log('preview node clicked', node);
  }, []);

  // simple add node implementation for preview toolbar
  const handleAddNode = (type: string) => {
    const id = `preview-${Date.now()}`;
    const newNode = {
      id,
      type: 'default',
      position: { x: 250 + (nodes.length * 20), y: 200 + (nodes.length * 15) },
      data: {
        label: `New ${type}`,
        nodeData: { id, title: `New ${type}`, type },
      },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  useEffect(() => {
    loadWorkflows();
  }, []);

  async function loadWorkflows() {
    try {
      const { data, error } = await supabase
        .from('workflow')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setWorkflows(data || []);
    } catch (error) {
      console.error('Error loading workflows:', error);
    } finally {
      setLoading(false);
    }
  }

  async function createNewWorkflow() {
    try {
      const { data, error } = await supabase
        .from('workflow')
        .insert([
          {
            title: 'Untitled Workflow',
            domain: 'General',
            version: '1.0',
            status: 'draft',
            description: 'New workflow',
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Navigate to the new workflow editor
      router.push(`/workflows/${data.id}`);
    } catch (error) {
      console.error('Error creating workflow:', error);
      alert('Failed to create workflow');
    }
  }

  const filteredWorkflows = workflows.filter(w =>
    w.title.toLowerCase().includes(search.toLowerCase()) ||
    w.domain?.toLowerCase().includes(search.toLowerCase())
  );

  // quick check: try fetching workflows list (optional)
  useEffect(() => {
    // best-effort fetch; ignore errors
    fetch('/api/workflow')
      .then((r) => r.json())
      .then((data) => {
        // if API returns a workflow with nodes/edges, use them
        if (Array.isArray(data) && data.length > 0 && data[0].nodes) {
          setNodes(data[0].nodes || []);
          setEdges(data[0].edges || []);
        }
      })
      .catch(() => {});
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading workflows...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">Workflow Library</h1>
          
          <div className="flex gap-4 mb-6">
            <input
              type="text"
              placeholder="Search workflows..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button 
              onClick={() => setIsAIModalOpen(true)}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-md hover:from-purple-700 hover:to-blue-700 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Generate with AI
            </button>
            <button 
              onClick={createNewWorkflow}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              + New Workflow
            </button>
          </div>
        </div>

        {filteredWorkflows.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">
              {search ? 'No workflows found matching your search' : 'No workflows yet'}
            </p>
            <div className="flex justify-center gap-3">
              <button 
                onClick={() => setIsAIModalOpen(true)}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-md hover:from-purple-700 hover:to-blue-700"
              >
                Generate with AI
              </button>
              <button 
                onClick={createNewWorkflow}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Create Your First Workflow
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredWorkflows.map((workflow) => (
              <Link
                key={workflow.id}
                href={`/workflows/${workflow.id}`}
                className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold">{workflow.title}</h3>
                    {/* delete icon placed to the right of the title, left of the status */}
                    <DeleteWorkflowButton id={String(workflow.id)} />
                  </div>

                  <div>
                    <span className={`px-2 py-1 text-xs rounded ${workflow.status === 'draft' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                      {workflow.status}
                    </span>
                  </div>
                </div>
                
                {workflow.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {workflow.description}
                  </p>
                )}
                
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  {workflow.domain && (
                    <span className="px-2 py-1 bg-gray-100 rounded">{workflow.domain}</span>
                  )}
                  <span>v{workflow.version}</span>
                  <span>•</span>
                  <span>{formatRelativeTime(workflow.updated_at)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* AI Generation Modal */}
      <AIGenerateModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
      />

      {/* Note: canvas/editor moved to workflows/[id] — library should not render full GraphRenderer */}
      {/* Optional: show a lightweight preview or thumbnail per workflow in the list above */}
      <div className="p-6 bg-white rounded-lg shadow-md mt-8">
        <h2 className="text-2xl font-bold mb-4">Workflow Editor (Preview)</h2>
        <p className="text-sm text-gray-500">Editor preview removed from library. Open a workflow to edit.</p>
      </div>
    </div>
  );
}