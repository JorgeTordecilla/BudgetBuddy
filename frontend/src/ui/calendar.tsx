import * as React from "react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";

import "react-day-picker/style.css";

function Calendar({ className, classNames, showOutsideDays = true, ...props }: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-1", className)}
      classNames={{
        month: "space-y-3",
        caption: "flex items-center justify-center pt-1",
        caption_label: "text-sm font-medium",
        nav: "flex items-center gap-1",
        nav_button:
          "inline-flex h-7 w-7 items-center justify-center rounded-md border border-border/70 text-xs text-foreground hover:bg-muted/70",
        table: "w-full border-collapse",
        head_row: "flex",
        head_cell: "w-9 text-[0.75rem] font-medium text-muted-foreground",
        row: "mt-1 flex w-full",
        cell: "relative h-9 w-9 text-center text-sm p-0",
        day: "h-9 w-9 rounded-md p-0 font-normal hover:bg-muted/70 aria-selected:opacity-100",
        day_selected: "bg-primary text-primary-foreground hover:bg-primary/90",
        day_today: "border border-primary/40",
        day_outside: "text-muted-foreground opacity-50",
        day_disabled: "text-muted-foreground opacity-40",
        ...classNames
      }}
      {...props}
    />
  );
}

export { Calendar };
