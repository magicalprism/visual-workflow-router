'use client';

import React from 'react';

// Add ListStore type here so stores (like makeSupabaseStore) can import it.
export type ListStore<T, Scope> = {
    list: (scope: Scope) => Promise<T[]>;
    insert: (scope: Scope, row: T) => Promise<T>;
    update: (scope: Scope, id: number | string, patch: Partial<T>) => Promise<T>;
    remove: (scope: Scope, id: number | string) => Promise<void>;
};

export type RepeaterProps<Row, Scope> = {
  title?: string;
  scope: Scope;
  store: any;
  fields: any[];
  makeBlank: (scope: Scope) => Row;
  sortInMemory?: (a: Row, b: Row) => number;
  className?: string;
};

export function Repeater<Row, Scope>(_props: RepeaterProps<Row, Scope>) {
  // Minimal placeholder to satisfy imports; replace with full implementation as needed.
  return <div style={{ padding: 8 }}>Repeater placeholder</div>;
}

export default Repeater;