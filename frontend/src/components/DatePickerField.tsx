import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/ui/button";
import { Calendar } from "@/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";

type DatePickerMode = "date" | "month";

type DatePickerFieldProps = {
  mode: DatePickerMode;
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
  className?: string;
  invalid?: boolean;
  disabled?: boolean;
  placeholder?: string;
};

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function parseDateValue(value: string, mode: DatePickerMode): Date | undefined {
  if (mode === "date") {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) {
      return undefined;
    }
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    const parsed = new Date(year, month, day);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) {
    return undefined;
  }
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const parsed = new Date(year, month, 1);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function toIsoValue(date: Date, mode: DatePickerMode): string {
  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  if (mode === "month") {
    return `${year}-${month}`;
  }
  return `${year}-${month}-${pad2(date.getDate())}`;
}

function displayValue(date: Date | undefined, mode: DatePickerMode, placeholder: string): string {
  if (!date) {
    return placeholder;
  }
  if (mode === "month") {
    return new Intl.DateTimeFormat(undefined, { month: "short", year: "numeric" }).format(date);
  }
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "2-digit", year: "numeric" }).format(date);
}

export default function DatePickerField({
  mode,
  value,
  onChange,
  ariaLabel,
  className,
  invalid = false,
  disabled = false,
  placeholder
}: DatePickerFieldProps) {
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => parseDateValue(value, mode), [mode, value]);
  const label = displayValue(selected, mode, placeholder ?? (mode === "month" ? "Pick a month" : "Pick a date"));

  return (
    <div className={cn("w-full", className)}>
      <input
        className={cn("field-date-input w-full sr-only")}
        aria-label={ariaLabel}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            aria-label={ariaLabel}
            className={cn(
              "field-date-input w-full justify-start text-left font-normal",
              !selected && "text-muted-foreground",
              invalid && "border-destructive focus-visible:ring-destructive/40"
            )}
          >
            {label}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <Calendar
            mode="single"
            selected={selected}
            defaultMonth={selected}
            captionLayout="dropdown"
            onSelect={(next) => {
              if (!next) {
                return;
              }
              onChange(toIsoValue(next, mode));
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
