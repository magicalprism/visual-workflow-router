import React from 'react';
import useFormValidation from '../../../../hooks/useFormValidation';

type GeneralTabProps = {
  nodeData?: Record<string, any>;
  onChange?: (patch: Partial<Record<string, any>>) => void;
};

const GeneralTab: React.FC<GeneralTabProps> = ({ nodeData = {}, onChange = () => {} }) => {
  // match hook signature: initial values + validator function
  const { fields, handleChange, validateFields } = useFormValidation(
    nodeData as Record<string, string>,
    (_values: Record<string, string>) => ({} as Record<string, string | null>)
  );

  const handleFieldChange =
    (field: string) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value = event.target.value;
      handleChange(field, value);
      onChange({ ...fields, [field]: value });
    };

  const valueOrDefault = (key: string) => fields[key] ?? nodeData[key] ?? '';

  return (
    // removed top spacing so content sits flush under modal title
    <div className="w-full">
      <div className="grid grid-cols-1 gap-4 w-full">
        {/* Title is shown in the modal header — removed from tab */}

        <div>
          <label htmlFor="node_type" className="text-sm block mb-1">Node Type</label>
          <select
            id="node_type"
            name="node_type"
            value={valueOrDefault('node_type')}
            onChange={handleFieldChange('node_type')}
            onBlur={() => validateFields()}
            className="w-full border rounded px-2 py-1"
            required
          >
            <option value="">Select Node Type</option>
            <option value="action">Action</option>
            <option value="decision">Decision</option>
            <option value="human">Human Checkpoint</option>
            <option value="exception">Exception</option>
            <option value="terminal">Terminal</option>
          </select>
        </div>

        <div>
          <label htmlFor="phase" className="text-sm block mb-1">Phase</label>
          <select
            id="phase"
            name="phase"
            value={valueOrDefault('phase')}
            onChange={handleFieldChange('phase')}
            onBlur={() => validateFields()}
            className="w-full border rounded px-2 py-1"
            required
          >
            <option value="">Select Phase</option>
            <option value="planning">Planning</option>
            <option value="execution">Execution</option>
            <option value="review">Review</option>
          </select>
        </div>

        <div>
          <label htmlFor="owner" className="text-sm block mb-1">Owner</label>
          <input
            id="owner"
            name="owner"
            value={valueOrDefault('owner')}
            onChange={handleFieldChange('owner')}
            onBlur={() => validateFields()}
            className="w-full border rounded px-2 py-1"
            required
          />
        </div>

        <div>
          <label htmlFor="criticality" className="text-sm block mb-1">Criticality</label>
          <select
            id="criticality"
            name="criticality"
            value={valueOrDefault('criticality')}
            onChange={handleFieldChange('criticality')}
            onBlur={() => validateFields()}
            className="w-full border rounded px-2 py-1"
            required
          >
            <option value="">Select Criticality</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <div>
          <label htmlFor="description" className="text-sm block mb-1">Description</label>
          <textarea
            id="description"
            name="description"
            value={valueOrDefault('description')}
            onChange={handleFieldChange('description')}
            onBlur={() => validateFields()}
            className="w-full border rounded px-2 py-1 min-h-[100px]"
            rows={4}
          />
        </div>
      </div>
    </div>
  );
};

export default GeneralTab;