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

const NodeModal: React.FC<NodeModalProps> = ({ nodeData, isOpen, onClose, onChange, onDelete }) => {
  // normalize incoming nodeData: accept either the DB row shape or a ReactFlow node ({ data: { nodeData } })
  const normalizeNodeData = (nd: any) => {
    if (!nd) return {};
    if (nd?.data?.nodeData) return nd.data.nodeData;
    return nd;
  };

  const [form, setForm] = React.useState<any>(() => normalizeNodeData(nodeData));

  React.useEffect(() => setForm(normalizeNodeData(nodeData)), [nodeData]);

  // tab state and info modal state
  const [activeTab, setActiveTab] = useState<string>('general');
  const handleTabChange = (key: string) => setActiveTab(key);
  const [isInfoOpen, setIsInfoOpen] = useState<boolean>(false);

  const onSave = () => {
    if (onChange) onChange(form);
    onClose();
  };

  const handleGoldenToggle = (checked: boolean) => {
    const next = { ...(form || {}), details: { ...(form?.details || {}), goldenPath: checked } };
    setForm(next);
    if (onChange) onChange(next);
  };

  // kind/type selector: update form.type and notify parent immediately
  const handleKindChange = (kind: string) => {
    const next = { ...(form || {}), type: kind };
    setForm(next);
    if (onChange) onChange(next);
  };

  if (!isOpen) return null;

  // compact tab list moved into NodeModalTabs (remove duplicated nav here)
  const tabs = [
    { key: 'general', label: 'Overview' },
    { key: 'logic', label: 'Logic' },
    { key: 'runbook', label: 'Runbook' },
    { key: 'advanced', label: 'Advanced' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <span className="text-base font-medium">Details</span>
            <button
              onClick={() => setIsInfoOpen(true)}
              aria-label="Node info"
              className="ml-1 text-xs w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200"
              title="More info"
              type="button"
            >
              i
            </button>
          </div>
          {/* keep header compact; right side empty so content area can render Title + inline number */}
          <div />
        </div>
      }
    >
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
          onTabChange={handleTabChange}
          nodeData={form}
          onChange={(patch) => setForm((prev: any) => ({ ...prev, ...(patch || {}) }))}
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
    </Modal>
  );
};

export default NodeModal;