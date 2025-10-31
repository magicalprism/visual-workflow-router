// FILE: src/components/repeater/stores/makeSupabaseStore.ts
'use client';

import { supabase } from '../../../lib/supabase'; // adjust path if your supabase client lives elsewhere

export type ScopeFilter = { col: string; value: unknown };

export type ListStore<T, S> = {
  list(scope: S): Promise<T[]>;
  create(row: Partial<T>): Promise<T | null>;
  update(id: unknown, patch: Partial<T>): Promise<T | null>;
  delete(id: unknown): Promise<void>;
};

export function makeSupabaseStore<T extends Record<string, any>, S = any>(opts: {
  table: string;
  select?: string;
  scopeToFilters?: (s: S) => ScopeFilter[];
  sort?: (q: any) => any;
}): ListStore<T, S> {
  const { table, select = '*', scopeToFilters, sort } = opts;

  async function list(scope: S): Promise<T[]> {
    console.log('makeSupabaseStore.list called', { table, select, scope });
    let q: any = supabase.from(table).select(select);
    const filters = scopeToFilters ? scopeToFilters(scope) : [];
    for (const { col, value } of filters) {
      console.log('  applying filter', col, value);
      q = q.eq(col, value as any);
    }
    if (sort) q = sort(q);
    console.log('  executing query for table', table);
    const { data, error } = await q;
    if (error) {
      console.error('makeSupabaseStore.list error', table, error);
      throw error;
    }
    console.log('makeSupabaseStore.list result', table, Array.isArray(data) ? data.length : data);
    return (data ?? []) as T[];
  }

  async function create(row: Partial<T>): Promise<T | null> {
    console.log('makeSupabaseStore.create', { table, row });
    const { data, error } = await supabase.from(table).insert(row).select().single();
    console.log('makeSupabaseStore.create result', { table, data, error });
    if (error) {
      console.error('makeSupabaseStore.create error', table, error);
      throw error;
    }
    return (data as T) ?? null;
  }

  async function update(id: unknown, patch: Partial<T>): Promise<T | null> {
    const { data, error } = await supabase.from(table).update(patch).eq('id', id).select().single();
    if (error) {
      console.error('makeSupabaseStore.update error', table, error);
      throw error;
    }
    return (data as T) ?? null;
  }

  async function remove(id: unknown): Promise<void> {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) {
      console.error('makeSupabaseStore.delete error', table, error);
      throw error;
    }
  }

  return {
    list,
    create,
    update,
    delete: remove,
  };
}