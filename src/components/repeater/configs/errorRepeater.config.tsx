'use client';

import React from 'react';
import { Repeater } from '../Repeater';
import { makeSupabaseStore } from '../stores/makeSupabaseStore';
import type { FieldConfig } from '../fieldTypes';

type ErrorScope = { workflowId: number; nodeId: number };

type ErrorRow = {
  id?: number;
  workflow_id?: number;
  node_id?: number;
  description?: string;
  is_fixed?: boolean;
  solution?: string;
  owner_names?: string | null; // use DB column
  created_at?: string | null;
  updated_at?: string | null;
};

const fieldDefs: FieldConfig<ErrorRow>[] = [
  { key: 'is_fixed', label: 'Fixed?', type: 'toggle' }, // toggle at top
  { key: 'description', label: 'Description', type: 'textarea', required: true, rows: 3, placeholder: 'What went wrong?' },
  {
    key: 'solution',
    label: 'Solution',
    type: 'textarea',
    rows: 2,
    placeholder: 'How was it fixed?',
    disabled: (r: ErrorRow) => !r?.is_fixed
  },
  { key: 'owner_names', label: 'Owner', type: 'text', placeholder: 'e.g. Jane Doe' },
];

export function ErrorRepeaterMount({ workflowId, nodeId }: { workflowId?: number; nodeId?: number }) {
  const wf = workflowId != null ? Number(workflowId) : undefined;
  const nd = nodeId != null ? Number(nodeId) : undefined;

  console.log('ErrorRepeaterMount mounted', { workflowId: wf, nodeId: nd });

  if (!wf || !nd) return <div className="text-xs text-gray-500">Select a workflow & node to view errors.</div>;

  const store = makeSupabaseStore<ErrorRow, ErrorScope>({
    table: 'error',
    select: 'id,workflow_id,node_id,description,is_fixed,solution,owner_names,created_at,updated_at',
    scopeToFilters: (s: ErrorScope) => [
      { col: 'workflow_id', value: s.workflowId },
      { col: 'node_id', value: s.nodeId },
    ],
  });

  return (
    <Repeater
      title="Errors"
      showTitle={false}
      store={store}
      scope={{ workflowId: wf, nodeId: nd }}
      fields={fieldDefs}
      makeBlank={() => ({
        workflow_id: wf,
        node_id: nd,
        description: '',
        is_fixed: false,
        solution: '',
        owner_names: '',
      })}
    />
  );
}