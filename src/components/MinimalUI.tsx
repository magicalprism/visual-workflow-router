import React from 'react';

const MinimalUI: React.FC = () => {
  return (
    <div className="minimal-ui">
      <h1>Minimal Workflow UI</h1>
      <button onClick={() => alert('Add Node')}>Add Node</button>
      <button onClick={() => alert('Connect Nodes')}>Connect Nodes</button>
      <button onClick={() => alert('Save Workflow')}>Save Workflow</button>
    </div>
  );
};

export default MinimalUI;