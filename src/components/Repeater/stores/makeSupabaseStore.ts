// FILE: src/components/repeater/stores/makeSupabaseStore.ts
'use client';

import { createClient } from '@supabase/supabase-js';
import type { ListStore } from '../Repeater';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
);

/**
 * Generic Supabase-backed store factory.
 * - table: table name
 * - select: column list string ("id, col1, col2")
 * - scopeToFilters: (scope) => array of { col, value }
 * - sort: (query builder) => query builder (attach .order's)
 */
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
      const { data, error } = await supabase
        .from(table)
        .update(patch as any)
        .eq('id', id)
        .select(select)
        .single();
      if (error) throw error;
      return data as T;
    },

    async remove(_scope, id) {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
    }
  };
}