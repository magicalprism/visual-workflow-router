// This file exports TypeScript types and interfaces used throughout the application, ensuring type safety.

export type NodeType = 'action' | 'decision' | 'exception' | 'human' | 'terminal';

export interface WorkflowNode {
  id: string;
  type?: NodeType;
  title: string;
  x: number;
  y: number;
  details?: Record<string, any>;
}

export interface WorkflowEdge {
  id?: string;
  from_node_id: string;
  to_node_id: string;
  label?: string | null;
  style?: 'solid' | 'dashed';
}

export interface GeneratedWorkflow {
  title: string;
  description?: string;
  domain?: string;
  version: number | string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}