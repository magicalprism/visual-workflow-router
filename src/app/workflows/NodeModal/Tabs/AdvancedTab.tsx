import React from 'react';
import useFormValidation from '../../../../hooks/useFormValidation';
import Input from '../../../../components/Form/Input';

type AdvancedTabProps = {
  nodeData?: Record<string, any>;
  onChange?: (patch: Partial<Record<string, any>>) => void;
};

const AdvancedTab: React.FC<AdvancedTabProps> = ({ nodeData = {}, onChange = () => {} }) => {
  // pass initial values + a validator function per hook signature
  const { fields, handleChange, validateFields } = useFormValidation(
    nodeData as Record<string, string>,
    (values: Record<string, string>) => ({} as Record<string, string | null>)
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    // update local form helper and bubble up
    handleChange(name, value);
    onChange({ ...nodeData, [name]: value });
  };

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-4">Advanced Settings</h2>

      <div className="mb-4">
        <label htmlFor="target_duration_ms" className="text-sm block mb-1">Target Duration (ms)</label>
        <Input
          id="target_duration_ms"
          name="target_duration_ms"
          label="Target Duration (ms)"
          type="number"
          value={fields.target_duration_ms ?? nodeData.target_duration_ms ?? ''}
          onChange={handleInputChange}
          onBlur={() => validateFields()}
          aria-describedby="target_duration_ms_error"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="target_success_rate" className="text-sm block mb-1">Target Success Rate (%)</label>
        <Input
          id="target_success_rate"
          name="target_success_rate"
          label="Target Success Rate (%)"
          type="number"
          value={fields.target_success_rate ?? nodeData.target_success_rate ?? ''}
          onChange={handleInputChange}
          onBlur={() => validateFields()}
          aria-describedby="target_success_rate_error"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="actuals" className="text-sm block mb-1">Actuals (Read-Only)</label>
        <textarea
          id="actuals"
          name="actuals"
          value={fields.actuals ?? nodeData.actuals ?? ''}
          readOnly
          className="w-full border rounded px-2 py-1 bg-gray-100 min-h-[120px]"
        />
      </div>
    </div>
  );
};

export default AdvancedTab;