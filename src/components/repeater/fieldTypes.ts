export type FieldType = 'text' | 'number' | 'textarea' | 'checkbox' | 'select' | 'toggle' | 'date' | 'email';

export type Option = { value: string | number; label: string };

export type FieldConfig<T> = {
    key: keyof T | string;
    label?: string;
    type?: FieldType;
    required?: boolean;
    rows?: number;
    placeholder?: string;
    disabled?: (row: T) => boolean;
    options?: { value: string | number; label: string }[];
};

export type TabDef<T> = {
    label: string;
    filter?: (row: T) => boolean;
};
