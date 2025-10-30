'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import ReactFlow,
{
  Background,
  Controls,
  MiniMap,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  useNodesState,
  useEdgesState,
  Connection,
  NodeChange,
  EdgeChange,
  Node as RFNode,
  Edge as RFEdge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import FlowToolbar from '@/components/FlowToolbar';
import NodeModal from '@/app/workflows/NodeModal';
import ExportControls from '@/components/ExportControls';
import { useReactFlow } from 'reactflow';

type WorkflowRow = {
  id: number;
  title: string;
  domain?: string;
  version?: string;
  status?: string;
};

export default function WorkflowBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const workflowId = Number(params?.id);
  const [workflow, setWorkflow] = useState<WorkflowRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // React Flow state helpers
  const [nodes, setNodes, onNodesChange] = useNodesState<RFNode[]>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<RFEdge[]>([]);

  // --- History (undo / redo) - hoisted so callbacks can use pushHistory/undo/redo ---
  const applyingHistoryRef = useRef(false);
  const [past, setPast] = useState<{ nodes: RFNode[]; edges: RFEdge[] }[]>([]);
  const [future, setFuture] = useState<{ nodes: RFNode[]; edges: RFEdge[] }[]>([]);

  const snapshot = useCallback(() => ({ nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) }), [nodes, edges]);

  const pushHistory = useCallback(() => {
    if (applyingHistoryRef.current) return;
    setPast((p) => {
      const next = [...p, snapshot()];
      return next.slice(-100);
    });
    setFuture([]);
  }, [snapshot]);

  const undo = useCallback(() => {
    setPast((p) => {
      if (p.length === 0) return p;
      const last = p[p.length - 1];
      const remaining = p.slice(0, -1);
      const current = snapshot();
      applyingHistoryRef.current = true;
      setNodes(last.nodes);
      setEdges(last.edges);
      setFuture((f) => [current, ...f].slice(0, 100));
      setTimeout(() => (applyingHistoryRef.current = false));
      return remaining;
    });
  }, [setNodes, setEdges, snapshot]);

  const redo = useCallback(() => {
    setFuture((f) => {
      if (f.length === 0) return f;
      const next = f[0];
      const rest = f.slice(1);
      const current = snapshot();
      applyingHistoryRef.current = true;
      setNodes(next.nodes);
      setEdges(next.edges);
      setPast((p) => [...p, current].slice(-100));
      setTimeout(() => (applyingHistoryRef.current = false));
      return rest;
    });
  }, [setNodes, setEdges, snapshot]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault(); undo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'Z' && e.shiftKey))) {
        e.preventDefault(); redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);
  // --- end history ---

  // track deletions performed in the UI so we can persist them on save
  const [deletedNodeIds, setDeletedNodeIds] = useState<number[]>([]);
  const [deletedEdgeIds, setDeletedEdgeIds] = useState<string[]>([]);

  // Load workflow + nodes/edges from DB
  const loadWorkflow = useCallback(async () => {
    setLoading(true);
    try {
      const { data: wf, error: wfErr } = await supabase
        .from('workflow')
        .select('*')
        .eq('id', workflowId)
        .single();
      if (wfErr) throw wfErr;
      setWorkflow(wf || null);

      const { data: nodeRows, error: nodeErr } = await supabase
        .from('node')
        .select('*')
        .eq('workflow_id', workflowId);
      if (nodeErr) throw nodeErr;

      const { data: edgeRows, error: edgeErr } = await supabase
        .from('edge')
        .select('*')
        .eq('workflow_id', workflowId);
      if (edgeErr) throw edgeErr;

      const flowNodes: RFNode[] = (nodeRows || []).map((n: any) => {
        const goldenPath = !!(n.details && n.details.goldenPath === true);
        const kind = n.type ?? n.kind ?? 'action';
        return {
          id: String(n.id),
          type: 'default',
          position: { x: n.x ?? 100, y: n.y ?? 100 },
          data: { label: n.title ?? 'Node', nodeData: n },
          style: nodeStyleFor(goldenPath, kind),
        } as RFNode;
      });

      const flowEdges: RFEdge[] = (edgeRows || []).map((e: any) => {
        // color edge from source node's kind (find source in nodeRows)
        const sourceNode = (nodeRows || []).find((nr: any) => Number(nr.id) === Number(e.from_node_id));
        const sourceKind = sourceNode?.type ?? sourceNode?.kind ?? 'action';
        return {
          id: String(e.id ?? `${e.from_node_id}-${e.to_node_id}`),
          source: String(e.from_node_id),
          target: String(e.to_node_id),
          label: e.label || undefined,
          type: 'default',
          style: edgeStyleFor(sourceKind),
        } as RFEdge;
      });

      setNodes(flowNodes);
      setEdges(flowEdges);
    } catch (err) {
      console.error('loadWorkflow error', err);
      alert('Error loading workflow');
    } finally {
      setLoading(false);
    }
  }, [workflowId, setEdges, setNodes]);

  useEffect(() => {
    if (!Number.isFinite(workflowId) || workflowId <= 0) return;
    loadWorkflow();
  }, [workflowId, loadWorkflow]);

  // ReactFlow callbacks
  const onConnect = useCallback(
    (params: Connection) => {
      pushHistory();
      const sourceKind = getNodeKind(params.source);
      const e: RFEdge = {
        id: `edge-${Date.now()}`,
        source: String(params.source),
        target: String(params.target),
        label: '',
        type: 'default',
        style: edgeStyleFor(sourceKind),
        labelStyle: { fontSize: 12, fill: accentColorFor(sourceKind) },
      } as RFEdge;
      setEdges((eds) => addEdge(e as any, eds));
    },
    [setEdges, nodes, pushHistory]
  );

  const onNodesChangeHandler = useCallback(
    (changes: NodeChange[]) => {
      pushHistory();
      // record before applying change so undo restores previous state
      // capture removed node ids from NodeChange entries
      const removed = changes
        .filter((c: any) => c?.type === 'remove' && c.id != null)
        .map((c: any) => Number(c.id))
        .filter((id) => !isNaN(id));
      if (removed.length > 0) {
        setDeletedNodeIds((prev) => {
          const s = new Set(prev.concat(removed));
          return Array.from(s);
        });
      }
      setNodes((nds) => applyNodeChanges(changes, nds));
    },
    [setNodes, pushHistory]
  );

  const onEdgesChangeHandler = useCallback(
    (changes: EdgeChange[]) => {
      pushHistory();
      // capture removed edge ids
      const removed = changes
        .filter((c: any) => c?.type === 'remove' && c.id != null)
        .map((c: any) => String(c.id));
      if (removed.length > 0) {
        setDeletedEdgeIds((prev) => Array.from(new Set(prev.concat(removed))));
      }
      setEdges((eds) => applyEdgeChanges(changes, eds));
    },
    [setEdges, pushHistory]
  );

  // open/close node modal simplified for preview: not implemented here
  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  const [isNodeModalOpen, setIsNodeModalOpen] = useState(false);
  const onNodeClick = useCallback((ev: any, node: any) => {
    ev?.stopPropagation?.();
    ev?.preventDefault?.();
    setSelectedNode(node);
    setIsNodeModalOpen(true);
  }, []);

  // inline edge label edit state
  const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null);
  const [editingEdgeValue, setEditingEdgeValue] = useState<string>('');
  const [editingPos, setEditingPos] = useState<{ x: number; y: number } | null>(null);

  // Add node: persist to DB then append to canvas (keeps DB & UI consistent)
  const handleAddNode = useCallback(
    async (type: string) => {
      try {
        const newNodePayload = {
          workflow_id: workflowId,
          title: `New ${type}`,
          type,
          x: 250,
          y: 250,
          details: { goldenPath: false },
          status: 'active',
        };
        const { data: inserted, error: insertErr } = await supabase
          .from('node')
          .insert([newNodePayload])
          .select()
          .single();
        if (insertErr) throw insertErr;

        const flowNode: RFNode = {
          id: String(inserted.id),
          type: 'default',
          position: { x: inserted.x ?? 250, y: inserted.y ?? 250 },
          data: { label: inserted.title, nodeData: inserted },
          style: nodeStyleFor(!!(inserted.details && inserted.details.goldenPath), inserted.type || 'action'),
        };

        setNodes((nds) => [...nds, flowNode]);

        // If there is a previous node, optionally create an edge (UI + DB)
        const prev = nodes[nodes.length - 1];
        if (prev) {
          const sourceKind = getNodeKind(prev.id);
          const uiEdge: RFEdge = {
            id: `edge-${Date.now()}`,
            source: String(prev.id),
            target: String(inserted.id),
            type: 'default',
            style: edgeStyleFor(sourceKind),
          };

          setEdges((eds) => [...eds, uiEdge]);

          const dbEdge = {
            from_node_id: prev.id,
            to_node_id: inserted.id,
            workflow_id: workflowId,
          };
          const { error: edgeErr } = await supabase.from('edge').insert([dbEdge]);
          if (edgeErr) console.warn('edge persist failed', edgeErr);
        }
      } catch (err) {
        console.error('Error adding node:', err);
        alert('Error adding node');
      }
    },
    [nodes, setEdges, setNodes, workflowId]
  );

  // Save: persist node positions/titles
  const handleSave = useCallback(async () => {
    try {
      setSaving(true);

      // Persist node positions / titles
      for (const n of nodes) {
        const nodeData = (n.data as any)?.nodeData;
        const id = Number(n.id);
        if (!isNaN(id)) {
          // persist details.goldenPath (and title/pos)
          await supabase.from('node').update({
            x: Math.round(n.position.x),
            y: Math.round(n.position.y),
            title: (n.data as any)?.label ?? nodeData?.title,
            details: (nodeData?.details ?? {}),
          }).eq('id', id);
        }
      }

      // Persist deletions first: deleted edges, then deleted nodes (edges referencing nodes removed)
      if (deletedEdgeIds.length > 0) {
        try {
          await supabase.from('edge').delete().in('id', deletedEdgeIds.map((id) => isNaN(Number(id)) ? id : Number(id)));
        } catch (err) {
          console.warn('failed deleting edges', err);
        }
      }

      if (deletedNodeIds.length > 0) {
        try {
          // remove edges that reference deleted nodes
          await supabase.from('edge').delete().in('from_node_id', deletedNodeIds);
          await supabase.from('edge').delete().in('to_node_id', deletedNodeIds);
          // remove the nodes themselves
          await supabase.from('node').delete().in('id', deletedNodeIds);
        } catch (err) {
          console.warn('failed deleting nodes/edges', err);
        }
      }

      // --- sync edges: fetch existing DB edges, compare, insert/delete/update as needed ---
      const { data: existingEdges = [], error: fetchErr } = await supabase
        .from('edge')
        .select('*')
        .eq('workflow_id', workflowId);

      if (fetchErr) throw fetchErr;

      // map existing DB edges by "from_to" key
      const existingMap = new Map<string, any>();
      existingEdges.forEach((e: any) => {
        existingMap.set(`${e.from_node_id}_${e.to_node_id}`, e);
      });

      // map UI edges by same key
      const uiMap = new Map<string, any>();
      edges.forEach((e: any) => {
        const from = Number(e.source);
        const to = Number(e.target);
        uiMap.set(`${from}_${to}`, e);
      });

      const toInsert: any[] = [];
      const toDeleteIds: any[] = [];

      // determine inserts and updates
      for (const [key, uiEdge] of uiMap.entries()) {
        if (!existingMap.has(key)) {
          // new edge in UI -> insert to DB
          const [fromStr, toStr] = key.split('_');
          toInsert.push({
            from_node_id: Number(fromStr),
            to_node_id: Number(toStr),
            workflow_id: workflowId,
            label: uiEdge.label ?? null,
            style: uiEdge.animated ? 'dashed' : 'default',
          });
        } else {
          // existing DB edge found: optionally update label/style if changed
          const dbEdge = existingMap.get(key);
          const desiredStyle = uiEdge.animated ? 'dashed' : 'default';
          const desiredLabel = uiEdge.label ?? null;
          if (dbEdge.label !== desiredLabel || dbEdge.style !== desiredStyle) {
            await supabase.from('edge').update({ label: desiredLabel, style: desiredStyle }).eq('id', dbEdge.id);
          }
          // mark as processed (remove from existingMap). remaining entries will be deleted.
          existingMap.delete(key);
        }
      }

      // remaining edges in existingMap were removed in UI -> delete from DB
      for (const dbEdge of existingMap.values()) {
        toDeleteIds.push(dbEdge.id);
      }

      if (toInsert.length > 0) {
        const { error: insertErr } = await supabase.from('edge').insert(toInsert);
        if (insertErr) throw insertErr;
      }

      if (toDeleteIds.length > 0) {
        const { error: deleteErr } = await supabase.from('edge').delete().in('id', toDeleteIds);
        if (deleteErr) throw deleteErr;
      }

      // clear deletion buffers on successful save
      setDeletedEdgeIds([]);
      setDeletedNodeIds([]);

      alert('Workflow saved!');
    } catch (err) {
      console.error('save error', err);
      alert('Save failed');
    } finally {
      setSaving(false);
    }
  }, [nodes, edges, workflowId, deletedEdgeIds, deletedNodeIds]);

  // Delete selected node helper (simple UI-only variant)
  const handleNodeDelete = useCallback(async (nodeId: string) => {
    try {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
      await supabase.from('node').delete().eq('id', Number(nodeId));
      await supabase.from('edge').delete().or(`from_node_id.eq.${Number(nodeId)},to_node_id.eq.${Number(nodeId)}`);
    } catch (err) {
      console.warn('delete node failed', err);
    }
  }, [setEdges, setNodes]);

  // memoized empty node/edge types to avoid ReactFlow dev warning
  const nodeTypes = useMemo(() => ({}), []);
  const edgeTypes = useMemo(() => ({}), []);

  // helper to resolve accent color (already present)
  const accentColorFor = (kind?: string) => {
    switch ((kind || '').toLowerCase()) {
      case 'action': return '#2563eb';
      case 'decision': return '#d97706';
      case 'human': return '#7c3aed';
      case 'exception': return '#ef4444';
      case 'terminal': return '#10b981';
      default: return '#111827';
    }
  };

  // get a node's kind/type from current nodes state (fallback 'action')
  const getNodeKind = (nodeId?: string | number | null): string => {
    if (nodeId === null || nodeId === undefined) return 'action';
    const idStr = String(nodeId);
    const n = nodes.find((x) => String(x.id) === idStr);
    // check both data.nodeData.type and top-level type
    return (n && (((n.data as any)?.nodeData?.type) || (n as any).type || (n.data as any)?.nodeData?.kind)) || 'action';
  };

  // small util to build edge style object (typed) — thinner connectors
  const edgeStyleFor = (kind?: string): React.CSSProperties => ({ stroke: accentColorFor(kind) as any, strokeWidth: 1.5 as any });

  // helper to produce node styles based on goldenPath and node kind (accent on left)
  const nodeStyleFor = (goldenPath?: boolean, kind?: string): React.CSSProperties => {
    const accent = accentColorFor(kind);
    const base = goldenPath
      ? { background: '#111827', color: '#ffffff', border: '1px solid #111827' }
      : { background: '#ffffff', color: '#111827', border: '1px solid #e5e7eb' };
    // use single borderLeft string (typed as React.CSSProperties) to avoid narrow 'borderLeftStyle' typing issue
    const style: React.CSSProperties = {
      ...base,
      borderLeft: `6px solid ${accent}`,
      paddingLeft: 10,
      boxSizing: 'border-box',
    };
    return style;
  };

  // persist a single node's title/details to the DB immediately (called when modal changes)
  const persistNode = useCallback(
    async (nodePayload: any) => {
      const id = Number(nodePayload?.id);
      if (isNaN(id) || id <= 0) return;
      try {
        await supabase
          .from('node')
          .update({
            title: nodePayload.title ?? null,
            details: nodePayload.details ?? null,
          })
          .eq('id', id);
      } catch (err) {
        console.warn('persistNode failed', err);
      }
    },
    []
  );

  // must be rendered inside ReactFlow so we can read live nodes/edges via useReactFlow()
  function ExportWrapper({ title }: { title?: string }) {
    const rf = useReactFlow();
    const nodes = rf?.getNodes ? rf.getNodes() : [];
    const edges = rf?.getEdges ? rf.getEdges() : [];
    return <ExportControls title={title} nodes={nodes} edges={edges} />;
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/workflows')} className="text-gray-600 hover:text-gray-900">← Back</button>
          <div>
            <h1 className="text-xl font-bold">{workflow?.title ?? 'Untitled workflow'}</h1>
            <p className="text-sm text-gray-500">
              {workflow?.domain ?? ''} {workflow?.domain ? '•' : ''} v{workflow?.version ?? '1'} {workflow?.status ? '• ' + workflow.status : ''}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50">Simulate</button>
          <ExportControls title={workflow?.title} nodes={nodes} edges={edges} />
        </div>
      </div>

      {/* Canvas and toolbar */}
      <div className="flex-1 relative">
        <FlowToolbar className="absolute top-4 left-4 z-50">
          <div className="flex gap-2">
            <button type="button" onClick={() => handleAddNode('action')} className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200">+ Action</button>
            <button type="button" onClick={() => handleAddNode('decision')} className="px-3 py-1.5 text-sm bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200">+ Decision</button>
            <button type="button" onClick={() => handleAddNode('human')} className="px-3 py-1.5 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200">+ Human</button>
            <button type="button" onClick={() => handleAddNode('exception')} className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200">+ Terminal</button>
            <button type="button" onClick={() => handleAddNode('terminal')} className="px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200">+ Terminal</button>
            <button
              type="button"
              onClick={() => undo()}
              title="Undo (Ctrl/Cmd+Z)"
              aria-label="Undo"
              className="p-2 bg-white border rounded hover:bg-gray-50"
            >
              {/* Undo icon */}
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-700" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 19v-2h7.1q1.575 0 2.738-1T18 13.5q0-1.5-1.163-2.5T14.1 10H7.8l2.6 2.6L9 14L4 9l5-5l1.4 1.4L7.8 8h6.3q2.425 0 4.163 1.575T20 13.5q0 2.35-1.738 3.925T14.1 19H7Z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => redo()}
              title="Redo (Ctrl/Cmd+Y)"
              aria-label="Redo"
              className="p-2 bg-white border rounded hover:bg-gray-50"
            >
              {/* Redo icon */}
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-700" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9.9 19q-2.425 0-4.163-1.575T4 13.5q0-2.35 1.738-3.925T9.9 8h6.3l-2.6-2.6L15 4l5 5l-5 5l-1.4-1.4l2.6-2.6H9.9q-1.575 0-2.738 1T6 13.5Q6 15 7.163 16T9.9 17H17v2H9.9Z" />
              </svg>
            </button>
          </div>
        </FlowToolbar>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChangeHandler}
          onEdgesChange={onEdgesChangeHandler}
          onConnect={onConnect}
          onEdgeDoubleClick={(ev: React.MouseEvent, edge) => {
            // open inline editor at pointer position
            ev.preventDefault();
            setEditingEdgeId(String(edge.id));
            setEditingEdgeValue(String(edge.label ?? ''));
            setEditingPos({ x: ev.clientX, y: ev.clientY });
          }}
          onNodeClick={onNodeClick}
          fitView
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
        >
          {/* Export controls removed from canvas (header now provides ExportControls) */}
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>

        {/* Inline edge label editor */}
        {editingEdgeId && editingPos && (
          <div
            style={{
              position: 'absolute',
              left: editingPos.x,
              top: editingPos.y,
              transform: 'translate(-50%,-140%)',
              zIndex: 60,
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <input
              autoFocus
              value={editingEdgeValue}
              onChange={(e) => setEditingEdgeValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  // save
                  pushHistory();
                  setEdges((eds) =>
                    eds.map((ee) =>
                      ee.id === editingEdgeId
                        ? { ...ee, label: String(editingEdgeValue), labelStyle: { fontSize: 12, fill: accentColorFor(getNodeKind(ee.source)) } }
                        : ee
                    )
                  );
                  setEditingEdgeId(null);
                  setEditingPos(null);
                } else if (e.key === 'Escape') {
                  // cancel
                  setEditingEdgeId(null);
                  setEditingPos(null);
                }
              }}
              onBlur={() => {
                // commit on blur
                pushHistory();
                setEdges((eds) =>
                  eds.map((ee) =>
                    ee.id === editingEdgeId
                      ? { ...ee, label: String(editingEdgeValue), labelStyle: { fontSize: 12, fill: accentColorFor(getNodeKind(ee.source)) } }
                      : ee
                  )
                );
                setEditingEdgeId(null);
                setEditingPos(null);
              }}
              className="px-2 py-1 border rounded shadow-sm"
            />
          </div>
        )}

         {/* Node modal (details). pass selectedNode object so modal can read node.data */}
         {selectedNode && (
          <NodeModal
            nodeData={selectedNode}
            isOpen={isNodeModalOpen}
            onClose={() => {
              setIsNodeModalOpen(false);
              setSelectedNode(null);
            }}
            onDelete={() => {
              const dbId = (selectedNode?.data as any)?.nodeData?.id ?? selectedNode?.id;
              handleNodeDelete(String(dbId));
              setIsNodeModalOpen(false);
              setSelectedNode(null);
            }}
            onChange={(updatedNode) => {
              // normalize updatedNode (modal may pass DB row or patch)
              const normalized = updatedNode?.data?.nodeData ? updatedNode.data.nodeData : updatedNode || {};

              // update nodes array so ReactFlow re-renders node style/label immediately
              setNodes((nds) =>
                nds.map((n) => {
                  if (String(n.id) !== String(normalized.id ?? selectedNode?.id)) return n;
                  const nodeData = { ...(n.data as any)?.nodeData, ...(normalized || {}) };
                  const golden = !!(nodeData.details && nodeData.details.goldenPath === true);
                  const kind = nodeData.type ?? (n.data as any)?.nodeData?.type ?? 'action';
                  return {
                    ...n,
                    data: { ...(n.data as any), nodeData, label: nodeData.title ?? (n.data as any)?.label },
                    style: nodeStyleFor(golden, kind),
                  };
                })
               );

              // keep selectedNode in sync so modal input reflects change immediately
              setSelectedNode((prev: any) => {
                if (!prev) return prev;
                const prevNodeData = (prev.data as any)?.nodeData ?? {};
                const merged = { ...prevNodeData, ...(normalized || {}) };
                return {
                  ...prev,
                  data: { ...(prev.data ?? {}), nodeData: merged },
                  label: String(merged.title ?? ((prev.data as any)?.label ?? '')),
                };
              });

              // update edges that originate from this node so their color matches the node kind immediately
              const nodeIdStr = String(normalized.id ?? selectedNode?.id);
              const newKind = normalized.type ?? (normalized as any).type;
              if (nodeIdStr) {
                setEdges((eds) =>
                  eds.map((e) => {
                    if (String(e.source) === nodeIdStr) {
                      return { ...e, style: edgeStyleFor(newKind ?? getNodeKind(e.source)) };
                    }
                    return e;
                  })
                );
              }

              // persist change immediately so no extra Save click required
              void persistNode(normalized);
            }}
          />
        )}
      </div>
    </div>
  );
}
