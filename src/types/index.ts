export interface Workflow {
  id: number;
  title: string;
  slug: string | null;
  description: string | null;
  domain: string | null;
  status: 'draft' | 'active' | 'archived';
  version: number;
  author_id: number | null;
  created_at: string;
  updated_at: string;
  parent_id: number | null;
}

export interface Node {
  id: number;
  workflow_id: number;
  title: string;
  type: 'action' | 'decision' | 'exception' | 'human' | 'terminal';
  x: number;
  y: number;
  details: NodeDetails;
  status: string;
  author_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface NodeDetails {
  summary?: string;
  rules?: string[];
  inputs?: string[];
  outputs?: string[];
  runbook?: string;
  metrics?: string[];
  owner_contact_id?: number;
  sop_urls?: string[];
  timers?: {
    normal_sec?: number;
    near_cutoff_sec?: number;
  };
  flags?: {
    vip_sensitive?: boolean;
    holiday_mode?: boolean;
  };
}

export interface Edge {
  id: number;
  workflow_id: number;
  from_node_id: number;
  to_node_id: number;
  label: string | null;
  style: string;
  metadata: Record<string, any>;
  author_id: number | null;
  created_at: string;
}

export interface Run {
  id: number;
  workflow_id: number;
  input: Record<string, any>;
  started_at: string;
  ended_at: string | null;
  status: string;
  metrics: Record<string, any>;
}

export interface RunEvent {
  id: number;
  run_id: number;
  node_id: number;
  event_type: string;
  payload: Record<string, any>;
  created_at: string;
}

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
