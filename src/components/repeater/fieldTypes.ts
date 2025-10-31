export type FieldType = 'text' | 'textarea' | 'checkbox' | 'number' | 'select';

export type Option = { value: string | number; label: string };

export type FieldConfig<T> = {
    key: keyof T;
    label: string;
    type: FieldType;
    required?: boolean;
    disabled?: (row: T) => boolean;
    normalizeIn?: (v: any) => any;
    normalizeOut?: (v: any) => any;
    options?: Option[];
    placeholder?: string;
    rows?: number;
};

export type TabDef<T> = {
    label: string;
    filter?: (row: T) => boolean;
};
