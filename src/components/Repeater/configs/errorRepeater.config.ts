'use client';

import React from 'react';
import { Repeater } from '../index';
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
    <Repeater<ErrorRow, ErrorScope>
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

<form onSubmit={handleSubmit} className="space-y-4">
  <div>
    <label htmlFor="outputs" className="text-sm block mb-1">Outputs</label>
    <textarea
      id="outputs"
      name="outputs"
      value={inputs.outputs}
      onChange={handleChange}
      placeholder="Define the outputs for this node..."
      aria-invalid={!!errors.outputs}
      className="w-full border rounded px-2 py-1"
    />
    {errors.outputs && <span className="text-red-600">{errors.outputs}</span>}
  </div>

  <div>
    <label htmlFor="rules" className="text-sm block mb-1">Rules</label>
    <textarea
      id="rules"
      name="rules"
      value={inputs.rules}
      onChange={handleChange}
      placeholder="Specify the rules for this node..."
      aria-invalid={!!errors.rules}
      className="w-full border rounded px-2 py-1"
    />
    {errors.rules && <span className="text-red-600">{errors.rules}</span>}
  </div>

  <div>
    <label htmlFor="edgeCases" className="text-sm block mb-1">Edge Cases</label>
    <textarea
      id="edgeCases"
      name="edgeCases"
      value={inputs.edgeCases}
      onChange={handleChange}
      placeholder="Describe any edge cases..."
      aria-invalid={!!errors.edgeCases}
      className="w-full border rounded px-2 py-1"
    />
    {errors.edgeCases && <span className="text-red-600">{errors.edgeCases}</span>}
  </div>

  <div>
    <label className="text-sm block mb-2">Errors</label>
    {workflowId && nodeId ? (
      <ErrorRepeaterMount workflowId={workflowId} nodeId={nodeId} />
    ) : (
      <div className="text-xs text-gray-500">Errors will appear here when a workflow and node are selected.</div>
    )}
  </div>

  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
    Save Rules
  </button>
</form>