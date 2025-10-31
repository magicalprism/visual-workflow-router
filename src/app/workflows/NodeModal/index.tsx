'use client';

import { useEffect, useState } from 'react';
import Modal from '@/components/Modal';
import NodeModalTabs from './NodeModalTabs';
import InfoModal from './InfoModal';
import React from 'react';

interface NodeModalProps {
  nodeData: any;
  isOpen: boolean;
  onClose: () => void;
  onChange?: (patch: Partial<any>) => void;
  onDelete?: () => void;
}

export default function NodeModal({ isOpen, onClose, nodeData, onChange, onDelete }: NodeModalProps) {
  // debug: confirm props arriving when modal opens
  console.log('NodeModal -> props (raw)', { isOpen, nodeData });

  // normalize incoming node shape: support React Flow node wrapper { id, data: { nodeData } } and raw DB node
  const normalize = (nd: any) => {
    if (!nd) return {};
    // RF wrapper: node.data.nodeData
    if (nd?.data?.nodeData) {
      return { ...(nd.data.nodeData ?? {}), id: nd.id ?? nd.data.nodeData.id };
    }
    return { ...(nd ?? {}) };
  };

  // local form state (initialize from normalized nodeData) and UI state used in this modal
  const [form, setForm] = useState<any>(normalize(nodeData));
  useEffect(() => {
    const norm = normalize(nodeData);
    console.log('NodeModal -> normalized form', norm);
    setForm(norm);
  }, [nodeData]);

  // tab + info modal state
  const [activeTab, setActiveTab] = useState<string>('general');
  const [isInfoOpen, setIsInfoOpen] = useState<boolean>(false);

  // helpers used by the UI controls below
  const handleGoldenToggle = (value: boolean) => {
    setForm((prev: any) => ({ ...prev, details: { ...(prev?.details ?? {}), goldenPath: value } }));
  };

  const handleKindChange = (kind: string) => {
    setForm((prev: any) => ({ ...prev, type: kind }));
  };

  const onSave = () => {
    if (onChange) onChange(form);
    if (onClose) onClose();
  };

  const workflowId = form?.workflow_id ? Number(form.workflow_id) : undefined;
  const nodeId = form?.id ? Number(form.id) : undefined;

  // pass numeric ids into tabs and pass controlled form+onChange so tab content updates live
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={form?.title ?? `Node ${form?.id ?? ''}`}>
      {/* wrap content in a keyed container so it remounts when node changes */}
      <div key={String(form?.id ?? 'no-node')}>
        {/* Title row (single header above) - reduced padding so tabs/content sit flush */}
        <div className="px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <label htmlFor="node-title" className="block text-sm font-medium text-gray-600">Title</label>
                {/* small right-aligned number (step id) */}
                <span className="text-xs text-gray-500">{form?.id ?? form?.row_id ?? form?.uuid ?? '(auto)'}</span>
              </div>
              <input
                id="node-title"
                type="text"
                value={form?.title ?? ''}
                onChange={(e) => setForm((prev: any) => ({ ...prev, title: e.target.value }))}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Node title..."
              />
            </div>
          </div>
        </div>

        {/* tab content — full width so content is flush under title (no extra gap/line) */}
        <div className="w-full -mt-2">
          <NodeModalTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            nodeData={form}
            onChange={(patch: Partial<any>) => setForm((prev: any) => ({ ...prev, ...patch }))}
          />
        </div>

        <div className="mt-4">
          <label className="flex items-center gap-3">
            <span className="text-sm">Goldenpath</span>
            <button
              type="button"
              role="switch"
              aria-checked={!!(form?.details && form.details.goldenPath)}
              onClick={() => handleGoldenToggle(!(form?.details && form.details.goldenPath))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                form?.details && form.details.goldenPath ? 'bg-yellow-400' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  form?.details && form.details.goldenPath ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <p className="text-xs text-gray-500 ml-2">Mark this node as part of the Goldenpath (ideal flow).</p>
          </label>
        </div>

        {/* Kind / node type selector (colored) */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-600 mb-2">Kind</label>
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'action', label: 'Action', color: '#2563eb' },
              { key: 'decision', label: 'Decision', color: '#d97706' },
              { key: 'human', label: 'Human', color: '#7c3aed' },
              { key: 'exception', label: 'Exception', color: '#ef4444' },
              { key: 'terminal', label: 'Terminal', color: '#10b981' },
            ].map((opt) => {
              const active = (form?.type ?? 'action') === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => handleKindChange(opt.key)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm ${active ? 'ring-2 ring-offset-1' : 'border'} `}
                  style={{
                    borderColor: active ? opt.color : undefined,
                    background: active ? `${opt.color}10` : undefined,
                  }}
                >
                  <span style={{ width: 12, height: 12, background: opt.color, borderRadius: 3, display: 'inline-block' }} />
                  <span className="capitalize">{opt.label}</span>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-gray-500 mt-2">Select node kind — the canvas shows a colored accent to match the toolbar.</p>
        </div>

        {/* existing actions area — wire save/cancel*/}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-1.5 border rounded">Cancel</button>
          <button type="button" onClick={onSave} className="px-3 py-1.5 bg-blue-600 text-white rounded">Save</button>
        </div>

        <InfoModal isOpen={isInfoOpen} onClose={() => setIsInfoOpen(false)} />
      </div>
    </Modal>
  );
}