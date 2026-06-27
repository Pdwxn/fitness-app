type TextFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
};

export function TextField({ label, value, onChange, placeholder, type = "text" }: TextFieldProps) {
  return (
    <label className="flex flex-col gap-2 text-sm font-bold text-white/65">
      {label}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="apex-input rounded-2xl px-4 py-3 text-white"
      />
    </label>
  );
}

type NumberFieldProps = {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  min?: number;
};

export function NumberField({ label, value, onChange, min = 0 }: NumberFieldProps) {
  return (
    <label className="flex flex-col gap-2 text-sm font-bold text-white/65">
      {label}
      <input
        type="number"
        min={min}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        className="apex-input rounded-2xl px-4 py-3 text-white"
      />
    </label>
  );
}

type SelectFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
};

export function SelectField({ label, value, onChange, options }: SelectFieldProps) {
  return (
    <label className="flex flex-col gap-2 text-sm font-bold text-white/65">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="apex-input rounded-2xl px-4 py-3 text-white"
      >
        <option value="">-</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option.replaceAll("_", " ")}
          </option>
        ))}
      </select>
    </label>
  );
}
