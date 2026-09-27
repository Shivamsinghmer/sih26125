"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * The data table.
 *
 * Two changes from the stock primitive matter beyond sizing:
 *
 *   1. **Tabular numerals, everywhere.** Serial numbers, token ids, block
 *      numbers and dates all sit in columns here, and proportional digits make
 *      a column of numbers ragged — the "1" is narrower than the "8", so the
 *      column stops being scannable. This is the single cheapest thing a data
 *      table can do and browsers do not do it by default.
 *   2. **Header rules, not header fills.** Steep has no gray-banded table head;
 *      the hairline carries the separation, which keeps the table reading as
 *      paper rather than as a spreadsheet.
 */
function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div data-slot="table-container" className="relative w-full overflow-x-auto">
      <table
        data-slot="table"
        className={cn("tabular w-full caption-bottom border-collapse text-body", className)}
        {...props}
      />
    </div>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b [&_tr]:border-border", className)}
      {...props}
    />
  );
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  );
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn("border-t border-border font-[480] [&>tr]:last:border-b-0", className)}
      {...props}
    />
  );
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b border-border/60 transition-colors duration-150",
        "hover:bg-fog-white data-[state=selected]:bg-mist-gray",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Column headings are the one place a small caps-tracked label is right: it is
 * a heading for a column, not a kicker above a headline, and the tracking is
 * what keeps 13px legible.
 */
function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-11 px-3 text-left align-middle whitespace-nowrap",
        "text-[13px] font-[500] tracking-[0.04em] text-label uppercase",
        "first:pl-0 last:pr-0",
        className,
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn("px-3 py-4 align-middle first:pl-0 last:pr-0", className)}
      {...props}
    />
  );
}

function TableCaption({ className, ...props }: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-caption text-label", className)}
      {...props}
    />
  );
}

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
