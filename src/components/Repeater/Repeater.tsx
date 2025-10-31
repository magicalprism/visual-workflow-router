'use client';

import React from 'react';
import type { FieldConfig } from './fieldTypes';

export type RepeaterProps<Row, Scope> = {
  title?: string;
  scope: Scope;
  store: any;
  fields: FieldConfig<Row>[];
  makeBlank: (scope: Scope) => Row;
  sortInMemory?: (a: Row, b: Row) => number;
  className?: string;
};

export default function Repeater<Row, Scope>(_props: RepeaterProps<Row, Scope>) {
  // Minimal placeholder to satisfy imports; replace with full implementation as needed.
  return <div style={{ padding: 8 }}>Repeater placeholder</div>;
}