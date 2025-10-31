'use client';

import React from 'react';
// Use the local relative Repeater import that matches the on-disk path
import { Repeater } from '../repeater';
import type { FieldConfig } from '../fieldTypes';
import { makeSupabaseStore } from '../stores/makeSupabaseStore';

export type ErrorRow = {
  id?: number;
  workflow_id: number;
  node_id: number;
  description: string;
  is_fixed: boolean;
  solution?: string | null;
  solver_contact_id?: number | null;
  reported_at?: string | null;
  fixed_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type ErrorScope = { workflowId: number; nodeId: number };

const errorStore = makeSupabaseStore<ErrorRow, ErrorScope>({
  table: 'error',
  select:
    'id,workflow_id,node_id,description,is_fixed,solution,solver_contact_id,reported_at,fixed_at,created_at,updated_at',
  scopeToFilters: (s: ErrorScope) => [
    { col: 'workflow_id', value: s.workflowId },
    { col: 'node_id', value: s.nodeId }
  ],
  sort: (q: any) => q.order('is_fixed', { ascending: true }).order('reported_at', { ascending: false })
});

const fields: FieldConfig<ErrorRow>[] = [
  { key: 'description', label: 'Description', type: 'textarea', required: true, rows: 3, placeholder: 'What went wrong?' },
  { key: 'is_fixed', label: 'Fixed?', type: 'checkbox' },
  {
    key: 'solution',
    label: 'Solution',
    type: 'textarea',
    rows: 2,
    placeholder: 'How was it fixed?',
    disabled: (r: ErrorRow) => !r.is_fixed
  },
  { key: 'solver_contact_id', label: 'Solver contact ID', type: 'number', placeholder: 'e.g. 123' }
];

const makeBlank = (s: ErrorScope): ErrorRow => ({
  workflow_id: s.workflowId,
  node_id: s.nodeId,
  description: '',
  is_fixed: false,
  solution: '',
  solver_contact_id: null,
  reported_at: new Date().toISOString()
});

export function ErrorRepeaterMount({ workflowId, nodeId }: { workflowId: number; nodeId: number }) {
  return (
    <Repeater
      title="Errors"
      scope={{ workflowId, nodeId }}
      store={errorStore}
      fields={fields}
      makeBlank={makeBlank}
      sortInMemory={(a: ErrorRow, b: ErrorRow) => {
        const aKey = a.is_fixed ? 1 : 0;
        const bKey = b.is_fixed ? 1 : 0;
        if (aKey !== bKey) return aKey - bKey;
        const ta = a.reported_at ?? a.created_at ?? '';
        const tb = b.reported_at ?? b.created_at ?? '';
        if (ta && tb) return tb.localeCompare(ta);
        return (b.id ?? 0) - (a.id ?? 0);
      }}
    />
  );
}

export default ErrorRepeaterMount;