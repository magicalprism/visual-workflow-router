export interface WorkflowNode {
  id: number;
  title: string;
  type: string;
  x: number;
  y: number;
  details: Record<string, any>;
  status: 'active' | 'inactive';
  step_id?: string;
  phase?: string;
  owner?: string;
  criticality?: 'low' | 'medium' | 'high';
}

export interface WorkflowEdge {
  id: number;
  from_node_id: number;
  to_node_id: number;
  label?: string;
  style?: 'solid' | 'dashed';
}

export interface Workflow {
  id: number;
  title: string;
  domain: string;
  version: number;
  status: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface NodeModalData {
  title: string;
  step_id: string;
  type: string;
  phase: string;
  owner: string;
  criticality: 'low' | 'medium' | 'high';
  inputs: string[];
  outputs: string[];
  rules: string[];
  edge_cases: string[];
  logging_alerts: string[];
  feature_keys: string[];
  table_keys: string[];
  service_keys: string[];
  flags: string[];
  target_duration_ms: number;
  target_success_rate: number;
  actuals: {
    duration_ms: number;
    success_rate: number;
  };
}