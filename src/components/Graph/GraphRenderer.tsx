import React from 'react';

export interface GraphRendererProps {
  nodes?: any[];
  edges?: any[];
}

export default function GraphRenderer({ nodes = [], edges = [] }: GraphRendererProps) {
  return (
    <div style={{ padding: 12 }}>
      <div style={{ marginBottom: 8, fontWeight: 600 }}>Graph Renderer</div>
      <div
        style={{
          width: '100%',
          height: 420,
          border: '2px dashed #cbd5e1',
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#475569'
        }}
      >
        <div>
          <div style={{ textAlign: 'center', marginBottom: 6 }}>Graph renderer placeholder</div>
          <div style={{ fontSize: 12, textAlign: 'center', opacity: 0.8 }}>
            nodes: {nodes.length} • edges: {edges.length}
          </div>
        </div>
      </div>
    </div>
  );
}