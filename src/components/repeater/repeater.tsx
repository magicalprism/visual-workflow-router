'use client';

import React, { useEffect, useState } from 'react';
import type { FieldConfig, FieldType, TabDef } from './fieldTypes';

export type RepeaterProps<Row, Scope> = {
  title?: string;
  scope: Scope;
  store: any;
  fields: FieldConfig<Row>[];
  tabs?: TabDef<Row>[];
  makeBlank: (scope: Scope) => Row;
  sortInMemory?: (a: Row, b: Row) => number;
  className?: string;
  hideFieldLabels?: boolean;
  showTitle?: boolean;
};

export function Repeater<Row extends Record<string, any>, Scope>({
  title,
  scope,
  store,
  fields,
  makeBlank,
  sortInMemory,
  className,
  hideFieldLabels = false,
  showTitle = true,
}: RepeaterProps<Row, Scope>) {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      console.log('Repeater.load scope=', JSON.stringify(scope));
      const data = (await store.list(scope)) as Row[] | undefined;
      console.log('Repeater.load result count=', Array.isArray(data) ? data.length : typeof data, data);
      const arr = data ?? [];
      if (sortInMemory && Array.isArray(arr)) arr.sort(sortInMemory as any);
      setItems(arr);
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

  async function handleAdd() {
    const blank = makeBlank(scope as any);
    try {
      console.log('Repeater.handleAdd -> blank', blank, 'store.hasCreate=', typeof (store as any)?.create);
      if (!store || typeof (store as any).create !== 'function') {
        console.error('Repeater.handleAdd: store.create is not a function', store);
        return;
      }
      const created = await (store as any).create(blank);
      console.log('Repeater.create result', created);
      await load();
    } catch (err: any) {
      console.error('Repeater.create error', err);
      // show simple feedback so user sees a failure
      try { alert('Add failed: ' + (err?.message ?? String(err))); } catch {}
    }
  }

  async function handleDelete(id: any) {
    try {
      await store.delete(id);
      await load();
    } catch (err) {
      console.error('Repeater.delete error', err);
    }
  }

  async function handleFieldChange(id: any, key: string, value: any) {
    try {
      await store.update(id, { [key]: value });
      // update local copy for UX
      setItems((prev) => prev.map(it => ((it as any).id === id ? { ...(it as any), [key]: value } : it)));
    } catch (err) {
      console.error('Repeater.update error', err);
      // fallback: reload
      await load();
    }
  }

  return (
    <div className={className ?? ''}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        {showTitle ? <strong>{title ?? 'Items'}</strong> : null}
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={handleAdd} className="p-1" aria-label="Add">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 512 512" aria-hidden>
              <path fill="currentColor" d="M277.119 65.93v168.951h168.952v42.238H277.119v168.952h-42.238V277.119H65.93v-42.238h168.951V65.93z" />
            </svg>
          </button>
          <button type="button" onClick={load} className="p-1" aria-label="Refresh">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 21 21" fill="none" aria-hidden>
              <g stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6.5 3.5c-2.412 1.378-4 4.024-4 7a8 8 0 0 0 8 8m4-1c2.287-1.408 4-4.118 4-7a8 8 0 0 0-8-8"/>
                <path d="M6.5 7.5v-4h-4m12 10v4h4"/>
              </g>
            </svg>
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
                <div className="flex items-start gap-4">
                  <div className="w-full space-y-2">
                    {fields.map(f => {
                      const keyStr = String(f.key);
                      const val = (item as any)[keyStr];
                      const ftype = (f.type ?? 'text') as FieldType;

                      if (ftype === 'textarea') {
                        return (
                          <div key={keyStr} className="w-full">
                            {!hideFieldLabels && <label className="text-xs text-gray-600 block mb-1">{f.label}</label>}
                            <textarea
                              defaultValue={val ?? ''}
                              onBlur={e => handleFieldChange((item as any).id, keyStr, e.currentTarget.value)}
                              rows={f.rows ?? 2}
                              className="w-full border rounded px-1 py-1"
                            />
                          </div>
                        );
                      }

                      if (ftype === 'checkbox' || ftype === 'toggle') {
                        return (
                          <div key={keyStr} className="w-full flex items-center justify-between">
                            {!hideFieldLabels && <label className="text-sm text-gray-700">{f.label}</label>}

                            {ftype === 'toggle' ? (
                              <button
                                type="button"
                                role="switch"
                                aria-checked={Boolean(val)}
                                onClick={() => handleFieldChange((item as any).id, keyStr, !Boolean(val))}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${val ? 'bg-blue-600' : 'bg-gray-300'}`}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform bg-white rounded-full transition-transform ${val ? 'translate-x-6' : 'translate-x-1'}`}
                                />
                              </button>
                            ) : (
                              <input
                                type="checkbox"
                                checked={Boolean(val)}
                                onChange={e => handleFieldChange((item as any).id, keyStr, e.currentTarget.checked)}
                                className="ml-2"
                              />
                            )}
                          </div>
                        );
                      }

                      // default: text / number / select etc.
                      return (
                        <div key={keyStr} className="w-full">
                          {!hideFieldLabels && <label className="text-xs text-gray-600 block mb-1">{f.label}</label>}
                          <input
                            defaultValue={val ?? ''}
                            onBlur={e =>
                              handleFieldChange(
                                (item as any).id,
                                keyStr,
                                ftype === 'number' ? Number((e.target as HTMLInputElement).value) : (e.target as HTMLInputElement).value
                              )
                            }
                            placeholder={f.placeholder}
                            className="w-full border rounded px-1 py-1"
                          />
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-start">
                    <button type="button" onClick={() => handleDelete((item as any).id)} className="p-1 text-gray-500" aria-label="Delete">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 256 256" aria-hidden>
                        <path fill="currentColor" d="M216 48h-40v-8a24 24 0 0 0-24-24h-48a24 24 0 0 0-24 24v8H40a8 8 0 0 0 0 16h8v144a16 16 0 0 0 16 16h128a16 16 0 0 0 16-16V64h8a8 8 0 0 0 0-16ZM96 40a8 8 0 0 1 8-8h48a8 8 0 0 1 8 8v8H96Zm96 168H64V64h128Zm-80-104v64a8 8 0 0 1-16 0v-64a8 8 0 0 1 16 0Zm48 0v64a8 8 0 0 1-16 0v-64a8 8 0 0 1 16 0Z"/>
                      </svg>
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