// Consolidated, non-duplicated type definitions for DB records and canvas/runtime shapes.

export type NodeType =
  | 'trigger'
  | 'io'
  | 'process'
  | 'decision'
  | 'action'
  | 'emit'
  | 'human'
  | 'composite';

export type Phase = 'ingest' | 'process' | 'emit' | 'report';
export type Criticality = 'low' | 'medium' | 'high';
export type WorkflowStatus = 'draft' | 'active' | 'archived';

// DB / persistence-level types (numeric ids)
export interface WorkflowRow {
  id: number;
  title: string;
  slug?: string | null;
  description?: string | null;
  domain?: string | null;
  status: WorkflowStatus;
  version: number;
  author_id?: number | null;
  created_at: string;
  updated_at: string;
  parent_id?: number | null;
}

export interface DBNode {
  id: number;
  workflow_id: number;
  provider_id?: string | null;
  step_id?: string | null;
  title: string;
  type: NodeType;
  phase?: Phase | string;
  x: number;
  y: number;
  details: NodeDetails;
  status?: string;
  author_id?: number | null;
  created_at: string;
  updated_at: string;
}

export interface NodeDetails {
  // modal / structured fields (extendable)
  summary?: string;
  rules?: string[]; // freeform or structured rules
  inputs?: any[]; // [{ name,type,required,default }]
  outputs?: any[]; // [{ name,type,on_success,on_failure }]
  runbook?: string;
  metrics?: Record<string, any> | string[]; // flexible
  owner_contact_id?: number;
  sop_urls?: string[];
  timers?: {
    normal_sec?: number;
    near_cutoff_sec?: number;
  };
  flags?: Record<string, boolean>;
  resources?: {
    feature_keys?: string[];
    table_keys?: string[];
    service_keys?: string[];
    flags?: string[];
    versions?: Record<string, string | number>;
  };
  logic?: Record<string, any>;
  problem?: string;
  proposed_fix?: string;
  [key: string]: any;
}

export interface DBEdge {
  id: number;
  workflow_id: number;
  from_node_id: number;
  to_node_id: number;
  label?: string | null;
  style?: string;
  metadata?: Record<string, any>;
  author_id?: number | null;
  created_at?: string;
}

// Runtime / canvas-level types (string ids used by React Flow, etc.)
export interface CanvasNode {
  id: string;
  title: string;
  type?: NodeType;
  x: number;
  y: number;
  details?: Record<string, any>;
  status?: 'active' | 'inactive';
  step_id?: string;
  phase?: Phase | string;
  owner?: string;
  criticality?: Criticality;
  sla_ms?: number;
}

export interface CanvasEdge {
  id?: string;
  from_node_id: string;
  to_node_id: string;
  label?: string | null;
  style?: 'solid' | 'dashed';
  meta?: Record<string, any>;
}

// Payloads / helper types
export interface GeneratedWorkflow {
  title: string;
  description?: string;
  domain?: string;
  version: number | string;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

// Run / observability types
export interface RunRow {
  id: number;
  workflow_id: number;
  input: Record<string, any>;
  started_at: string;
  ended_at?: string | null;
  status: string;
  metrics?: Record<string, any>;
}

export interface RunEventRow {
  id: number;
  run_id: number;
  node_id: number;
  event_type: string;
  payload?: Record<string, any>;
  created_at: string;
}

// Modal data shape used by the Node editor (isolated, version-agnostic)
export interface NodeModalData {
  title: string;
  step_id: string;
  type: NodeType | string;
  phase: Phase | string;
  owner?: string;
  criticality?: Criticality;
  inputs?: Array<{ name: string; type?: string; required?: boolean; default?: any }>;
  outputs?: Array<{ name: string; type?: string; on_success?: string; on_failure?: string }>;
  rules?: string[];
  edge_cases?: string[];
  logging_alerts?: string[];
  feature_keys?: string[];
  table_keys?: string[];
  service_keys?: string[];
  flags?: string[];
  target_duration_ms?: number;
  target_success_rate?: number;
  actuals?: {
    duration_ms?: number;
    success_rate?: number;
  };
  // problem/fix fields
  status?: 'ok' | 'issue' | 'deprecated';
  priority?: 'P1' | 'P2' | 'P3';
  summary?: string;
  tags?: string[];
  problem?: string;
  impact?: string;
  root_cause_notes?: string;
  proposed_fix?: string;
  expected_outcome?: string;
  fix_status?: 'planned' | 'in_progress' | 'done';
  // composite/subflow
  subflow_key?: string;
  pinned_version?: string | number;
  contract?: {
    inputs?: Array<{ name: string; type?: string; required?: boolean; default?: any }>;
    outputs?: Array<{ name: string; type?: string }>;
  };
  // audit
  created_at?: string;
  updated_at?: string;
  author?: string;
  changelog?: Array<{ ts: string; user: string; note: string }>;
  [key: string]: any;
}

export type Workflow = WorkflowRow;
export type Node = DBNode;
export type Edge = DBEdge;