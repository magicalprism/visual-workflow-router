'use client';

import React, { useState } from 'react';
import { ErrorRepeaterMount } from '../../../../components/repeater/configs/errorRepeater.config';

interface RulesTabProps {
  workflowId?: number | null;
  nodeId?: number | null;
}

const RulesTab: React.FC<RulesTabProps> = ({ workflowId, nodeId }) => {
  const [inputs, setInputs] = useState({
    inputs: '',
    outputs: '',
    rules: '',
    edgeCases: '',
  });

  const validate = () => true;
  const errors: Record<string, string | undefined> = {};

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setInputs((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      // persist rules meta as needed
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="inputs" className="text-sm block mb-1">Inputs</label>
        <textarea
          id="inputs"
          name="inputs"
          value={inputs.inputs}
          onChange={handleChange}
          placeholder="Define the inputs for this node..."
          aria-invalid={!!errors.inputs}
          className="w-full border rounded px-2 py-1"
        />
        {errors.inputs && <span className="text-red-600">{errors.inputs}</span>}
      </div>

      <div>
        <label htmlFor="outputs" className="text-sm block mb-1">Outputs</label>
        <textarea
          id="outputs"
          name="outputs"
          value={inputs.outputs}
          onChange={handleChange}
          placeholder="Define the outputs for this node..."
          aria-invalid={!!errors.outputs}
          className="w-full border rounded px-2 py-1"
        />
        {errors.outputs && <span className="text-red-600">{errors.outputs}</span>}
      </div>

      <div>
        <label htmlFor="rules" className="text-sm block mb-1">Rules</label>
        <textarea
          id="rules"
          name="rules"
          value={inputs.rules}
          onChange={handleChange}
          placeholder="Specify the rules for this node..."
          aria-invalid={!!errors.rules}
          className="w-full border rounded px-2 py-1"
        />
        {errors.rules && <span className="text-red-600">{errors.rules}</span>}
      </div>

      <div>
        <label htmlFor="edgeCases" className="text-sm block mb-1">Edge Cases</label>
        <textarea
          id="edgeCases"
          name="edgeCases"
          value={inputs.edgeCases}
          onChange={handleChange}
          placeholder="Describe any edge cases..."
          aria-invalid={!!errors.edgeCases}
          className="w-full border rounded px-2 py-1"
        />
        {errors.edgeCases && <span className="text-red-600">{errors.edgeCases}</span>}
      </div>

      <div>
        <label className="text-sm block mb-2">Errors</label>
        {workflowId && nodeId ? (
          <>
            {console.log('RulesTab -> rendering ErrorRepeaterMount', { workflowId, nodeId })}
            <ErrorRepeaterMount workflowId={workflowId} nodeId={nodeId} />
          </>
        ) : (
          <div className="text-xs text-gray-500">Errors will appear here when a workflow and node are selected.</div>
        )}
      </div>

      <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
        Save Rules
      </button>
    </form>
  );
};

export default RulesTab;