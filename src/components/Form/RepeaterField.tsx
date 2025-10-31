'use client';

import React from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
);

/* ---------- store factory ---------- */

export interface ListStore<T, Scope> {
  list(scope: Scope): Promise<T[]>;
  insert(scope: Scope, row: T): Promise<T>;
  update(scope: Scope, id: number, patch: Partial<T>): Promise<T>;
  remove(scope: Scope, id: number): Promise<void>;
}

export function makeSupabaseStore<T, Scope>(opts: {
  table: string;
  select: string;
  scopeToFilters: (scope: Scope) => Array<{ col: string; value: string | number | boolean }>;
  sort?: (q: any) => any;
}): ListStore<T, Scope> {
  const { table, select, scopeToFilters, sort } = opts;
  return {
    async list(scope) {
      let q: any = supabase.from(table).select(select);
      for (const { col, value } of scopeToFilters(scope)) q = q.eq(col, value);
      if (sort) q = sort(q);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as T[];
    },
    async insert(scope, row) {
      const scopeCols = Object.fromEntries(scopeToFilters(scope).map(s => [s.col, s.value]));
      const { data, error } = await supabase
        .from(table)
        .insert({ ...(row as any), ...scopeCols })
        .select(select)
        .single();
      if (error) throw error;
      return data as T;
    },
    async update(_scope, id, patch) {
      const { data, error } = await supabase.from(table).update(patch as any).eq('id', id).select(select).single();
      if (error) throw error;
      return data as T;
    },
    async remove(_scope, id) {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
    }
  };
}

/* ---------- field types & Repeater (generic) ---------- */

export type FieldType = 'text' | 'textarea' | 'checkbox' | 'number' | 'select';
export type Option = { value: string | number; label: string };

export type FieldConfig<T> = {
  key: keyof T;
  label: string;
  type: FieldType;
  required?: boolean;
  disabled?: (row: T) => boolean;
  normalizeIn?: (v: any) => any;
  normalizeOut?: (v: any) => any;
  options?: Option[];
  placeholder?: string;
  rows?: number;
};

export type TabDef<T> = { label: string; filter: (row: T) => boolean; };

export type RepeaterProps<T extends { id?: number }, Scope> = {
  scope: Scope;
  store: ListStore<T, Scope>;
  fields: FieldConfig<T>[];
  makeBlank: (scope: Scope) => T;
  tabs?: TabDef<T>[];
  sortInMemory?: (a: T, b: T) => number;
  actions?: {
    add?: boolean;
    duplicate?: (row: T) => boolean | true;
    delete?: (row: T) => boolean | true;
    save?: (row: T) => boolean | true;
  };
  title?: string;
};

