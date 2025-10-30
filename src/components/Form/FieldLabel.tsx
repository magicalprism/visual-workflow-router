import React from 'react';

interface FieldLabelProps {
  label: string;
  htmlFor: string;
  required?: boolean;
}

const FieldLabel: React.FC<FieldLabelProps> = ({ label, htmlFor, required }) => {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700">
      {label}
      {required && <span className="text-red-500">*</span>}
    </label>
  );
};

export default FieldLabel;