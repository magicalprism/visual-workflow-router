import { supabase } from '@/lib/supabase';
// 'WorkflowNode' is not exported from '@/types'. Use a local alias for now.
// Replace this with a shared exported Node type from src/types when available.
type WorkflowNode = any;
// import other types from '@/types' as needed
// import type { Workflow } from '@/types';

export async function fetchNodeById(nodeId: number): Promise<WorkflowNode | null> {
  const { data, error } = await supabase
    .from('node')
    .select('*')
    .eq('id', nodeId)
    .single();

  if (error) {
    console.error('Error fetching node:', error);
    return null;
  }

  return data as WorkflowNode;
}

export async function createNode(nodeData: Omit<WorkflowNode, 'id'>): Promise<WorkflowNode | null> {
  const { data, error } = await supabase
    .from('node')
    .insert([nodeData])
    .select()
    .single();

  if (error) {
    console.error('Error creating node:', error);
    return null;
  }

  return data as WorkflowNode;
}

export async function updateNode(nodeId: number, updates: Partial<WorkflowNode>): Promise<boolean> {
  const { error } = await supabase
    .from('node')
    .update(updates)
    .eq('id', nodeId);

  if (error) {
    console.error('Error updating node:', error);
    return false;
  }

  return true;
}

export async function deleteNode(nodeId: number): Promise<boolean> {
  const { error } = await supabase
    .from('node')
    .delete()
    .eq('id', nodeId);

  if (error) {
    console.error('Error deleting node:', error);
    return false;
  }

  return true;
}

export async function fetchAllNodes(workflowId: number): Promise<WorkflowNode[]> {
  const { data, error } = await supabase
    .from('node')
    .select('*')
    .eq('workflow_id', workflowId);

  if (error) {
    console.error('Error fetching nodes:', error);
    return [];
  }

  return data as WorkflowNode[];
}