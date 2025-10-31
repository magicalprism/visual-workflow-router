'use client';

import React from 'react';
import { Repeater } from '../Repeater';
import type { FieldConfig, TabDef } from '../fieldTypes';
import { makeSupabaseStore } from '../stores/makeSupabaseStore';

export type ProblemRow = {
  id?: number;
  workflow_id: number;
  description: string;
  is_solved: boolean;
  solution?: string | null;
  owner_names?: string | null; // use DB column
  reported_at?: string | null;
  solved_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type ProblemScope = { workflowId: number };

const problemStore = makeSupabaseStore<ProblemRow, ProblemScope>({
  table: 'problem',
  select: 'id,workflow_id,description,is_solved,solution,owner_names,reported_at,solved_at,created_at,updated_at',
  scopeToFilters: (s) => [{ col: 'workflow_id', value: s.workflowId }],
  sort: (q) => q.order('is_solved', { ascending: true }).order('reported_at', { ascending: false }),
});

const fields: FieldConfig<ProblemRow>[] = [
  { key: 'is_solved', label: 'Solved?', type: 'toggle' },
  { key: 'description', label: 'Description', type: 'textarea', required: true, rows: 3, placeholder: 'What is the systemic issue?' },
  {
    key: 'solution',
    label: 'Solution',
    type: 'textarea',
    rows: 2,
    placeholder: 'How did we solve it?',
    disabled: (r) => !r?.is_solved,
  },
  { key: 'owner_names', label: 'Owner', type: 'text', placeholder: 'e.g. Jane Doe' }, // DB column
];

const tabs: TabDef<ProblemRow>[] = [
  { label: 'Active', filter: (r) => !r.is_solved },
  { label: 'Solved', filter: (r) => !!r.is_solved },
];

const makeBlank = (s: ProblemScope): ProblemRow => ({
  workflow_id: s.workflowId,
  description: '',
  is_solved: false,
  solution: '',
  owner_names: '',
  reported_at: new Date().toISOString(),
});

export function ProblemsRepeaterMount({ workflowId }: { workflowId: number }) {
  return (
    <Repeater
      title="Problems"
      showTitle={false}
      store={problemStore}
      scope={{ workflowId: workflowId }}
      fields={fields}
      makeBlank={makeBlank}
      tabs={tabs}
      sortInMemory={(a, b) => Number(b.id ?? 0) - Number(a.id ?? 0)}
    />
  );
}

export default ProblemsRepeaterMount;