export function Repeater<T extends { id?: number }, Scope>({
  scope,
  store,
  fields,
  makeBlank,
  tabs,
  sortInMemory,
  actions,
  title
}: RepeaterProps<T, Scope>) {
  const [rows, setRows] = React.useState<T[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [tabIdx, setTabIdx] = React.useState(0);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await store.list(scope);
      setRows(sortInMemory ? [...data].sort(sortInMemory) : data);
    } finally {
      setLoading(false);
    }
  }, [scope, store, sortInMemory]);

  React.useEffect(() => { load(); }, [load]);

  const addRow = () => setRows(prev => [makeBlank(scope), ...prev]);

  const duplicateRow = (i: number) => {
    const { id, ...clone } = rows[i] as any;
    setRows(prev => [{ ...(clone as T) }, ...prev]);
  };

  const saveRow = async (i: number) => {
    const r = rows[i];
    for (const f of fields) {
      if (f.required) {
        const v = (r as any)[f.key];
        if (!String(v ?? '').trim()) return;
      }
    }
    const payload: any = {};
    fields.forEach(f => {
      const v = (r as any)[f.key];
      payload[f.key as string] = f.normalizeOut ? f.normalizeOut(v) : v;
    });
    try {
      const saved = r.id
        ? await store.update(scope, r.id!, payload)
        : await store.insert(scope, { ...(r as any), ...payload });
      setRows(prev => prev.map((row, idx) => (idx === i ? saved : row)));
    } catch (e) {
      console.error('Repeater save error', e);
    }
  };

  const deleteRow = async (i: number) => {
    const r = rows[i];
    if (r.id) await store.remove(scope, r.id!);
    setRows(prev => prev.filter((_, idx) => idx !== i));
  };

  const setField = (i: number, key: keyof T, value: any) => {
    setRows(prev => prev.map((row, idx) => {
      if (idx !== i) return row;
      const next: any = { ...row };
      next[key] = value;
      return next;
    }));
  };

  const currentRows = tabs ? rows.filter(tabs[tabIdx].filter) : rows;

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {title && <h4 style={{ margin: '8px 0' }}>{title}</h4>}

      {tabs && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {tabs.map((t, idx) => (
            <button key={t.label} onClick={() => setTabIdx(idx)} disabled={tabIdx === idx}>
              {t.label} ({rows.filter(t.filter).length})
            </button>
          ))}
          <div style={{ marginLeft: 'auto' }}>
            {(actions?.add ?? true) && <button onClick={addRow} disabled={loading}>Add</button>}
          </div>
        </div>
      )}

      {!tabs && (actions?.add ?? true) && (
        <div><button onClick={addRow} disabled={loading}>Add</button></div>
      )}

      <div style={{ display: 'grid', gap: 12 }}>
        {currentRows.map((r, i) => (
          <div key={r.id ?? `tmp-${i}`} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
            {fields.map(f => {
              const val = (r as any)[f.key] ?? '';
              const disabled = f.disabled?.(r) ?? false;

              if (f.type === 'textarea') {
                return (
                  <label key={String(f.key)} style={{ display: 'block', marginBottom: 8 }}>
                    {f.label}<br />
                    <textarea
                      rows={f.rows ?? 3}
                      placeholder={f.placeholder}
                      disabled={disabled}
                      value={val}
                      onChange={e => setField(i, f.key, e.target.value)}
                      style={{ width: '100%' }}
                    />
                  </label>
                );
              }
              if (f.type === 'checkbox') {
                return (
                  <label key={String(f.key)} style={{ display: 'block', marginBottom: 8 }}>
                    <input
                      type="checkbox"
                      checked={!!val}
                      onChange={e => setField(i, f.key, e.target.checked)}
                      disabled={disabled}
                    />{' '}
                    {f.label}
                  </label>
                );
              }
              if (f.type === 'number') {
                return (
                  <label key={String(f.key)} style={{ display: 'block', marginBottom: 8 }}>
                    {f.label}<br />
                    <input
                      type="number"
                      value={val}
                      onChange={e => setField(i, f.key, e.target.value ? Number(e.target.value) : '')}
                      disabled={disabled}
                      placeholder={f.placeholder}
                      style={{ width: '100%' }}
                    />
                  </label>
                );
              }
              if (f.type === 'select') {
                return (
                  <label key={String(f.key)} style={{ display: 'block', marginBottom: 8 }}>
                    {f.label}<br />
                    <select
                      value={val}
                      onChange={e => setField(i, f.key, e.target.value)}
                      disabled={disabled}
                      style={{ width: '100%' }}
                    >
                      <option value="">—</option>
                      {f.options?.map(o => <option key={String(o.value)} value={o.value}>{o.label}</option>)}
                    </select>
                  </label>
                );
              }
              // default text
              return (
                <label key={String(f.key)} style={{ display: 'block', marginBottom: 8 }}>
                  {f.label}<br />
                  <input
                    type="text"
                    value={val}
                    onChange={e => setField(i, f.key, e.target.value)}
                    disabled={disabled}
                    placeholder={f.placeholder}
                    style={{ width: '100%' }}
                  />
                </label>
              );
            })}

            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              {(actions?.save ?? true) && <button onClick={() => saveRow(i)}>Save</button>}
              {(actions?.duplicate ?? (() => true))(r) && <button onClick={() => duplicateRow(i)}>Duplicate</button>}
              {(actions?.delete ?? (() => true))(r) && <button onClick={() => deleteRow(i)}>Delete</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- error & problem mounts (configs) ---------- */

/* Error repeater (node-scoped) */
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
  created_at?: string;
  updated_at?: string;
};

type ErrorScope = { workflowId: number; nodeId: number };

const errorStore = makeSupabaseStore<ErrorRow, ErrorScope>({
  table: 'error',
  select: 'id,workflow_id,node_id,description,is_fixed,solution,solver_contact_id,reported_at,fixed_at,created_at,updated_at',
  scopeToFilters: (s) => [
    { col: 'workflow_id', value: s.workflowId },
    { col: 'node_id', value: s.nodeId }
  ],
  sort: (q) => q.order('is_fixed', { ascending: true }).order('reported_at', { ascending: false })
});

const errorFields: FieldConfig<ErrorRow>[] = [
  { key: 'description', label: 'Description', type: 'textarea', required: true, rows: 3, placeholder: 'What went wrong?' },
  { key: 'is_fixed', label: 'Fixed?', type: 'checkbox' },
  { key: 'solution', label: 'Solution', type: 'textarea', rows: 2, placeholder: 'How was it fixed?', disabled: (r) => !r.is_fixed },
  { key: 'solver_contact_id', label: 'Solver contact ID', type: 'number', placeholder: 'e.g. 123' }
];

const makeErrorBlank = (s: ErrorScope): ErrorRow => ({
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
       fields={errorFields}
       makeBlank={makeErrorBlank}
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

/* Problem repeater (workflow-scoped, tabs) */
export type ProblemRow = {
  id?: number;
  workflow_id: number;
  description: string;
  is_solved: boolean;
  solution?: string | null;
  owner_contact_id?: number | null;
  reported_at?: string | null;
  solved_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

type ProblemScope = { workflowId: number };

const problemStore = makeSupabaseStore<ProblemRow, ProblemScope>({
  table: 'problem',
  select: 'id,workflow_id,description,is_solved,solution,owner_contact_id,reported_at,solved_at,created_at,updated_at',
  scopeToFilters: (s) => [{ col: 'workflow_id', value: s.workflowId }],
  sort: (q) => q.order('is_solved', { ascending: true }).order('reported_at', { ascending: false })
});

const problemFields: FieldConfig<ProblemRow>[] = [
  { key: 'description', label: 'Description', type: 'textarea', required: true, rows: 3, placeholder: 'What is the systemic issue?' },
  { key: 'is_solved', label: 'Solved?', type: 'checkbox' },
  { key: 'solution', label: 'Solution', type: 'textarea', rows: 2, placeholder: 'How did we solve it?', disabled: (r) => !r.is_solved },
  { key: 'owner_contact_id', label: 'Owner contact ID', type: 'number', placeholder: 'e.g. 123' }
];

const tabs = [
  { label: 'Active', filter: (r: ProblemRow) => !r.is_solved },
  { label: 'Solved', filter: (r: ProblemRow) => !!r.is_solved }
];

const makeProblemBlank = (s: ProblemScope): ProblemRow => ({
  workflow_id: s.workflowId,
  description: '',
  is_solved: false,
  solution: '',
  owner_contact_id: null,
  reported_at: new Date().toISOString()
});

export function ProblemsRepeaterMount({ workflowId }: { workflowId: number }) {
  return (
    <Repeater
       title="Problems"
       scope={{ workflowId }}
       store={problemStore}
       fields={problemFields}
       makeBlank={makeProblemBlank}
       tabs={tabs}
       sortInMemory={(a, b) => Number(b.id ?? 0) - Number(a.id ?? 0)}
     />
  );
}