import { useState } from 'react';

type Validator<T extends Record<string, any>> = (values: T) => Record<keyof T, string | null>;

/**
 * Simple form validation helper.
 * - initialValues: initial field values (strings or any)
 * - validate: function that returns an object mapping field -> error message|null
 *
 * Returns { fields, errors, handleChange, validateFields }
 */
export default function useFormValidation<T extends Record<string, any>>(
  initialValues: T,
  validate: Validator<T>
) {
  const [fields, setFields] = useState<T>({ ...(initialValues || ({} as T)) });
  const [errors, setErrors] = useState<Record<keyof T, string | null>>({} as Record<keyof T, string | null>);

  const handleChange = (name: keyof T | string, value: any) => {
    setFields((prev) => ({ ...(prev as T), [name]: value }) as T);
  };

  const validateFields = (): boolean => {
    const result = validate(fields);
    setErrors(result as Record<keyof T, string | null>);
    return Object.values(result).every((v) => v === null || v === undefined || v === '');
  };

  return { fields, errors, handleChange, validateFields };
}