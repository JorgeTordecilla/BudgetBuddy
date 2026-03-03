import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";

export type SelectFieldOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type SelectFieldProps = {
  value: string;
  onChange: (value: string) => void;
  options: SelectFieldOption[];
  ariaLabel?: string;
  className?: string;
  invalid?: boolean;
  disabled?: boolean;
  placeholder?: string;
};

const EMPTY_SENTINEL = "__bb_empty__";

export default function SelectField({
  value,
  onChange,
  options,
  ariaLabel,
  className,
  invalid = false,
  disabled = false,
  placeholder
}: SelectFieldProps) {
  const disabledEmptyOption = options.find((option) => option.value === "" && option.disabled);
  const effectivePlaceholder = placeholder ?? disabledEmptyOption?.label ?? "Select";
  const hasSelectableEmptyOption = options.some((option) => option.value === "" && !option.disabled);
  const selectedValue = value === "" ? EMPTY_SENTINEL : value;

  return (
    <div className="w-full">
      <select
        className={cn("field-select w-full sr-only", className)}
        aria-label={ariaLabel}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        aria-invalid={invalid}
      >
        {options.map((option) => (
          <option key={`${option.value}-${option.label}`} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>

      <Select
        value={selectedValue}
        onValueChange={(nextValue) => onChange(nextValue === EMPTY_SENTINEL ? "" : nextValue)}
        disabled={disabled}
      >
        <SelectTrigger
          className={cn(
            "field-select w-full justify-between",
            className,
            invalid && "border-destructive focus-visible:ring-destructive/40"
          )}
          aria-invalid={invalid}
        >
          <SelectValue placeholder={effectivePlaceholder} />
        </SelectTrigger>
        <SelectContent align="start">
          {!hasSelectableEmptyOption ? (
            <SelectItem value={EMPTY_SENTINEL} disabled>
              {effectivePlaceholder}
            </SelectItem>
          ) : null}
          {options
            .filter((option) => !(option.value === "" && option.disabled))
            .map((option) => (
              <SelectItem
                key={`${option.value}-${option.label}`}
                value={option.value === "" ? EMPTY_SENTINEL : option.value}
                disabled={option.disabled}
              >
                {option.label}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
    </div>
  );
}
