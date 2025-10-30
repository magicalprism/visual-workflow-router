import { useState } from 'react';

interface FormField {
  value: string;
  error: string | null;
}

const useFormValidation = (initialValues: Record<string, string>, validate: (values: Record<string, string>) => Record<string, string | null>) => {
  const [fields, setFields] = useState<Record<string, FormField>(
    Object.fromEntries(Object.entries(initialValues).map(([key, value]) => [key, { value, error: null }]))
  ));

  const validateFields = () => {
    const errors = validate(fields);
    setFields((prevFields) => {
      const updatedFields = { ...prevFields };
      for (const key in errors) {
        if (errors[key]) {
          updatedFields[key].error = errors[key];
        } else {
          updatedFields[key].error = null;
        }
      }
      return updatedFields;
    });
    return Object.values(errors).every((error) => error === null);
  };

  const handleChange = (name: string, value: string) => {
    setFields((prevFields) => ({
      ...prevFields,
      [name]: { ...prevFields[name], value },
    }));
  };

  return {
    fields,
    handleChange,
    validateFields,
  };
};

export default useFormValidation;