export type FieldType = 'text' | 'number' | 'textarea' | 'checkbox' | 'select' | 'toggle' | 'date' | 'email';

// Field config used across Repeaters
export type FieldConfig<Row> = {
  key: keyof Row | string;
  label?: string;
  type?: FieldType;
  required?: boolean;
  rows?: number;
  placeholder?: string;
  disabled?: (row: Row) => boolean;
  options?: { value: string | number; label: string }[];
};

export type Option = { value: string | number; label: string };

export type TabDef<T> = {
    label: string;
    filter?: (row: T) => boolean;
};
