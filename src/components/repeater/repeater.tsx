'use client';

import React, { useEffect, useState } from 'react';
import type { FieldConfig, TabDef } from './fieldTypes';

export type ListStore<T, Scope> = {
    list: (scope: Scope) => Promise<T[]>;
    insert: (scope: Scope, row: T) => Promise<T>;
    update: (scope: Scope, id: number | string, patch: Partial<T>) => Promise<T>;
    remove: (scope: Scope, id: number | string) => Promise<void>;
};

export type RepeaterProps<Row, Scope> = {
  title?: string;
  scope: Scope;
  store: ListStore<Row, Scope> | any;
  fields: FieldConfig<Row>[];
  tabs?: TabDef<Row>[];
  makeBlank: (scope: Scope) => Row;
  sortInMemory?: (a: Row, b: Row) => number;
  className?: string;
};

export function Repeater<Row extends Record<string, any>, Scope>({
  title,
  scope,
  store,
  fields,
  makeBlank,
  sortInMemory,
  className
}: RepeaterProps<Row, Scope>) {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      console.log('Repeater.load scope=', scope);
      const data = (await store.list(scope)) as Row[];
      console.log('Repeater.load result count=', Array.isArray(data) ? data.length : typeof data, data);
      if (sortInMemory && Array.isArray(data)) data.sort(sortInMemory as any);
      setItems(data ?? []);
    } catch (err) {
      console.error('Repeater.load error', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(scope)]);

  const handleAdd = async () => {
    const blank = makeBlank(scope);
    const inserted = await store.insert(scope, blank);
    setItems(prev => [inserted, ...prev]);
  };

  const handleDelete = async (id: number | string) => {
    await store.remove(scope, id);
    setItems(prev => prev.filter(r => (r as any).id !== id));
  };

  const handleFieldChange = async (id: number | string, key: string, value: any) => {
    const patch = { [key]: value } as Partial<Row>;
    try {
      const updated = await store.update(scope, id, patch);
      setItems(prev => prev.map(r => ((r as any).id === id ? updated : r)));
    } catch (err) {
      console.error('Repeater.update error', err);
      await load();
    }
  };

  return (
    <div className={className ?? ''}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <strong>{title ?? 'Items'}</strong>
        <div>
          <button type="button" onClick={handleAdd} className="px-2 py-1 bg-green-600 text-white rounded">
            Add
          </button>
          <button type="button" onClick={load} className="ml-2 px-2 py-1 bg-gray-200 rounded">
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">Loading…</div>
      ) : items.length === 0 ? (
        <div className="text-xs text-gray-500">No items</div>
      ) : (
        <ul className="space-y-2">
          {items.map(item => {
            const id = (item as any).id ?? Math.random();
            return (
              <li key={id} className="border rounded p-2">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    {fields.map(f => {
                      const val = (item as any)[f.key as string];
                      const keyStr = f.key as string;
                      if (f.type === 'textarea') {
                        return (
                          <div key={keyStr}>
                            <label className="text-xs text-gray-600">{f.label}</label>
                            <textarea
                              defaultValue={val ?? ''}
                              onBlur={e => handleFieldChange((item as any).id, keyStr, e.target.value)}
                              rows={f.rows ?? 2}
                              className="w-full border rounded px-1 py-1"
                            />
                          </div>
                        );
                      }
                      if (f.type === 'checkbox') {
                        return (
                          <div key={keyStr} className="flex items-center">
                            <label className="text-xs mr-2">{f.label}</label>
                            <input
                              type="checkbox"
                              defaultChecked={Boolean(val)}
                              onChange={e => handleFieldChange((item as any).id, keyStr, e.target.checked)}
                            />
                          </div>
                        );
                      }
                      return (
                        <div key={keyStr}>
                          <label className="text-xs text-gray-600">{f.label}</label>
                          <input
                            defaultValue={val ?? ''}
                            onBlur={e => handleFieldChange((item as any).id, keyStr, f.type === 'number' ? Number(e.target.value) : e.target.value)}
                            placeholder={f.placeholder}
                            className="w-full border rounded px-1 py-1"
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="ml-4">
                    <button type="button" onClick={() => handleDelete((item as any).id)} className="px-2 py-1 bg-red-600 text-white rounded">
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default Repeater;